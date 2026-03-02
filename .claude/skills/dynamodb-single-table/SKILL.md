# DynamoDB Single Table Design スキル

## テーブル概要

- テーブル名: `TeamsTaskBot`
- 設計詳細: `docs/dynamodb-table-design.md` を参照
- PK/SK パターン: `PK=USER#<userId>`, `SK=TASK#<taskId>` or `REMINDER#<taskId>#<reminderId>`
- GSI: GSI1-TaskById, GSI2-TasksByStatus, GSI3-RemindersBySchedule

## DynamoDBDocumentClient の初期化パターン

`DYNAMODB_ENDPOINT` 環境変数でローカル/本番を自動切替する。
クライアントは Lambda ハンドラ外（モジュールスコープ）で初期化し、コールドスタートを最適化する。

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const dynamoDBClient = new DynamoDBClient({
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

export const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
```

## コマンドの使い方

すべてのコマンドで `ReturnConsumedCapacity: 'TOTAL'` を必ず指定する。

### PutCommand（保存）

```typescript
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME ?? 'TeamsTaskBot';

await docClient.send(
  new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${task.userId.value}`,
      SK: `TASK#${task.id.value}`,
      GSI1PK: `TASK#${task.id.value}`,
      GSI1SK: 'METADATA',
      GSI2PK: `USER#${task.userId.value}#${task.status.value}`,
      GSI2SK: task.createdAt.toISOString(),
      type: 'TASK',
      taskId: task.id.value,
      userId: task.userId.value,
      title: task.title,
      description: task.description,
      status: task.status.value,
      dueDate: task.dueDate?.value.toISOString(),
      conversationReference: {
        conversationId: task.conversationReference.conversationId,
        activityId: task.conversationReference.activityId,
        serviceUrl: task.conversationReference.serviceUrl,
        botId: task.conversationReference.botId,
      },
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
    ReturnConsumedCapacity: 'TOTAL',
  }),
);
```

### QueryCommand（一覧取得）

```typescript
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

// AP1: ユーザーのタスク一覧
const result = await docClient.send(
  new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId.value}`,
      ':skPrefix': 'TASK#',
    },
    ReturnConsumedCapacity: 'TOTAL',
  }),
);

// AP2: タスク ID で取得（GSI1）
const result = await docClient.send(
  new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1-TaskById',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `TASK#${taskId.value}`,
      ':sk': 'METADATA',
    },
    ReturnConsumedCapacity: 'TOTAL',
  }),
);
```

### GetCommand（単体取得）

```typescript
import { GetCommand } from '@aws-sdk/lib-dynamodb';

// PK + SK が既知の場合は GetCommand を使う（Query より効率的）
const result = await docClient.send(
  new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId.value}`,
      SK: `TASK#${taskId.value}`,
    },
    ReturnConsumedCapacity: 'TOTAL',
  }),
);
```

## 禁止事項

- **Scan 禁止**: 必ず Query または GetItem を使う。全件走査はコストとパフォーマンスの両面で問題
- **aws-sdk v2 禁止**: `import AWS from 'aws-sdk'` は使わない。必ず `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (v3)
- **ORM 禁止**: TypeORM, Dynamoose 等を使わない。DynamoDBDocumentClient を直接使う
- **BatchWrite は 25 件ずつ分割**: DynamoDB の制限に従う
- **ConditionalCheckFailedException は個別ハンドリング**: 楽観ロック等で使用する場合

## Domain Model ↔ DynamoDB Item のマッピング

マッパーは `src/adapters/driven/dynamodb/mappers/` に配置する。
Domain Model に `toJSON()` や `toDynamoItem()` を生やしてはいけない。

```typescript
// src/adapters/driven/dynamodb/mappers/task-item.mapper.ts

import { Task, type Reminder } from '../../../../domain/models/task.js';
import { ConversationReference } from '../../../../domain/value-objects/conversation-reference.js';
import { DueDate } from '../../../../domain/value-objects/due-date.js';
import { ReminderId } from '../../../../domain/value-objects/reminder-id.js';
import { TaskId } from '../../../../domain/value-objects/task-id.js';
import { TaskStatus } from '../../../../domain/value-objects/task-status.js';
import { UserId } from '../../../../domain/value-objects/user-id.js';

// DynamoDB Item の型定義
export interface TaskItem {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  type: 'TASK';
  taskId: string;
  userId: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  conversationReference: {
    conversationId: string;
    activityId: string;
    serviceUrl: string;
    botId: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Domain Model → DynamoDB Item
export function toTaskItem(task: Task): TaskItem {
  return {
    PK: `USER#${task.userId.value}`,
    SK: `TASK#${task.id.value}`,
    GSI1PK: `TASK#${task.id.value}`,
    GSI1SK: 'METADATA',
    GSI2PK: `USER#${task.userId.value}#${task.status.value}`,
    GSI2SK: task.createdAt.toISOString(),
    type: 'TASK',
    taskId: task.id.value,
    userId: task.userId.value,
    title: task.title,
    description: task.description,
    status: task.status.value,
    dueDate: task.dueDate?.value.toISOString(),
    conversationReference: {
      conversationId: task.conversationReference.conversationId,
      activityId: task.conversationReference.activityId,
      serviceUrl: task.conversationReference.serviceUrl,
      botId: task.conversationReference.botId,
    },
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

// DynamoDB Item → Domain Model
export function toTask(item: TaskItem, reminders: Reminder[] = []): Task {
  return Task.reconstruct({
    id: TaskId.fromString(item.taskId),
    userId: UserId.fromString(item.userId),
    title: item.title,
    description: item.description,
    status: TaskStatus.fromString(item.status),
    dueDate: item.dueDate ? DueDate.fromString(item.dueDate) : undefined,
    conversationReference: ConversationReference.create(item.conversationReference),
    reminders,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  });
}
```

## 結合テストパターン

結合テストは `test/integration/adapters/driven/dynamodb/` に配置する。
`vitest.config.integration.ts` を使い、DynamoDB Local (`http://localhost:8000`) に接続する。

```typescript
// test/integration/adapters/driven/dynamodb/task-repository.dynamodb.test.ts

import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import { docClient, dynamoDBClient } from './helpers/dynamodb-client.js';

const TABLE_NAME = 'TeamsTaskBot-test';

describe('DynamoDBTaskRepository', () => {
  beforeAll(async () => {
    // テスト用テーブルを作成
    await dynamoDBClient.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1-TaskById',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
  });

  afterAll(async () => {
    await dynamoDBClient.send(
      new DeleteTableCommand({ TableName: TABLE_NAME }),
    );
  });

  beforeEach(async () => {
    // テストデータのクリーンアップ（Query + BatchWrite で既存アイテムを削除）
  });

  it('タスクを保存して取得できる', async () => {
    // Arrange: Task.create() で Domain Model を作成
    // Act: repository.save(task) → repository.findById(task.id)
    // Assert: 取得したタスクが元と一致
  });
});
```

### テスト実行

```bash
# DynamoDB Local を起動
docker compose up -d dynamodb-local

# 結合テスト実行
npx vitest run --config vitest.config.integration.ts
```
