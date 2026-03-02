# Microsoft 365 Agents SDK パターン

## 使用パッケージ

- `@microsoft/agents-hosting-express` — Express アダプター（Activity の受信・レスポンス送信）
- `@microsoft/agents-hosting` — Bot ランタイム（AgentApplication, TurnContext, Activity 等）

## AgentApplication の基本構成

`src/adapters/driving/bot/` に配置する。

```typescript
// src/adapters/driving/bot/task-bot.ts

import { AgentApplication, type TurnContext } from '@microsoft/agents-hosting';

import { type CompleteTaskPort } from '../../../application/ports/complete-task.port.js';
import { type CreateTaskPort } from '../../../application/ports/create-task.port.js';
import { type ListTasksPort } from '../../../application/ports/list-tasks.port.js';
import { type ScheduleReminderPort } from '../../../application/ports/schedule-reminder.port.js';

import { parseCommand } from './command-parser.js';
import { toCreateTaskInput, toCompleteTaskInput, toListTasksInput, toScheduleReminderInput } from './mappers/activity-to-dto.mapper.js';
import { buildTaskCard, buildTaskListCard, buildErrorCard, buildWelcomeCard } from './adaptive-cards/index.js';

export function createTaskBot(deps: {
  createTask: CreateTaskPort;
  listTasks: ListTasksPort;
  completeTask: CompleteTaskPort;
  scheduleReminder: ScheduleReminderPort;
}): AgentApplication {
  const app = new AgentApplication();

  // メッセージ受信ハンドラ
  app.onMessage(async (context: TurnContext) => {
    const text = context.activity.text?.trim() ?? '';
    const command = parseCommand(text);

    switch (command.type) {
      case 'create': {
        const input = toCreateTaskInput(context, command);
        const result = await deps.createTask.execute(input);
        if (result.ok) {
          await context.sendActivity({
            attachments: [buildTaskCard(result.value)],
          });
        } else {
          await context.sendActivity({
            attachments: [buildErrorCard(result.error)],
          });
        }
        break;
      }
      case 'list': {
        const input = toListTasksInput(context, command);
        const result = await deps.listTasks.execute(input);
        if (result.ok) {
          await context.sendActivity({
            attachments: [buildTaskListCard(result.value)],
          });
        } else {
          await context.sendActivity({
            attachments: [buildErrorCard(result.error)],
          });
        }
        break;
      }
      case 'done': {
        const input = toCompleteTaskInput(context, command);
        const result = await deps.completeTask.execute(input);
        if (result.ok) {
          await context.sendActivity(`タスク "${result.value.title}" を完了しました`);
        } else {
          await context.sendActivity({
            attachments: [buildErrorCard(result.error)],
          });
        }
        break;
      }
      case 'remind': {
        const input = toScheduleReminderInput(context, command);
        const result = await deps.scheduleReminder.execute(input);
        if (result.ok) {
          await context.sendActivity(`リマインダーを設定しました: ${result.value.scheduledAt}`);
        } else {
          await context.sendActivity({
            attachments: [buildErrorCard(result.error)],
          });
        }
        break;
      }
      default:
        await context.sendActivity(
          '利用可能なコマンド:\n' +
          '- **create <タイトル>** — タスク作成\n' +
          '- **list** — タスク一覧\n' +
          '- **done <タスクID>** — タスク完了\n' +
          '- **remind <タスクID> <日時>** — リマインダー設定',
        );
    }
  });

  // 新メンバー追加時のウェルカムメッセージ
  app.onMembersAdded(async (context: TurnContext) => {
    const membersAdded = context.activity.membersAdded ?? [];
    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient?.id) {
        await context.sendActivity({
          attachments: [buildWelcomeCard()],
        });
      }
    }
  });

  return app;
}
```

## メッセージパース戦略

コマンドパーサーでテキストを構造化し、Use Case の DTO への変換はマッパーに委譲する。

