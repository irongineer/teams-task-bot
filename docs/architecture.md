# Architecture

## システム概要

Teams Task Bot は Microsoft Teams 上で動作するタスク管理 Bot。ユーザーはチャットメッセージでタスクの作成・一覧・完了・リマインダー設定を行う。

```
┌───────────┐     ┌───────────────┐     ┌─────────────────────────────────────────┐
│  Teams    │     │ Azure Bot     │     │            AWS Lambda                   │
│  Client   │────▶│ Service       │────▶│  ┌─────────┐   ┌────────────────────┐  │
│           │     │               │     │  │ Express  │──▶│  Domain (UseCase)  │  │
└───────────┘     └───────────────┘     │  │ + Agents │   └────────┬───────────┘  │
                                        │  │   SDK    │            │              │
                                        │  └─────────┘   ┌────────▼───────────┐  │
                                        │                │  DynamoDB / Teams   │  │
                                        │                │  / EventBridge      │  │
                                        │                └────────────────────┘  │
                                        └─────────────────────────────────────────┘
```

### リクエストフロー

1. ユーザーが Teams クライアントでメッセージを送信
2. Azure Bot Service 経由で Lambda (Express) にルーティング
3. Agents SDK が Activity を解析し、対応するハンドラーを呼び出す
4. Driving Adapter がリクエストを DTO に変換し、Use Case を実行
5. Use Case がドメインモデルを操作し、Driven Port 経由で永続化・通知を行う
6. レスポンスが Teams クライアントに返される

## ヘキサゴナルアーキテクチャ

Ports & Adapters パターンを採用し、ドメインロジックを外部依存から完全に分離する。

```
                    ┌─────────────────────────────────────┐
                    │            handlers/                │
                    │        (Lambda entry point)         │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │          composition/                │
                    │          (DI container)              │
                    └──┬───────────────────────────────┬──┘
                       │                               │
        ┌──────────────▼──────────┐   ┌────────────────▼─────────────┐
        │   adapters/driving/     │   │      adapters/driven/        │
        │  (Bot, HTTP, EventBridge│   │  (DynamoDB, Teams通知,       │
        │   → DTO変換)            │   │   EventBridge発行)           │
        └──────────────┬──────────┘   └────────────────▲─────────────┘
                       │                               │
          Driving Port │              Driven Port      │
                       │                               │
        ┌──────────────▼───────────────────────────────┴──┐
        │                application/                      │
        │              (Use Cases)                         │
        └──────────────────────┬──────────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────────┐
        │                  domain/                         │
        │    (Models, Value Objects, Ports, Events,        │
        │     Errors, Services)                            │
        └─────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
src/
├── domain/                    # 純粋なビジネスロジック
│   ├── models/               # Entity / Aggregate Root
│   ├── value-objects/         # 不変の値オブジェクト
│   ├── ports/
│   │   ├── driving/          # 外部→ドメイン (Use Case interface)
│   │   └── driven/           # ドメイン→外部 (Repository interface 等)
│   ├── events/               # ドメインイベント
│   ├── errors/               # ドメインエラー
│   └── services/             # ドメインサービス
├── application/               # ユースケース層
│   ├── use-cases/            # Use Case 実装 (Driving Port を実装)
│   ├── dtos/                 # 入出力 DTO
│   └── shared/               # アプリケーション層共通ユーティリティ
├── adapters/
│   ├── driving/              # Driving Adapters (外部→ドメイン)
│   │   ├── bot/              # Agents SDK (Teams Bot)
│   │   │   ├── adaptive-cards/
│   │   │   └── mappers/
│   │   ├── http/             # Express (REST API)
│   │   │   ├── routes/
│   │   │   ├── middlewares/
│   │   │   └── mappers/
│   │   └── event-bridge/     # EventBridge (スケジュール起動)
│   └── driven/               # Driven Adapters (ドメイン→外部)
│       ├── dynamodb/         # DynamoDB (永続化)
│       │   └── mappers/
│       ├── teams/            # Teams (プロアクティブ通知)
│       └── event-bridge/     # EventBridge (イベント発行)
├── composition/               # DI コンテナ
├── handlers/                  # Lambda ハンドラ (薄いエントリーポイント)
└── shared/                    # レイヤー横断の共通ユーティリティ
```

