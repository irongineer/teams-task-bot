# DynamoDB Table Design

## テーブル定義

| 項目               | 値                |
| ------------------ | ----------------- |
| テーブル名         | `TeamsTaskBot`    |
| Partition Key (PK) | `PK` (S)          |
| Sort Key (SK)      | `SK` (S)          |
| Billing Mode       | `PAY_PER_REQUEST` |

## アイテムタイプ

### PK/SK 設計

| アイテム | PK              | SK                               |
| -------- | --------------- | -------------------------------- |
| Task     | `USER#<userId>` | `TASK#<taskId>`                  |
| Reminder | `USER#<userId>` | `REMINDER#<taskId>#<reminderId>` |

### 設計意図

- **Task の PK を `USER#<userId>`** にすることで、ユーザーのタスク一覧を 1 回の Query で取得可能
- **Reminder の SK に `taskId` を含める**ことで、特定タスクのリマインダーを SK prefix で絞り込み可能
- PK にユーザー ID を配置することで、ホットパーティションを回避（ユーザー単位に分散）

## GSI 定義

### GSI1: TaskById

タスク ID によるタスク単体取得とタスクのリマインダー一覧取得。

| 項目          | 値                                               |
| ------------- | ------------------------------------------------ |
| GSI 名        | `GSI1-TaskById`                                  |
| Partition Key | `GSI1PK` → `TASK#<taskId>`                       |
| Sort Key      | `GSI1SK` → `METADATA` or `REMINDER#<reminderId>` |
| Projection    | `ALL`                                            |

**用途:**

- `GSI1PK = TASK#<taskId>` で Query → タスク本体 (`METADATA`) + 全リマインダーを取得
- `GSI1PK = TASK#<taskId>`, `GSI1SK = METADATA` で単体取得

### GSI2: TasksByStatus

ステータス別タスク一覧。FilterExpression 不要で効率的にクエリ可能。

| 項目          | 値                                  |
| ------------- | ----------------------------------- |
| GSI 名        | `GSI2-TasksByStatus`                |
| Partition Key | `GSI2PK` → `USER#<userId>#<status>` |
| Sort Key      | `GSI2SK` → `<createdAt>` (ISO 8601) |
| Projection    | `ALL`                               |

**用途:**

- `GSI2PK = USER#<userId>#pending` で未完了タスク一覧
- `GSI2PK = USER#<userId>#completed` で完了タスク一覧
- SK が `createdAt` なので作成日時順でソート済み

**設計判断:**

status を PK に埋め込むことで FilterExpression が不要になり、無駄な RCU 消費を回避する。ステータスの種類は 3 つ（`pending`, `in_progress`, `completed`）と限定的なので、パーティション数の増加は許容範囲。

### GSI3: RemindersBySchedule

送信予定時刻が到来したリマインダーの取得。

| 項目          | 値                                    |
| ------------- | ------------------------------------- |
| GSI 名        | `GSI3-RemindersBySchedule`            |
| Partition Key | `GSI3PK` → `REMINDER#PENDING`         |
| Sort Key      | `GSI3SK` → `<scheduledAt>` (ISO 8601) |
| Projection    | `ALL`                                 |

**用途:**

- `GSI3PK = REMINDER#PENDING`, `GSI3SK <= <now>` で期限切れリマインダーを取得
- 送信完了後は `GSI3PK` を `REMINDER#SENT` に更新 → 自動的にクエリ対象から外れる

**設計判断:**

- 単一の PK (`REMINDER#PENDING`) にすべての未送信リマインダーが集中するが、チーム規模（数百〜数千件）では許容範囲
- 将来スケールが必要な場合は `REMINDER#PENDING#<shardId>` でシャーディング可能（shardId = scheduledAt の日付 or ハッシュ）

## shortId の解決方針

`TaskId` の先頭 8 文字（shortId）からフルの `TaskId` を解決する必要がある。

**方針:** 専用 GSI は作らず、ユーザーのタスク一覧（ベーステーブル: `PK = USER#<userId>`, `SK begins_with TASK#`）から取得し、アプリケーション側で shortId の prefix マッチを行う。

**理由:**

- 個人のタスク数は限定的（数十〜数百件）なので、全件取得のコストは低い
- shortId は同一ユーザー内でユニークであれば十分
- 専用 GSI を追加するコスト（書き込み・ストレージ）に見合わない

## ConversationReference の非正規化

Reminder アイテムにも `conversationReference` を保持する。

**理由:**

- リマインダー送信処理時に Task の追加 lookup が不要
- EventBridge → Lambda → リマインダー送信のフローで、Reminder アイテムだけで完結する
- conversationReference の変更頻度は低い（会話開始時に 1 度設定）

## アクセスパターン