```typescript
// src/adapters/driving/bot/command-parser.ts

export type Command =
  | { type: 'create'; title: string; description?: string; dueDate?: string }
  | { type: 'list'; statusFilter?: string }
  | { type: 'done'; taskId: string }
  | { type: 'remind'; taskId: string; scheduledAt: string }
  | { type: 'unknown'; text: string };

export function parseCommand(text: string): Command {
  // Bot Framework が <at>BotName</at> タグを付与するので除去
  const cleaned = text.replace(/<at>.*?<\/at>/g, '').trim();
  const parts = cleaned.split(/\s+/);
  const commandName = parts[0]?.toLowerCase();

  switch (commandName) {
    case 'create':
    case '作成': {
      const title = parts.slice(1).join(' ');
      return { type: 'create', title };
    }
    case 'list':
    case '一覧':
      return { type: 'list', statusFilter: parts[1] };
    case 'done':
    case '完了':
      return { type: 'done', taskId: parts[1] ?? '' };
    case 'remind':
    case 'リマインド':
      return { type: 'remind', taskId: parts[1] ?? '', scheduledAt: parts[2] ?? '' };
    default:
      return { type: 'unknown', text: cleaned };
  }
}
```

## Activity → DTO マッパー

Driving Adapter のマッパーで TurnContext から DTO に変換する。

```typescript
// src/adapters/driving/bot/mappers/activity-to-dto.mapper.ts

import { type TurnContext } from '@microsoft/agents-hosting';

import { type CreateTaskInput } from '../../../../application/dtos/create-task.dto.js';
import { type CompleteTaskInput } from '../../../../application/dtos/complete-task.dto.js';
import { type ListTasksInput } from '../../../../application/dtos/list-tasks.dto.js';
import { type ScheduleReminderInput } from '../../../../application/dtos/schedule-reminder.dto.js';

import { type Command } from '../command-parser.js';

function extractUserId(context: TurnContext): string {
  // Teams の場合、from.aadObjectId が AAD Object ID
  return (
    (context.activity.from as Record<string, unknown>)?.aadObjectId as string
    ?? context.activity.from?.id
    ?? ''
  );
}

function extractConversationReference(context: TurnContext) {
  return {
    conversationId: context.activity.conversation?.id ?? '',
    tenantId:
      (context.activity.conversation as Record<string, unknown>)?.tenantId as string ?? '',
    serviceUrl: context.activity.serviceUrl ?? '',
  };
}

export function toCreateTaskInput(
  context: TurnContext,
  command: Extract<Command, { type: 'create' }>,
): CreateTaskInput {
  return {
    userId: extractUserId(context),
    title: command.title,
    description: command.description,
    dueDate: command.dueDate,
    conversationReference: extractConversationReference(context),
  };
}

export function toCompleteTaskInput(
  context: TurnContext,
  command: Extract<Command, { type: 'done' }>,
): CompleteTaskInput {
  return {
    taskId: command.taskId,
    userId: extractUserId(context),
  };
}

export function toListTasksInput(
  context: TurnContext,
  command: Extract<Command, { type: 'list' }>,
): ListTasksInput {
  return {
    userId: extractUserId(context),
    statusFilter: command.statusFilter,
  };
}

export function toScheduleReminderInput(
  context: TurnContext,
  command: Extract<Command, { type: 'remind' }>,
): ScheduleReminderInput {
  return {
    taskId: command.taskId,
    userId: extractUserId(context),
    scheduledAt: command.scheduledAt,
  };
}
```

## Adaptive Card の返却パターン

Adaptive Card は JSON テンプレートを関数で組み立てる。`src/adapters/driving/bot/adaptive-cards/` に配置。

