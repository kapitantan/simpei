# AGENT: シンペイオンライン（WebRTC P2P 対戦ゲーム）

## プロジェクト概要

- ブラウザ上で遊べる 2 人対戦ボードゲーム「シンペイ」を実装する。
- オンライン対戦は **WebRTC (PeerJS)** による P2P 通信を用いて実現する。
- オセロの P2P 実装記事の構成（GitHub Pages + Render + PeerJS）をベースとする。
- サーバー側は「シグナリング（マッチング）」のみに使用し、ゲームロジックはすべてクライアント側で完結させる。

### コンポーネント構成

1. **フロントエンド（ゲームクライアント）**
   - 役割: 画面描画、ユーザー入力、ゲームロジック、P2P 通信処理
   - ホスティング: GitHub Pages（静的ホスティング）

2. **シグナリングサーバー**
   - 役割: WebRTC 接続確立のためのシグナリング / マッチングのみ
   - 実装: Node.js + PeerJS の `PeerServer`
   - ホスティング: Render 無料プラン

---

## 技術スタック

### 言語・フレームワーク

- 言語: **TypeScript**
- フレームワーク: **React**
- ビルドツール: **Vite**
- スタイル: **Tailwind CSS**
- パッケージマネージャ: npm or pnpm（特に指定がなければ npm）

### 通信 / ネットワーク

- P2P 通信: **WebRTC DataChannel**
- 抽象化ライブラリ: **PeerJS**
- シグナリングサーバー:
  - ライブラリ: `peer` パッケージの `PeerServer`
  - プラットフォーム: Render（Node.js アプリとしてデプロイ）

### ホスティング・デプロイ

- フロントエンド: GitHub Pages
  - GitHub Actions による CI/CD を前提にしても良い。
- シグナリングサーバー: Render
  - 無料プランを想定（スリープ・コールドスタートは許容）

---

## ゲーム仕様参照

- ゲームルール詳細は `rules.md` を参照すること。
  - 勝利条件（同一レイヤーでの 3 連）
  - 配置フェーズ / 移動フェーズ
  - 挟み（サンド）による「飛ばし」処理
- 実装時、仕様に迷った場合も `rules.md` を真とする。

---

## アーキテクチャ方針

### 1. クライアント構成

- `src/game/`:
  - ゲームロジック（盤面表現、手の合法判定、勝敗判定、状態遷移など）
  - React に依存しない純粋な TypeScript モジュールとして実装する。
- `src/network/`:
  - PeerJS をラップした通信レイヤー
  - 接続確立・切断・再接続・メッセージ送受信の抽象化
- `src/components/`:
  - React コンポーネント（盤面 UI、接続 UI、ステータス表示など）

### 2. 状態管理

- 基本は React Hooks（`useState`, `useReducer`）で管理する。
- 必要に応じてカスタムフックでゲーム状態とネットワーク状態を分離する。
- 外部の状態管理ライブラリ（Redux など）は初期実装では使用しない。

### 3. ゲーム状態の扱い

- クライアント間で送るのは「入力イベント（手）」または「ゲーム状態」のどちらかだが、基本方針としては：
  - 可能であれば「**片方をオーソリティ（権威側）** とし、そのクライアントが状態を確定させて相手に同期する」形をとる。
  - ラグがシビアではないターン制ゲームなので、まずは実装がシンプルな「オーソリティ側で状態確定」方式を優先する。

---

## 通信仕様（概要）

※ 詳細な型やプロトコルは別途 `network-protocol.md` などに切り出してもよい。

### PeerJS の利用

- クライアント側:
  - `new Peer({ host: '<render-peer-server-host>', secure: true, path: '/' })`
  - `peer.on('open', id => { /* 自分の ID を表示 / URL に埋め込む */ })`
  - `peer.on('connection', conn => { /* 相手からの接続を受け付ける */ })`
- 妥当なイベントハンドリング:
  - `connection`, `open`, `close`, `error`, `data` などをハンドルする。

### マッチング / 接続フロー

- プレイヤー A:
  - ゲームページを開く → 自分の `peerId` を取得。
  - `?connect_to=<peerId>` を付けた招待 URL を生成（例: `https://.../index.html?connect_to=xxxx`）。
  - その URL を友達に送る。
- プレイヤー B:
  - 招待 URL にアクセスすると、クエリパラメータ `connect_to` から A の `peerId` を取得。
  - `peer.connect(peerId)` で A に接続し、P2P 通信を確立する。

### メッセージ設計（例）

- JSON 形式でやり取りする。
- 例（型イメージ）:

```ts
type Message =
  | { type: 'join'; role: 'host' | 'guest' }
  | { type: 'start-game'; initialState: GameState }
  | { type: 'move'; move: GameMove }              // マス座標やフェーズに応じた手
  | { type: 'sync-state'; state: GameState }      // 状態同期用
  | { type: 'chat'; text: string }
  | { type: 'error'; code: string; message: string };

