# シンペイオンライン (Simpei Online)

ブラウザ上で 2 人が対戦できるボードゲーム「シンペイ」のフロントエンドです。React + TypeScript + Vite をベースに、ゲームロジックはクライアント内の `src/game/` に集約し、PeerJS を使った WebRTC P2P 通信でターン情報を同期します。

## 主な機能

- ルール仕様 (`rule.md`) に沿った配置フェーズ / 移動フェーズと挟み（サンド）処理
- 片方（ホスト）がオーソリティとなり、相手の入力を検証して状態を配信
- PeerJS ベースの P2P 接続 UI（Peer ID / 招待 URL / 手動入力 / 切断）
- Tailwind CSS で整えた 4×4（上）・3×3（下）盤面 UI と操作誘導ハイライト
- オフライン練習モード（接続前はホストが操作色を切り替えて両陣営を確認可能）

## セットアップ

```bash
npm install
npm run dev
```

本番ビルドは `npm run build`、Lint は `npm run lint`、ビルド後のローカル確認は `npm run preview` です。

## PeerJS シグナリング設定

`src/network/config.ts` は Vite の環境変数から PeerJS の接続先を決定します。デフォルトでは `window.location.hostname` を参照するため、開発中はローカルで PeerServer を起動するか、Render 等にデプロイした PeerServer の情報を `.env` で指定してください。

利用可能な変数:

- `VITE_PEER_HOST`
- `VITE_PEER_PORT`
- `VITE_PEER_PATH` (デフォルト `/`)
- `VITE_PEER_SECURE` (`true` / `false`)

## ディレクトリ構成

- `src/game/` : 盤面生成・勝敗判定・挟み処理など純粋な TypeScript モジュール (`createInitialState`, `applyMove` など)
- `src/network/` : PeerJS 設定（`config.ts`）と接続フック（`usePeerConnection`）
- `src/components/` : 盤面表示コンポーネント
- `src/App.tsx` : ゲーム UI、本番ロジックと通信フロー

## 基本的な遊び方

1. ホスト（赤）は通常 URL でページを開き、表示された Peer ID か招待 URL をコピーして友達へ共有します。
2. ゲスト（青）は `?connect_to=<peer-id>` 付き URL か接続 UI に Peer ID を貼り付け、接続後に `join` が行われます。
3. ホストがゲーム状態を生成して配信し、以降はホストが手を確定させてゲストへ `state-update` を送信します。
4. 挟みが発生した場合は UI の指示通りに飛ばし先を選択します。
5. 移動フェーズで合法手が無い場合は `パス` を押すとカウントされ、両者連続パスで引き分けになります。
6. 手持ち駒は外周4×4（上の世界）にのみ配置され、移動フェーズでは「4×4 ↔ 3×3」の隣接マス間でのみ駒を動かします。

## 補足

- 盤は外周を含む 4×4 と中央 3×3 の連続したエリアで構成され、どちらにも駒を置けますが互いに異なる役割を持つ点に注意してください。
- ルールの詳細は `rule.md`、アーキテクチャ方針は `AGENTS.md` を参照してください。
- Tailwind は `@tailwind base/components/utilities` で読み込んでおり、必要に応じてユーティリティを追加できます。
- PeerJS との通信はシンプルな JSON メッセージ (`join`, `start-game`, `move-request`, `state-update`, `error`) でやり取りしています。必要に応じて `src/network/messages.ts` を拡張してください。