```typescript
// src/adapters/driving/bot/adaptive-cards/task-card.ts

import { type TaskResponse } from '../../../../application/dtos/task-response.dto.js';

export function buildTaskCard(task: TaskResponse) {
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: task.title,
          weight: 'Bolder',
          size: 'Medium',
        },
        ...(task.description
          ? [{ type: 'TextBlock', text: task.description, wrap: true }]
          : []),
        {
          type: 'FactSet',
          facts: [
            { title: 'ID', value: task.id.slice(0, 8) },
            { title: 'ステータス', value: task.status },
            ...(task.dueDate
              ? [{ title: '期日', value: task.dueDate }]
              : []),
            { title: '作成日', value: task.createdAt },
          ],
        },
      ],
    },
  };
}
```

## ConversationReference の保存と活用

### 保存（タスク作成時）

Teams Activity から `ConversationReference` を抽出し、タスクと一緒に DynamoDB へ保存する。
これにより、後からプロアクティブメッセージ（リマインダー通知）を送信できる。

```
Teams Activity → Driving Adapter (extractConversationReference)
  → CreateTaskInput.conversationReference (DTO)
    → Task.conversationReference (Domain: ConversationReference VO)
      → DynamoDB Item.conversationReference (Adapter: 非正規化して保存)
```

Domain の `ConversationReference` Value Object:

```typescript
// src/domain/value-objects/conversation-reference.ts
// 既存の実装: conversationId, serviceUrl, channelId を保持
ConversationReference.create({
  conversationId: 'conv-id-xxx',
  serviceUrl: 'https://smba.trafficmanager.net/jp/',
  channelId: 'msteams',
});
```

### 活用（プロアクティブメッセージ送信）

リマインダー送信時に、保存済みの ConversationReference を使って Teams にプロアクティブメッセージを送る。
実装は `src/adapters/driven/teams/` に配置する。

```typescript
// src/adapters/driven/teams/teams-notification-sender.ts（実装イメージ）

import {
  CloudAdapter,
  type ConversationReference as BotConversationReference,
} from '@microsoft/agents-hosting';

import { type NotificationSender } from '../../../domain/ports/driven/notification-sender.port.js';

export class TeamsNotificationSender implements NotificationSender {
  constructor(private readonly adapter: CloudAdapter) {}

  async sendReminder(task: {
    title: string;
    conversationReference: {
      conversationId: string;
      serviceUrl: string;
      channelId?: string;
    };
  }): Promise<void> {
    const ref: Partial<BotConversationReference> = {
      conversation: { id: task.conversationReference.conversationId },
      serviceUrl: task.conversationReference.serviceUrl,
      channelId: task.conversationReference.channelId,
    };

    await this.adapter.continueConversationAsync(
      ref,
      async (turnContext) => {
        await turnContext.sendActivity(
          `リマインダー: "${task.title}" の期限が近づいています`,
        );
      },
    );
  }
}
```

## Express への組み込み

```typescript
// src/adapters/driving/bot/bot-router.ts

import { AgentApplicationBuilder } from '@microsoft/agents-hosting-express';
import express from 'express';

import { type AgentApplication } from '@microsoft/agents-hosting';

export function createBotRouter(app: AgentApplication): express.Router {
  const router = express.Router();
  const agentApp = new AgentApplicationBuilder().withApp(app).build();

  router.post('/api/messages', async (req, res) => {
    await agentApp.processActivity(req, res);
  });

  return router;
}
```

## ローカルテスト方法

### Agents Playground（推奨）

M365 テナント不要で Bot の動作確認ができる。

```bash
# Express サーバーを起動
npm run dev

# 別ターミナルで Agents Playground を起動
npm run dev:playground
```

Playground は `http://localhost:3978/api/messages` に接続し、Teams クライアントの UI を模擬する。

### curl での直接テスト

HTTP エンドポイント（REST API）があれば curl でも確認可能。

```bash
# タスク作成（HTTP API 経由）
curl -X POST http://localhost:3978/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-user", "title": "テストタスク"}'
```

### テスト時の注意

- Bot Adapter のユニットテストでは `TurnContext` をモックする
- Agents SDK への依存があるため、domain / application 層のテストには Bot Adapter のテストを混ぜない
- Adaptive Card の出力は JSON スナップショットテストが有効
