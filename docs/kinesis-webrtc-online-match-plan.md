# Kinesis WebRTC オンライン対戦・学習マッチング MVP

## Summary

- 現行の S3 + CloudFront SPAを維持し、ロビーとマッチング用に API Gateway + Lambda + DynamoDB を追加する。
- URLは Hash Router を採用する。`#` 以降はS3へ送信されないため、CloudFrontのSPA書き換えを追加せず、更新・戻る・URL直開きを成立させられる。
- ホーム上部にオンライン対戦のルーム作成・参加、下部にWebRTC学習用マッチング欄を配置する。
- 学習マッチングで2人が揃った時点で、両者を入力同期画面へ自動遷移させる。
- オンライン対戦はルーム作成者を KVS master兼状態の正本とし、参加者1人と観戦者最大9人を接続する。

## UIと画面遷移

### ルート

- `/#/`：ホーム
- `/#/local`：既存ローカル対戦
- `/#/rooms/:roomId`：オンライン対戦・観戦
- `/#/webrtc-lab/:matchId`：学習用入力同期

### ホーム画面

上から次の順番で表示する。

1. ローカル対戦への導線
2. オンライン対戦マッチング
   - ルーム名入力フォーム
   - 入力欄直下の「ルームを作成」ボタン
   - スクロール可能なルーム一覧
   - 各ルームの「対戦待ち／対戦中」表示
   - 選択したルームへ入る「ルーム参加」ボタン
3. WebRTC学習
   - DataChannelで文字列を同期することの説明
   - 「学習マッチングを開始」ボタン
   - 待機中の状態表示と「キャンセル」ボタン

### 学習マッチング

- ボタン押下後もホームに留まり、「相手を探しています」と表示する。
- 1人目を待機者、2人目を参加者として原子的にペアリングする。
- 2人目は即座に成立を受け取り、1人目は1秒間隔のポーリングで成立を検知する。
- 成立した時点で両者を `/#/webrtc-lab/:matchId` へ遷移させる。
- 待機は5分で自動終了する。手動キャンセル、ブラウザ終了、重複参加も処理する。
- 同じブラウザセッション同士ではマッチングさせない。

### 入力同期画面

- 「自分の入力」：編集可能なテキストエリア
- 「相手の入力」：読み取り専用のテキストエリア
- どちらの利用者も入力でき、相手側へ双方向にリアルタイム反映する。
- 最大1,000文字、50ms単位で更新をまとめ、連番により古い更新を無視する。
- signaling、ICE、DataChannelの状態、candidate種別、送受信時刻と連番を表示する。
- 相手の切断が10秒続いた場合は終了表示とホームへ戻るボタンを出す。

## Backend・AWS構成

- DynamoDBで対戦ルーム、学習待機チケット、成立済み学習セッションを管理する。
- 1対戦ルームまたは1学習マッチにつき、1つの Kinesis Video Streams signaling channel を作成する。
- LambdaだけにKVS channel作成・削除・endpoint取得・署名権限を与える。
- ブラウザには AWS credentials を渡さず、役割とclientIdに限定した署名済みWSS URLとSTUN/TURN設定だけを返す。
- CloudFrontの `/api/*` をAPI Gatewayへ転送し、キャッシュを無効化する。
- 定期cleanupで、期限切れ待機、終了済みセッション、放置KVS channelを削除する。
- active対戦ルームは最大20。作成・マッチングAPIには低いスロットリングを設定する。

## API Interfaces

| API | 動作 |
|---|---|
| `GET /api/rooms` | 参加・観戦可能なルーム一覧を返す |
| `POST /api/rooms` | 対戦ルームとKVS channelを作成する |
| `POST /api/rooms/:id/join` | participantまたはspectatorを割り当てる |
| `POST /api/rooms/:id/started` | 接続成立後に対戦中へ変更する |
| `POST /api/rooms/:id/heartbeat` | hostとviewerの接続状態を更新する |
| `POST /api/rooms/:id/close` | 勝敗、切断、期限切れでルームを閉じる |
| `POST /api/lab-matchmaking/tickets` | 学習用の待機チケットを作成し、可能なら即時マッチングする |
| `GET /api/lab-matchmaking/tickets/:ticketId` | `waiting/matched/expired` と接続情報を返す |
| `DELETE /api/lab-matchmaking/tickets/:ticketId` | 学習用の待機をキャンセルする |
| `POST /api/lab-matches/:matchId/close` | 学習セッションを終了する |

WebRTC接続情報は `channelArn`, `region`, `role`, `clientId`, `wssEndpoint`, `signedWssUrl`, `iceServers`, `expiresAt` を返す。

## 対戦同期

- ルーム作成者を master／赤、最初の参加者を viewer／青とする。
- masterがゲーム状態の正本となり、viewerは操作要求だけを送る。
- DataChannelは reliable／ordered、ラベルは `simpei-v1`、JSONには `protocolVersion: 1` を付ける。
- masterは送信元の役割、駒色、手番、revision、合法手を検証する。
- 確定後、単調増加するrevisionと完全なゲームsnapshotを全参加者・観戦者へ配信する。
- 観戦者からの操作、古いrevision、重複requestId、不正メッセージは拒否する。
- 待機ルームは10分、対戦セッションは55分で終了する。
- hostまたは対戦参加者の切断が10秒続いた場合は対戦終了。観戦者の切断は対戦へ影響させない。

## Test Plan

- Hash URLの直開き、更新、戻る操作で正しい画面を復元できること。
- 学習用ボタンを2ブラウザで押すと、1人目が待機し、2人目の参加後に両者が入力同期画面へ遷移すること。
- 待機キャンセル、5分失効、同一ブラウザの自己マッチング防止、同時参加競合をテストする。
- 両方向の入力、連続入力、最大文字数、古い連番、10秒切断をテストする。
- 対戦では合法手同期、不正手拒否、観戦者の読み取り専用、同時参加時の自動観戦、最大9人観戦を確認する。
- DynamoDBの条件付き更新、cleanupの冪等性、KVS作成失敗時のロールバックを単体テストする。
- CDK assertionsでAPI、DynamoDB、cleanup schedule、最小IAM権限、CloudFront `/api/*` 非キャッシュを検証する。
- lint、既存ゲームテスト、Vite build、CDK synthを実行する。
- AWSへのデプロイと実接続試験は、別途明示的な承認があるまで実施しない。

## Assumptions

- 初期版は最新PC版Chrome／Edgeと限定テスターを対象とする。
- 映像・音声・Kinesis media storage・Cognitoログインは使用しない。
- URLに `#` が含まれることを、CloudFront書き換えを増やさないための初期版のトレードオフとして受け入れる。
- 一般公開、10人超の観戦、ホスト移譲、対局復帰が必要になった場合は構成を再検討する。