## 依存ルール

ESLint `eslint-plugin-boundaries` により静的に強制される。

| From (依存元)     | To (依存先)                       | 説明                                            |
| ----------------- | --------------------------------- | ----------------------------------------------- |
| `domain`          | `domain` のみ                     | 外部ライブラリ・他レイヤーへの依存禁止          |
| `application`     | `domain`, `application`           | Driven Port (interface) 経由で外部と連携        |
| `adapter-driving` | `domain`, `application`, `shared` | DTO 変換・エラーハンドリング                    |
| `adapter-driven`  | `domain`, `shared`                | Port の実装。application への依存禁止           |
| `composition`     | 全レイヤー                        | DI コンテナ。全モジュールを組み立てる           |
| `handler`         | `composition`, `shared`           | Lambda エントリーポイント。composition から取得 |
| `shared`          | `shared` のみ                     | レイヤー横断ユーティリティ                      |

### domain の外部ライブラリ制限

domain レイヤーでは以下の外部ライブラリのインポートが禁止されている:

- `@aws-sdk/*`
- `@microsoft/*`
- `express`
- `@codegenie/*`

Node.js 組み込みモジュール（`fs`, `path`, `http` 等）のインポートも禁止。

## 技術選定

| レイヤー                  | 技術                      | 説明                                |
| ------------------------- | ------------------------- | ----------------------------------- |
| domain                    | 純粋 TypeScript           | 外部依存なし。strict mode           |
| application               | 純粋 TypeScript           | Result<T, E> パターン               |
| adapter-driving (Bot)     | Microsoft 365 Agents SDK  | `@microsoft/agents-hosting-express` |
| adapter-driving (HTTP)    | Express v5                | REST API エンドポイント             |
| adapter-driven (DB)       | AWS SDK v3                | `DynamoDBDocumentClient`            |
| adapter-driven (通知)     | Microsoft 365 Agents SDK  | プロアクティブメッセージ            |
| adapter-driven (イベント) | AWS SDK v3                | EventBridge PutEvents               |
| composition               | 手動 DI                   | コンストラクタインジェクション      |
| handlers                  | AWS Lambda                | `@codegenie/serverless-express`     |
| observability             | Powertools for AWS Lambda | Logger, Tracer, Metrics             |
| IaC                       | AWS CDK v2                | TypeScript, esbuild バンドル        |

## エラーハンドリング戦略

### レイヤーごとのエラー処理

```
domain/            DomainError を throw
       ↓
application/       DomainError を catch → Result<T, E> に変換
       ↓
adapters/driving/  Result を受け取り、HTTP ステータスコードや
                   Teams メッセージに変換
```

### DomainError 階層

```
DomainError (base)
├── TaskNotFoundError          # タスクが見つからない
├── TaskAlreadyCompletedError  # 完了済みタスクへの操作
├── InvalidDueDateError        # 過去の期日を設定
└── InvalidStatusTransitionError  # 不正なステータス遷移
```

### Result 型

Use Case は `Result<T, E>` 型で成功・失敗を返す。try-catch は adapters/ の境界のみで使用する。

## ドメインモデル

### Task (Aggregate Root)

タスク管理の中心となるエンティティ。

| プロパティ            | 型                      | 説明                      |
| --------------------- | ----------------------- | ------------------------- |
| id                    | `TaskId`                | UUIDv7 ベースの一意識別子 |
| userId                | `UserId`                | タスクの所有者            |
| title                 | `string`                | タスクのタイトル          |
| description           | `string \| undefined`   | 詳細説明（任意）          |
| status                | `TaskStatus`            | タスクの状態              |
| dueDate               | `DueDate \| undefined`  | 期日（任意）              |
| reminders             | `Reminder[]`            | リマインダー一覧          |
| conversationReference | `ConversationReference` | Teams 会話の参照情報      |
| createdAt             | `Date`                  | 作成日時                  |
| updatedAt             | `Date`                  | 更新日時                  |

