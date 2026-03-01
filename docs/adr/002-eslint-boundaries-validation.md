# ADR-002: ESLint Boundaries による依存方向の強制

## Status

Accepted

## Date

2026-03-01

## Context

ヘキサゴナルアーキテクチャ（ADR-001）を採用したことで、レイヤー間の依存方向ルールが定義されている。しかし、これらのルールはコードレビューや開発者の規律に頼るだけでは守り切れない。

- Domain 層から AWS SDK や Express 等の外部ライブラリを import してしまうリスク
- Application 層から Adapter を直接 import してしまい、Port を迂回するリスク
- Adapter 間（driven ↔ driving）で直接依存してしまうリスク

これらの違反を CI やエディタ上で自動検出し、アーキテクチャの劣化を防ぎたい。

## Decision

**eslint-plugin-boundaries** を使い、依存方向を静的に検証する。

### Element 定義

| type             | pattern                   |
| ---------------- | ------------------------- |
| `domain`         | `src/domain/**`           |
| `application`    | `src/application/**`      |
| `adapter-driving`| `src/adapters/driving/**` |
| `adapter-driven` | `src/adapters/driven/**`  |
| `composition`    | `src/composition/**`      |
| `handler`        | `src/handlers/**`         |
| `shared`         | `src/shared/**`           |

### element-types ルール（レイヤー間の依存制御）

| from             | allow                                                              |
| ---------------- | ------------------------------------------------------------------ |
| `domain`         | `domain` のみ                                                      |
| `application`    | `domain`, `application`                                            |
| `adapter-driving`| `domain`, `application`, `shared`                                  |
| `adapter-driven` | `domain`, `shared`                                                 |
| `composition`    | 全レイヤー（DI コンテナのため）                                     |
| `handler`        | `composition`, `shared`                                            |
| `shared`         | `shared` のみ                                                      |

### external ルール（外部ライブラリの制御）

Domain 層から以下のパッケージの import を禁止:

- `@aws-sdk/*`
- `@microsoft/*`
- `express`
- `@codegenie/*`

### 検証結果

実際にルール違反の import を追加して ESLint の検出を検証した。

| テストケース                         | 違反ルール               | 検出結果 |
| ------------------------------------ | ------------------------ | -------- |
| `domain/` → `@aws-sdk/client-dynamodb` | `boundaries/external`    | NG ✅    |
| `application/` → `adapters/driven/`  | `boundaries/element-types` | NG ✅  |
| `adapters/driven/` → `adapters/driving/` | `boundaries/element-types` | NG ✅ |

**補足:** `boundaries/element-types` は import 先のファイルパスを解決してエレメントタイプを判定するため、import 先のファイルが存在しない場合はルールがスキップされる。`boundaries/external` はパッケージ名の文字列マッチのため、モジュールが未インストールでも検出できる。Adapter 実装ファイルが揃った段階で `element-types` も完全に機能する。

## Consequences

### Positive

- **自動検出**: 依存方向の違反をコーディング時に即座に検出でき、PR レビュー前に修正できる
- **Claude Code との統合**: `.claude/settings.json` の Hooks により、Claude Code が自動で違反を検出・修正する
  - `Stop` Hook: タスク完了時に `eslint + vitest` を自動実行
  - `PreToolUse` Hook: `git commit` 前に `eslint + vitest` を自動実行
- **CI での強制**: `npx eslint src/ --max-warnings 0` で CI パイプラインにも組み込める
- **テストファイルの除外**: `boundaries/ignore` でテストファイルを除外し、テストでは自由に import できる

### Negative

- **eslint-plugin-boundaries への依存**: プラグインのメンテナンス状況に依存する
- **パターンマッチの制約**: ファイルが存在しない段階では `element-types` が検出できない
- **設定の複雑さ**: レイヤーが増えると `element-types` の許可ルールが combinatorial に増加する
