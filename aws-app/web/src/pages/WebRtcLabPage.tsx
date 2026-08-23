import { Link, Navigate, useParams } from "react-router-dom";

export default function WebRtcLabPage() {
  const { matchId } = useParams<{ matchId: string }>();

  if (!matchId) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <div>
          <p className="eyebrow">WebRTC lab</p>
          <h1>WebRTC学習</h1>
          <p className="game-lead">
            マッチID: <strong>{matchId}</strong>
          </p>
        </div>
        <Link className="secondary-button" to="/">
          ホームへ戻る
        </Link>
      </header>

      <section className="game-status" aria-live="polite">
        <h2>接続準備中</h2>
        <p>DataChannelを使ったブラウザ間通信の実装を準備しています。</p>
      </section>
    </main>
  );
}
