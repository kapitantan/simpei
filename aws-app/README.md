# シンペイAWS版

このディレクトリには、シンペイの静的WebアプリとAWSインフラを配置しています。

```text
aws-app/
├── web/    # React/Viteの静的Webアプリ
└── infra/  # S3 + CloudFrontを定義するAWS CDKアプリ
```

AWS CDKアプリは、最初のデプロイ段階として次のリソースを定義します。

- 非公開かつ暗号化されたAmazon S3バケット
- Origin Access Control（OAC）を使用するAmazon CloudFront Distribution
- HTTPからHTTPSへのリダイレクトと、AWS管理のセキュリティヘッダーポリシー
- `web/dist` のS3への配置とCloudFrontキャッシュの無効化

独自ドメイン、AWS WAF、アクセスログ、API、WebRTC関連リソース、継続的デプロイは今回の対象外です。

## ローカル検証

`aws-app` ディレクトリから実行する場合は、`web` と `infra` が別々のnpmプロジェクトであるため、`--prefix` で対象を指定します。

```bash
cd aws-app
npm ci --prefix web
npm run build --prefix web
npm ci --prefix infra
npm run lint --prefix infra
npm run synth --prefix infra -- --profile dev_kida
```

各npmプロジェクトへ移動して実行する場合は、`--prefix` を省略できます。

```bash
cd aws-app/web
npm ci
npm run build

cd ../infra
npm ci
npm run lint
npm run synth -- --profile dev_kida
```

`synth` はローカルにCloudFormationテンプレートを生成するだけで、AWSリソースは作成しません。

## AWSプロファイル

AWS CLIとAWS CDKの実行時は、`default` プロファイルを使用せず、必ず `dev_kida` プロファイルを明示します。

ログインセッションの有効期限が切れている場合は、再度ログインします。

```bash
aws login --profile dev_kida
```

AWSを操作する前に、対象がアカウント `886121092053` であることを確認します。

```bash
aws sts get-caller-identity --profile dev_kida
```

プロファイルを省略した次の形式では実行しません。

```bash
# 実行しない
aws sts get-caller-identity
npm run deploy
```

## 初回デプロイ

AWSアカウントとリージョンの組み合わせごとに、初回だけCDK Bootstrapを実行します。

```bash
cd aws-app/infra
npx cdk bootstrap aws://886121092053/ap-northeast-1 --profile dev_kida
```

デプロイ前に、生成されるCloudFormationテンプレートとAWS上の変更内容を確認します。

```bash
npm run synth -- --profile dev_kida
npm run diff -- --profile dev_kida
```

内容に問題がなければデプロイします。

```bash
npm run deploy -- --profile dev_kida
```

## deploy処理の流れ
```txt
npm run deploy
  ↓
cdk deploy
  ↓
cdk.jsonのappを確認
(CDK CLIが現在のディレクトリからcdk.jsonを探す)
  ↓
node bin/aws-app.js
  ↓
lib/~~stack.js
(StaticSiteStackを生成)
  ↓
CloudFormationテンプレートへ変換
  ↓
CloudFormationがAWSリソースを作成・更新
```