### Reminder (Entity)

Task に紐づくリマインダー。

| プロパティ  | 型                  | 説明                               |
| ----------- | ------------------- | ---------------------------------- |
| id          | `ReminderId`        | 一意識別子                         |
| scheduledAt | `Date`              | 送信予定日時                       |
| sentAt      | `Date \| undefined` | 送信完了日時（未送信は undefined） |

### Value Objects

| Value Object            | 内容                                            | バリデーション     |
| ----------------------- | ----------------------------------------------- | ------------------ |
| `TaskId`                | UUIDv7。`shortId` プロパティで先頭 8 文字を返す | UUIDv7 形式        |
| `UserId`                | Teams ユーザーの AAD Object ID                  | 非空文字列         |
| `ReminderId`            | UUIDv7                                          | UUIDv7 形式        |
| `TaskStatus`            | `pending` → `in_progress` → `completed`         | 不可逆遷移のみ許可 |
| `DueDate`               | 期日                                            | 過去日付を拒否     |
| `ConversationReference` | Teams 会話の参照情報                            | Bot Framework 形式 |

### TaskStatus 遷移図

```
pending ──▶ in_progress ──▶ completed
   │                           ▲
   └───────────────────────────┘
```

- `completed` からの遷移は不可
- `in_progress` → `pending` への逆遷移は不可

### ドメインイベント

| イベント            | トリガー           | 用途                         |
| ------------------- | ------------------ | ---------------------------- |
| `TaskCreated`       | タスク作成時       | （将来の拡張用）             |
| `TaskCompleted`     | タスク完了時       | （将来の拡張用）             |
| `ReminderScheduled` | リマインダー登録時 | EventBridge スケジュール作成 |

### ドメインサービス

| サービス                | 責務                                   |
| ----------------------- | -------------------------------------- |
| `TaskReminderScheduler` | リマインダーのスケジューリングロジック |

## ユースケース

### 1. タスク作成 (create)

```
User ──"タスクを作成"──▶ Bot Adapter
                           │
                    DTO に変換 (CreateTaskInput)
                           │
                    CreateTaskUseCase.execute()
                           │
                    Task.create() (Domain Model)
                           │
                    TaskRepository.save()
                           │
                    Result<TaskOutput, Error>
                           │
                    Adaptive Card で応答
```

### 2. タスク一覧 (list)

```
User ──"タスク一覧"──▶ Bot Adapter
                          │
                   DTO に変換 (ListTasksInput)
                          │
                   ListTasksUseCase.execute()
                          │
                   TaskRepository.findByUserId()
                          │
                   Result<TaskListOutput, Error>
                          │
                   Adaptive Card で一覧表示
```

### 3. タスク完了 (done)

```
User ──"タスク完了 abc12345"──▶ Bot Adapter
                                   │
                            DTO に変換 (CompleteTaskInput)
                                   │
                            CompleteTaskUseCase.execute()
                                   │
                            TaskRepository.findById()
                                   │
                            task.complete() (Domain Model)
                                   │
                            TaskRepository.save()
                                   │
                            Result<TaskOutput, Error>
                                   │
                            完了メッセージで応答
```

### 4. リマインダー送信 (remind)

```
EventBridge (定期実行) ──▶ EventBridge Adapter
                              │
                       DTO に変換 (SendRemindersInput)
                              │
                       SendRemindersUseCase.execute()
                              │
                       ReminderRepository.findPending()
                              │
                       reminder.markAsSent() (Domain Model)
                              │
                       TeamsNotifier.send() / ReminderRepository.save()
                              │
                       Result<void, Error>
```
