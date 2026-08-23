import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="game-page">
      <header className="game-header">
        <div>
          <p className="eyebrow">Simpei</p>
          <h1>シンペイ</h1>
          <p className="game-lead">
            ローカル対戦で遊ぶか、オンライン対戦とWebRTC学習機能の準備状況を確認できます。
          </p>
        </div>
      </header>

      <section className="game-status" aria-labelledby="local-match-heading">
        <h2 id="local-match-heading">ローカル対戦</h2>
        <p>1台の端末を交互に操作して、赤と青に分かれて対戦します。</p>
        <Link className="secondary-button" to="/local">
          ローカル対戦を始める
        </Link>
      </section>

      <section className="game-status" aria-labelledby="online-match-heading">
        <h2 id="online-match-heading">オンライン対戦</h2>
        <p>ルームの作成・参加・観戦機能を準備しています。</p>
      </section>

      <section className="game-status" aria-labelledby="webrtc-lab-heading">
        <h2 id="webrtc-lab-heading">WebRTC学習</h2>
        <p>DataChannelを使って、2つのブラウザ間で文字列を同期する機能を準備しています。</p>
      </section>
    </main>
  );
}
