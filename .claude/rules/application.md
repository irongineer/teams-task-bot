---
globs: ['src/application/**/*.ts']
---

ユースケース層。ドメインオブジェクトを使ってビジネスフローをオーケストレーションする。

守ること:

- Use Case は 1 つのパブリックメソッド execute() を持つ
- 入力は DTO で受け取り、出力は Result<DTO, Error> で返す
- Driven Ports（interface）をコンストラクタで受け取る（DI）
- ドメインロジックを Use Case に書かない（Domain Model に委譲する）
- adapters/ のモジュールを直接 import しない
- トランザクション的な整合性が必要な場合はここで調整する
