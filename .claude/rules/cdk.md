---
globs: ['infra/**/*.ts']
---

AWS CDK v2 のインフラ定義。

守ること:

- Lambda には NodejsFunction を使い、esbuild でバンドルする
- Lambda ランタイムは Runtime.NODEJS_24_X
- DynamoDB テーブルは billingMode: PAY_PER_REQUEST
- 環境ごとの設定は cdk.json の context で管理
- RemovalPolicy は dev: DESTROY, prod: RETAIN
- Lambda の環境変数で Powertools の設定を渡す (POWERTOOLS_SERVICE_NAME, LOG_LEVEL 等)
- IAM ポリシーは最小権限原則
- 共通 Construct は infra/lib/constructs/ に切り出す
