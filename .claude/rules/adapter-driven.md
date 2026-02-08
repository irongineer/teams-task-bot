---
globs: ['src/adapters/driven/**/*.ts']
---

Driven Adapters: ドメインが外部に依頼する側の実装。

守ること:

- domain/ports/driven/ の interface を implements する
- DynamoDB のアクセスには DynamoDBDocumentClient を使う
- Domain Model ↔ 外部データ形式の変換は mappers/ に集約
- Scan は使わない。必ず Query または GetItem
- BatchWrite は 25 件ずつに分割する
- ReturnConsumedCapacity: 'TOTAL' を常に指定する
- ConditionalCheckFailedException 等を個別にハンドリングする
- Powertools Tracer でインストルメントする
