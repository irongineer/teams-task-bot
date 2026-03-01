新しいユースケースを追加して。名前: $ARGUMENTS

以下を全て作成すること:

1. src/application/dtos/ に入力 DTO（type alias）
2. src/application/ports/ に Driving Port（interface）
   - execute() メソッドを1つ持つ
   - 入力は application/dtos/ の型、出力は Result<DTO, DomainError>
3. src/application/use-cases/ に Use Case（class）
   - Driving Port を implements
   - Driven Ports をコンストラクタインジェクション
4. test/unit/application/use-cases/ に単体テスト
   - 正常系 1 つ以上、異常系 2 つ以上
   - Driven Ports は vi.fn() でモック
5. 必要なら src/domain/ports/driven/ に Driven Port を追加
6. task-response.dto.ts に必要なフィールドがあれば追加

依存はコンストラクタインジェクション。Result 型でエラーハンドリング。
テストは TDD で先に書く。

全テスト通過を確認してからファイル一覧を報告して。