| #   | パターン                     | オペレーション | テーブル/GSI | キー条件                                                    | Filter |
| --- | ---------------------------- | -------------- | ------------ | ----------------------------------------------------------- | ------ |
| AP1 | ユーザーのタスク一覧         | Query          | Base Table   | `PK = USER#<userId>`, `SK begins_with TASK#`                | なし   |
| AP2 | タスク ID で取得             | Query          | GSI1         | `GSI1PK = TASK#<taskId>`, `GSI1SK = METADATA`               | なし   |
| AP3 | タスクとリマインダー一括取得 | Query          | GSI1         | `GSI1PK = TASK#<taskId>`                                    | なし   |
| AP4 | ステータス別タスク一覧       | Query          | GSI2         | `GSI2PK = USER#<userId>#<status>`                           | なし   |
| AP5 | 期限切れリマインダー取得     | Query          | GSI3         | `GSI3PK = REMINDER#PENDING`, `GSI3SK <= <now>`              | なし   |
| AP6 | タスク保存                   | PutItem        | Base Table   | `PK = USER#<userId>`, `SK = TASK#<taskId>`                  | -      |
| AP7 | リマインダー保存             | PutItem        | Base Table   | `PK = USER#<userId>`, `SK = REMINDER#<taskId>#<reminderId>` | -      |

## アイテムサンプル

### Task アイテム

```json
{
  "PK": "USER#aad-object-id-12345",
  "SK": "TASK#0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "GSI1PK": "TASK#0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "GSI1SK": "METADATA",
  "GSI2PK": "USER#aad-object-id-12345#pending",
  "GSI2SK": "2026-02-08T10:30:00.000Z",
  "type": "TASK",
  "taskId": "0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "userId": "aad-object-id-12345",
  "title": "週次レポートを提出する",
  "description": "先週の進捗をまとめて提出",
  "status": "pending",
  "dueDate": "2026-02-14T00:00:00.000Z",
  "conversationReference": {
    "conversationId": "a]conv-id-xxx",
    "activityId": "activity-id-xxx",
    "serviceUrl": "https://smba.trafficmanager.net/jp/",
    "botId": "bot-id-xxx"
  },
  "createdAt": "2026-02-08T10:30:00.000Z",
  "updatedAt": "2026-02-08T10:30:00.000Z"
}
```

### Reminder アイテム（未送信）

```json
{
  "PK": "USER#aad-object-id-12345",
  "SK": "REMINDER#0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e#0192d4e5-8a9b-7c0d-1e2f-3a4b5c6d7e8f",
  "GSI1PK": "TASK#0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "GSI1SK": "REMINDER#0192d4e5-8a9b-7c0d-1e2f-3a4b5c6d7e8f",
  "GSI3PK": "REMINDER#PENDING",
  "GSI3SK": "2026-02-13T09:00:00.000Z",
  "type": "REMINDER",
  "reminderId": "0192d4e5-8a9b-7c0d-1e2f-3a4b5c6d7e8f",
  "taskId": "0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "userId": "aad-object-id-12345",
  "title": "週次レポートを提出する",
  "scheduledAt": "2026-02-13T09:00:00.000Z",
  "conversationReference": {
    "conversationId": "conv-id-xxx",
    "activityId": "activity-id-xxx",
    "serviceUrl": "https://smba.trafficmanager.net/jp/",
    "botId": "bot-id-xxx"
  }
}
```

### Reminder アイテム（送信済み）

```json
{
  "PK": "USER#aad-object-id-12345",
  "SK": "REMINDER#0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e#0192d4e5-8a9b-7c0d-1e2f-3a4b5c6d7e8f",
  "GSI1PK": "TASK#0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "GSI1SK": "REMINDER#0192d4e5-8a9b-7c0d-1e2f-3a4b5c6d7e8f",
  "GSI3PK": "REMINDER#SENT",
  "GSI3SK": "2026-02-13T09:00:00.000Z",
  "type": "REMINDER",
  "reminderId": "0192d4e5-8a9b-7c0d-1e2f-3a4b5c6d7e8f",
  "taskId": "0192d4e5-6f7a-7b8c-9d0e-1f2a3b4c5d6e",
  "userId": "aad-object-id-12345",
  "title": "週次レポートを提出する",
  "scheduledAt": "2026-02-13T09:00:00.000Z",
  "sentAt": "2026-02-13T09:00:05.123Z",
  "conversationReference": {
    "conversationId": "conv-id-xxx",
    "activityId": "activity-id-xxx",
    "serviceUrl": "https://smba.trafficmanager.net/jp/",
    "botId": "bot-id-xxx"
  }
}
```

## ホットパーティション考慮

### GSI3 (`REMINDER#PENDING`)

すべての未送信リマインダーが単一の PK に集中する。

**現状の判断:** チーム規模（数十〜数百ユーザー、リマインダー数千件以下）では DynamoDB の単一パーティションのスループット上限（3,000 RCU / 1,000 WCU）を超える見込みはなく、許容範囲。

**将来のシャーディング手法:**

1. **日付ベースシャーディング:** `REMINDER#PENDING#2026-02-13` のように日付を PK に含める。クエリ時は当日分のみ問い合わせる
2. **ハッシュベースシャーディング:** `REMINDER#PENDING#<0-9>` のように固定数のシャードに分散。クエリ時は全シャードに並列問い合わせる
