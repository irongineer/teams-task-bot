# ADR-001: ヘキサゴナルアーキテクチャの採用

## Status

Accepted

## Date

2026-02-08

## Context

Teams Task Bot は以下の特性を持つシステムである:

- **複数のエントリーポイント**: Teams Bot (Agents SDK)、HTTP API (Express)、EventBridge (スケジュール起動) の 3 つの経路からドメインロジックが呼び出される
- **複数の外部依存**: DynamoDB (永続化)、Teams (プロアクティブ通知)、EventBridge (イベント発行) に依存する
- **サーバーレス構成**: AWS Lambda 上で動作し、コールドスタートやステートレスの制約がある
- **テスタビリティ要件**: ドメインロジックを外部依存なしで単体テストできる必要がある
- **DDD 親和性**: タスク管理のビジネスルール（ステータス遷移、リマインダースケジューリング等）を明確にモデリングしたい

これらの要件を満たすアーキテクチャパターンを選定する必要がある。

## Decision

**ヘキサゴナルアーキテクチャ（Ports & Adapters）** を採用する。

### レイヤー定義

| レイヤー         | ディレクトリ            | 責務                                                                                       |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Domain           | `src/domain/`           | 純粋なビジネスロジック。Entity, Value Object, Domain Event, Domain Error, Port (interface) |
| Application      | `src/application/`      | ユースケースのオーケストレーション。DTO, Use Case                                          |
| Driving Adapters | `src/adapters/driving/` | 外部からドメインを呼び出す。Bot, HTTP, EventBridge                                         |
| Driven Adapters  | `src/adapters/driven/`  | ドメインが外部に依頼する。DynamoDB, Teams, EventBridge                                     |
| Composition      | `src/composition/`      | DI コンテナ。アダプターをポートに結びつける                                                |
| Handlers         | `src/handlers/`         | Lambda エントリーポイント。薄いラッパー                                                    |

### 依存方向

依存は常に「外側 → 内側」。Domain は何にも依存しない。

```
handlers → composition → adapters → application → domain
```

### 静的検証

`eslint-plugin-boundaries` により、レイヤー間の依存方向をコンパイル時（Lint 時）に強制する。Domain レイヤーからの外部ライブラリインポートも禁止する。

## Consequences

### Positive

- **テスタビリティ**: Domain と Application はモックのみで単体テスト可能。DynamoDB Local や Teams API へのアクセス不要
- **インフラ差し替え容易**: DynamoDB を別の DB に変更する場合、Driven Adapter のみ差し替えれば良い。Domain/Application への影響なし
- **複数エントリーポイントの共通ロジック**: Bot、HTTP、EventBridge のいずれから呼ばれても同じ Use Case を共有できる
- **明示的な境界**: Port (interface) により外部依存との境界が明確。暗黙的な結合を防ぐ
- **Lint 時の安全性**: eslint-plugin-boundaries により、依存方向の違反をコーディング時に即座に検出できる
- **DDD との親和性**: Domain レイヤーに純粋なビジネスロジックを集約でき、ドメインモデルの表現力が高い

### Negative

- **ファイル数・間接性の増加**: Port (interface) と Adapter (implementation) の対が必要なため、単純な CRUD でもファイル数が多くなる
- **マッピングオーバーヘッド**: レイヤー間のデータ変換（DTO ↔ Domain Model ↔ DynamoDB Item）が発生する。mapper の実装・保守コストがかかる
- **学習コスト**: ヘキサゴナルアーキテクチャに不慣れなメンバーにとって、依存の方向やレイヤーの責務の理解に時間がかかる
- **DI のボイラープレート**: フレームワークレスのコンストラクタインジェクションを採用するため、composition/ での組み立てコードが増える

## Alternatives Considered

### Clean Architecture

Uncle Bob の Clean Architecture。ヘキサゴナルアーキテクチャと本質的に同等だが、Entities → Use Cases → Interface Adapters → Frameworks & Drivers の 4 層構造。

**不採用理由:** Port/Adapter の用語の方がチーム内で直感的に理解しやすい。また、Driving/Driven の区別が明示的で、複数エントリーポイントの設計に適している。実質的にはほぼ同じ設計になるが、用語の明快さでヘキサゴナルを選択。

### レイヤードアーキテクチャ

Controller → Service → Repository の 3 層構造。

**不採用理由:** 依存の方向が上から下への一方向になり、Domain が Infrastructure に依存する形になる。Repository の interface を Domain に置くという Dependency Inversion を適用すれば改善できるが、それはもはやヘキサゴナルアーキテクチャに近い。また、複数エントリーポイント（Bot/HTTP/EventBridge）を統一的に扱う設計が自然にできない。

### フィーチャーベースアーキテクチャ

機能単位（task/, reminder/ 等）でディレクトリを分け、各機能が独立した構成を持つ。

**不採用理由:** 単純な CRUD には適しているが、タスクのステータス遷移やリマインダースケジューリングなど、機能横断的なドメインルールがある場合に破綻しやすい。また、共通の Port/Adapter を機能間で共有するための仕組みが別途必要になる。
