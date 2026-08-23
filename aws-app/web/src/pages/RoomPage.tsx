import { Link, Navigate, useParams } from "react-router-dom";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <div>
          <p className="eyebrow">Online match</p>
          <h1>対戦ルーム</h1>
          <p className="game-lead">
            ルームID: <strong>{roomId}</strong>
          </p>
        </div>
        <Link className="secondary-button" to="/">
          ホームへ戻る
        </Link>
      </header>

      <section className="game-status" aria-live="polite">
        <h2>接続準備中</h2>
        <p>オンライン対戦と観戦に必要な接続処理を準備しています。</p>
      </section>
    </main>
  );
}
