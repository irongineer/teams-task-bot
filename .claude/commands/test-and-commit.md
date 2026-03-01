1. npx eslint src/ --max-warnings 0 を実行して問題があれば修正
2. npx prettier --check src/ を実行して問題があれば修正
3. npx vitest run を実行して全テスト通過を確認
4. 失敗テストがあれば修正してリトライ（最大3回）
5. 全て通ったら Conventional Commits でコミット
6. コミットメッセージは変更内容に基づいて提案し、私の確認を求める
