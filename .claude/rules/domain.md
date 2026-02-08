---
globs: ['src/domain/**/*.ts']
---

ここはヘキサゴナルアーキテクチャの中心。純粋なビジネスロジックのみ。

絶対に守ること:

- AWS SDK, Express, Agents SDK 等の外部ライブラリを import しない
- Node.js 組み込みモジュール（fs, path, http 等）を import しない
- domain/ 内のモジュールのみ import 可能
- Entity は ID による同一性比較。equals() メソッドを持つ
- Value Object は不変。プロパティは readonly
- エラーは DomainError を継承した専用クラスを投げる
- ドメインイベントは Entity の操作結果として生成する
- Repository の interface（Port）をここで定義し、実装は adapters/ に置く
