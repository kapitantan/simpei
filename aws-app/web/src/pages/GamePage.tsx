import { useMemo, useRef, useState } from "react";
import {
  ACTION_TYPES,
  PLAYERS,
  POSITIONS,
  WORLDS,
  applyAction,
  createInitialGame,
  getForcedMoveTargets,
  getLegalMoveTargets,
  getLegalPlacementTargets,
  getMovablePieces,
  getPlayerLabel,
  isLegalAction,
  markDraw,
} from "../game/simpei.js";

const REPETITION_DRAW_COUNT = 3;
const MAX_MATCH_HISTORY_LENGTH = 180;

export default function GamePage() {
  const [game, setGame] = useState(createInitialGame);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [invalidTarget, setInvalidTarget] = useState(null);
  const historyLengthRef = useRef(0);
  const stateVisitCountsRef = useRef(new Map([[getStateKey(game), 1]]));

  const legalPlacementTargets = useMemo(
    () => new Set(getLegalPlacementTargets(game)),
    [game],
  );
  const forcedMoveTargets = useMemo(
    () => new Set(getForcedMoveTargets(game)),
    [game],
  );
  const movablePieces = useMemo(() => new Set(getMovablePieces(game)), [game]);
  const legalMoveTargets = useMemo(
    () => (selectedPiece ? new Set(getLegalMoveTargets(game, selectedPiece)) : new Set()),
    [game, selectedPiece],
  );
  const forcedPiece = game.pendingForcedMove?.pieces[0] ?? null;

  function commitAction(action) {
    if (!isLegalAction(game, action)) {
      showInvalidTarget(action?.to ?? action?.from ?? null);
      return;
    }

    historyLengthRef.current += 1;
    const nextGame = applyDrawRules(applyAction(game, action));
    setGame(nextGame);
    setInvalidTarget(null);

    if (nextGame.pendingForcedMove || nextGame.phase !== "movement" || isTerminal(nextGame)) {
      setSelectedPiece(null);
    }
  }

  function handlePointClick(positionId) {
    if (isTerminal(game)) {
      return;
    }

    if (game.pendingForcedMove) {
      commitAction({
        type: ACTION_TYPES.FORCE_MOVE,
        from: forcedPiece.from,
        to: positionId,
      });
      return;
    }

    if (game.phase === "placement") {
      commitAction({ type: ACTION_TYPES.PLACE, to: positionId });
      return;
    }

    if (game.board[positionId] === game.currentPlayer) {
      if (!movablePieces.has(positionId)) {
        setSelectedPiece(null);
        showInvalidTarget(positionId);
        return;
      }

      setSelectedPiece(positionId);
      setInvalidTarget(null);
      return;
    }

    if (selectedPiece) {
      commitAction({ type: ACTION_TYPES.MOVE, from: selectedPiece, to: positionId });
      return;
    }

    showInvalidTarget(positionId);
  }

  function showInvalidTarget(positionId) {
    setInvalidTarget(positionId);
    window.setTimeout(() => {
      setInvalidTarget((current) => (current === positionId ? null : current));
    }, 240);
  }

  function resetGame() {
    const initialGame = createInitialGame();
    historyLengthRef.current = 0;
    stateVisitCountsRef.current = new Map([[getStateKey(initialGame), 1]]);
    setGame(initialGame);
    setSelectedPiece(null);
    setInvalidTarget(null);
  }

  function applyDrawRules(nextGame) {
    if (isTerminal(nextGame)) {
      return nextGame;
    }

    if (historyLengthRef.current >= MAX_MATCH_HISTORY_LENGTH) {
      return markDraw(nextGame, "moveLimit");
    }

    const key = getStateKey(nextGame);
    const visits = stateVisitCountsRef.current;
    const count = (visits.get(key) ?? 0) + 1;
    visits.set(key, count);
    return count >= REPETITION_DRAW_COUNT ? markDraw(nextGame, "repetition") : nextGame;
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <div>
          <p className="eyebrow">Local match</p>
          <h1>シンペイ</h1>
          <p className="game-lead">
            1台の端末を交互に操作して遊ぶ、赤と青のローカル対戦です。
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={resetGame}>
          リセット
        </button>
      </header>

      <section className="game-status" aria-live="polite">
        <div className="status-line">
          <span className={`player-dot ${game.currentPlayer}`} />
          <strong>{getGameStatusLabel(game)}</strong>
          <span>{game.phase === "placement" ? "配置フェーズ" : "移動フェーズ"}</span>
          <span>{game.turnNumber}手目</span>
        </div>
        <p>{game.message}</p>
        {game.pendingForcedMove && (
          <p className="forced-message">
            {getPlayerLabel(game.pendingForcedMove.player)}が挟んだ
            {getPlayerLabel(forcedPiece.player)}の駒を、空いている場所へ移してください。
          </p>
        )}
      </section>

      <section className="game-layout" aria-label="シンペイ盤面">
        <Board
          game={game}
          selectedPiece={selectedPiece}
          invalidTarget={invalidTarget}
          legalPlacementTargets={legalPlacementTargets}
          legalMoveTargets={legalMoveTargets}
          forcedMoveTargets={forcedMoveTargets}
          forcedPieceId={forcedPiece?.from}
          movablePieces={movablePieces}
          onPointClick={handlePointClick}
        />
        <BoardLegend />
      </section>

      <section className="game-controls">
        <button
          className="secondary-button"
          type="button"
          onClick={() => commitAction({ type: ACTION_TYPES.PASS })}
          disabled={
            game.phase !== "movement"
            || isTerminal(game)
            || Boolean(game.pendingForcedMove)
            || movablePieces.size > 0
          }
        >
          パス
        </button>
        <div className="piece-counts">
          <strong>残り手駒</strong>
          <span>赤 {4 - game.placedCount[PLAYERS.RED]}個</span>
          <span>青 {4 - game.placedCount[PLAYERS.BLUE]}個</span>
        </div>
      </section>
    </main>
  );
}

