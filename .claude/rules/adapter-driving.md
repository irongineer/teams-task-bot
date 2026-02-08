---
globs: ['src/adapters/driving/**/*.ts']
---

Driving Adapters: 外部からドメインを呼び出す側。

守ること:

- Teams Activity, HTTP Request, EventBridge Event を Use Case の DTO に変換する
- 変換ロジックは mappers/ に集約する
- エラーハンドリングはここで行い、適切なレスポンス形式に変換する
- Use Case への依存は Driving Port（interface）経由にする
- Express の Router 定義はここに置く
- Agents SDK の AgentApplication もここ
