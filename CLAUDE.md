# Teams Task Bot

## プロジェクト概要

Microsoft Teams連携のタスク管理Bot。DDD + ヘキサゴナルアーキテクチャ。AWSサーバーレス構成。

## アーキテクチャ

DDD + ヘキサゴナルアーキテクチャ（Ports & Adapters）を採用。
詳細は docs/architecture.md を参照。

### レイヤー構造と依存ルール

- **domain/**: 純粋なビジネスロジック。外部ライブラリへの依存禁止。Ports（interface）をここで定義。
- **application/**: ユースケース。Driving Ports を実装し、Driven Ports を使う。
- **adapters/driving/**: 外部からドメインを呼び出すアダプター（Bot, HTTP, EventBridge）。
- **adapters/driven/**: ドメインが外部に依頼するアダプター（DynamoDB, Teams通知, EventBridge発行）。
- **composition/**: DI コンテナ。アダプターをポートに結びつける。
- **handlers/**: Lambda エントリーポイント。極力薄くし、composition から組み立てたアプリケーションを呼ぶだけ。

依存の方向は常に「外側 → 内側」。domain/ は何にも依存してはいけない。

## 技術スタック

- Runtime: Node.js 24, TypeScript strict mode
- Version Manager: mise (.mise.toml でバージョン管理)
- Package Manager: npm
- Web: Express v5 + @codegenie/serverless-express
- Bot: Microsoft 365 Agents SDK (@microsoft/agents-hosting-express, @microsoft/agents-hosting)
- DB: DynamoDB (AWS SDK v3 DynamoDBDocumentClient)。ORM は使わない。Single Table Design。
- Test: Vitest + DynamoDB Local (Docker Compose)
- Lint: ESLint (flat config) + Prettier
- Bundle: esbuild (CDK NodejsFunction 経由)
- Observability: Powertools for AWS Lambda (Logger, Tracer, Metrics)
- IaC: AWS CDK v2 (TypeScript)
- AWS SDK: v3 のみ

## コマンド（mise tasks）

- `mise run test` または `mise t` — 単体テスト
- `mise run test:integration` または `mise ti` — 結合テスト（DynamoDB Local）
- `mise run lint` または `mise l` — Lint チェック
- `mise run lint:fix` — Lint 自動修正
- `mise run build` または `mise b` — ビルド
- `mise run deploy` または `mise d` — CDK デプロイ
- `mise run synth` — CloudFormation テンプレート生成
- `mise run local` — ローカル開発起動（DynamoDB Local + Express サーバー）
- `mise run dev` または `mise s` — Express サーバーのみ起動（hot reload）
- `mise run dev:playground` — Agents Playground 起動（Teams 模擬、M365テナント不要）

## ローカル開発

- `npm run dev` — Express サーバーを hot reload で起動（scripts/local-server.ts）
- `npm run dev:playground` — Agents Playground を起動（Bot のテスト用、Teams クライアント不要）
- `docker compose up -d dynamodb-local` — DynamoDB Local のみ起動
- DynamoDB Local: http://localhost:8000（DYNAMODB_ENDPOINT 環境変数で自動切替）
- Express サーバー: http://localhost:3978
- Lambda ランタイムのエミュレーションは行わない（Express を直接起動する設計）

## テストの原則

- domain/ と application/ の単体テストは外部依存なし（Vitest + モック）
- adapters/ の結合テストは DynamoDB Local を使う（Docker Compose）
- Bot の動作確認は Agents Playground を使う（M365テナント不要）
- curl で HTTP エンドポイントを直接テスト可能
- 詳細は local-development-guide.md を参照

## コーディング規約

- Conventional Commits（feat/fix/chore/refactor/test/docs）
- テストは実装と同時に書く
- エラーは Result<T, E> 型で扱う。try-catch は adapters/ の境界のみ
- Powertools Logger を全 Lambda で使う。console.log は使わない
- AWS SDK v3 Client のインスタンスは handler 外で初期化（コールドスタート最適化）

## ヘキサゴナルアーキテクチャ規約

- domain/ に import できるのは domain/ 内のモジュールのみ
- domain/ に AWS SDK, Express, Agents SDK 等の外部ライブラリをインポートしてはいけない
- Driven Ports（interface）は domain/ports/driven/ に定義する
- Driving Ports（interface）は domain/ports/driving/ に定義する
- Port の実装（Adapter）は adapters/ に置く
- Use Case は Driving Port を実装し、Driven Port に依存する
- DI はコンストラクタインジェクションで行う
- Domain Model から DTO への変換は mappers/ に置く。Domain Model に toJSON() 等を生やさない

## DynamoDB 規約

- Single Table Design を採用
- PK/SK の命名規則: PK=`ENTITY#<id>`, SK=`METADATA` or `RELATION#<id>`
- Scan は原則禁止。Query または GetItem を使う
- テーブル設計は docs/dynamodb-table-design.md に記載
- DynamoDB のマッピング（Domain ↔ Item）は adapters/driven/dynamodb/mappers/ に集約

## やってはいけないこと

- aws-sdk v2 (import AWS from 'aws-sdk') を使ってはいけない
- console.log/console.error を直接使ってはいけない（Powertools Logger を使う）
- DynamoDB の Scan オペレーションを使ってはいけない（Query を使う）
- any 型を使ってはいけない
- Lambda ハンドラにビジネスロジックを書いてはいけない（handlers/ は薄く保つ）
- domain/ から外部ライブラリをインポートしてはいけない
- Domain Model に永続化やシリアライズのロジックを持たせてはいけない
- adapters/ 間で直接依存してはいけない（必ず domain のポートを経由する）