function Board({
  game,
  selectedPiece,
  invalidTarget,
  legalPlacementTargets,
  legalMoveTargets,
  forcedMoveTargets,
  forcedPieceId,
  movablePieces,
  onPointClick,
}) {
  return (
    <section className="board-panel">
      <h2>ボード</h2>
      <div className="simpei-board">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={`h-${index}`}
            className="board-line horizontal"
            style={{ gridRow: index * 2 + 1, gridColumn: "1 / 8" }}
          />
        ))}
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={`v-${index}`}
            className="board-line vertical"
            style={{ gridRow: "1 / 8", gridColumn: index * 2 + 1 }}
          />
        ))}
        {POSITIONS.map(({ id, world, row, col }) => {
          const occupant = game.board[id];
          const isSelected = selectedPiece === id;
          const isLegalTarget = legalPlacementTargets.has(id)
            || legalMoveTargets.has(id)
            || forcedMoveTargets.has(id);
          const label = `${getWorldLabel(world)} ${row + 1}行 ${col + 1}列`;
          const gridPosition = getBoardGridPosition(world, row, col);

          return (
            <button
              key={id}
              type="button"
              className={[
                "board-point",
                world === WORLDS.UPPER ? "upper-point" : "lower-point",
                occupant ? `occupied ${occupant}` : "",
                isSelected ? "selected" : "",
                forcedPieceId === id ? "forced" : "",
                isLegalTarget ? "legal-target" : "",
                movablePieces.has(id) ? "movable" : "",
                invalidTarget === id ? "invalid" : "",
                game.winningLine?.includes(id) ? "winning" : "",
              ].filter(Boolean).join(" ")}
              style={{ gridRow: gridPosition.row, gridColumn: gridPosition.col }}
              onClick={() => onPointClick(id)}
              aria-label={occupant ? `${label}: ${getPlayerLabel(occupant)}の駒` : `${label}: 空き`}
            >
              <span className="point-hole" />
              {isLegalTarget && !occupant && <span className="target-marker" />}
              {occupant && (
                <span className="piece">
                  <span className="piece-head" />
                  <span className="piece-stem" />
                </span>
              )}
              {!occupant && <span className="point-label">{getPointLabel(world, row, col)}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BoardLegend() {
  return (
    <aside className="board-legend">
      <h2>遊び方</h2>
      <p>赤から交互に4個ずつ駒を置き、同じ世界で3個を一直線に並べると勝ちです。</p>
      <dl>
        <div>
          <dt>上の世界</dt>
          <dd>大きい16個の交点です。赤の初手は中央4点から選びます。</dd>
        </div>
        <div>
          <dt>下の世界</dt>
          <dd>マスの中央にある小さい9個の交点です。</dd>
        </div>
        <div>
          <dt>移動</dt>
          <dd>8個の駒を置いた後は、隣接する別の世界へ駒を動かします。</dd>
        </div>
        <div>
          <dt>はさみ</dt>
          <dd>相手の駒を挟むと、その駒を好きな空き場所へ移せます。</dd>
        </div>
      </dl>
    </aside>
  );
}

function getBoardGridPosition(world, row, col) {
  return world === WORLDS.UPPER
    ? { row: row * 2 + 1, col: col * 2 + 1 }
    : { row: row * 2 + 2, col: col * 2 + 2 };
}

function getPointLabel(world, row, col) {
  return `${world === WORLDS.UPPER ? "U" : "L"}${row + 1}${col + 1}`;
}

function getWorldLabel(world) {
  return world === WORLDS.UPPER ? "上の世界" : "下の世界";
}

function getGameStatusLabel(game) {
  if (game.winner) {
    return `${getPlayerLabel(game.winner)}の勝ち`;
  }
  if (game.drawReason) {
    return "引き分け";
  }
  return `${getPlayerLabel(game.currentPlayer)}の手番`;
}

function isTerminal(game) {
  return Boolean(game.winner || game.drawReason);
}

function getStateKey(game) {
  return JSON.stringify({
    board: game.board,
    currentPlayer: game.currentPlayer,
    phase: game.phase,
    pendingForcedMove: game.pendingForcedMove,
  });
}
