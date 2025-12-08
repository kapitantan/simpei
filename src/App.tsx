import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CombinedBoard from './components/CombinedBoard'
import { getAdjacentPositions, getCell, listPositions } from './game/board'
import { applyMove, canPlayerMove, createInitialState } from './game/logic'
import type { GameMove, GameState, PlayerColor, Position, SandAssignment } from './game/types'
import { peerConnectionOptions } from './network/config'
import type { PeerMessage, PeerRole } from './network/messages'
import { usePeerConnection } from './network/usePeerConnection'

const colorLabel: Record<PlayerColor, string> = { red: '赤', blue: '青' }
const phaseLabel = { placing: '配置フェーズ', moving: '移動フェーズ' }

type SandPendingMove = {
  baseMove: Extract<GameMove, { type: 'place' | 'move' }>
  sandTargets: Position[]
  assignments: SandAssignment[]
}

const getConnectToParam = () => {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  return params.get('connect_to') ?? ''
}

const getInviteUrl = (peerId: string) => {
  if (typeof window === 'undefined') return peerId
  const url = new URL(window.location.href)
  url.searchParams.set('connect_to', peerId)
  return url.toString()
}

function App() {
  const connectParam = getConnectToParam()
  const initialRole: PeerRole = connectParam ? 'guest' : 'host'
  const [role] = useState<PeerRole>(initialRole)
  const isAuthority = role === 'host'
  const assignedColor: PlayerColor = role === 'host' ? 'red' : 'blue'
  const [localControlColor, setLocalControlColor] = useState<PlayerColor>('red')
  const [manualRemoteId, setManualRemoteId] = useState(connectParam)
  const [gameState, setGameState] = useState<GameState>(() => createInitialState('red'))
  const [selectedFrom, setSelectedFrom] = useState<Position | null>(null)
  const [pendingSandMove, setPendingSandMove] = useState<SandPendingMove | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [awaitingAuthority, setAwaitingAuthority] = useState(false)
  const [remoteRole, setRemoteRole] = useState<PeerRole | null>(null)
  const stateRef = useRef(gameState)
  const connectParamUsedRef = useRef(false)
  const sendMessageRef = useRef<(message: PeerMessage) => void>(() => undefined)

  useEffect(() => {
    stateRef.current = gameState
  }, [gameState])

  const updateState = useCallback((next: GameState) => {
    stateRef.current = next
    setGameState(next)
    setSelectedFrom(null)
    setPendingSandMove(null)
  }, [])

  const handlePeerMessage = useCallback(
    (message: PeerMessage) => {
      if (message.type === 'join') {
        setRemoteRole(message.role)
        if (isAuthority) {
          sendMessageRef.current({ type: 'start-game', state: stateRef.current })
        }
        return
      }
      if (message.type === 'start-game') {
        setAwaitingAuthority(false)
        updateState(message.state)
        return
      }
      if (message.type === 'state-update') {
        setAwaitingAuthority(false)
        updateState(message.state)
        return
      }
      if (message.type === 'error') {
        setAwaitingAuthority(false)
        setStatusMessage(`通信エラー: ${message.message}`)
        return
      }
      if (message.type === 'move-request' && isAuthority) {
        const result = applyMove(stateRef.current, message.move)
        if (result.success && result.state) {
          updateState(result.state)
          sendMessageRef.current({ type: 'state-update', state: result.state })
        } else {
          sendMessageRef.current({ type: 'error', message: result.message ?? '不正な手が送信されました' })
        }
      }
    },
    [isAuthority, updateState],
  )

  const { snapshot, connect, disconnect, sendMessage } = usePeerConnection({
    options: peerConnectionOptions,
    onMessage: handlePeerMessage,
  })

  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  useEffect(() => {
    if (snapshot.status === 'connected') {
      sendMessage({ type: 'join', role })
    }
  }, [role, sendMessage, snapshot.status])

  useEffect(() => {
    if (!connectParam || connectParamUsedRef.current) return
    if (snapshot.status === 'ready') {
      connectParamUsedRef.current = true
      connect(connectParam)
    }
  }, [connect, connectParam, snapshot.status])

  const controllingColor: PlayerColor = snapshot.status === 'connected' ? assignedColor : localControlColor
  const isMyTurn = !gameState.winner && gameState.activePlayer === controllingColor
  const canInteract = isMyTurn && !awaitingAuthority && snapshot.status !== 'connecting'
  const pendingSand = pendingSandMove !== null
  const passEnabled = gameState.phase === 'moving' && canInteract && !pendingSand
  const inviteUrl = snapshot.peerId ? getInviteUrl(snapshot.peerId) : ''
  const hasRemoteInput = manualRemoteId.trim().length > 0

  const highlightCells = useMemo(() => {
    if (pendingSandMove) {
      return (['upper', 'lower'] as const)
        .flatMap((layer) => listPositions(layer))
        .filter((pos) => getCell(gameState.board, pos) === 'empty')
    }

    if (!canInteract) {
      return []
    }

    if (gameState.phase === 'placing') {
      const upperCells = listPositions('upper').filter((pos) => getCell(gameState.board, pos) === 'empty')
      if (gameState.turnCount === 0) {
        return upperCells.filter((pos) => pos.x >= 1 && pos.x <= 2 && pos.y >= 1 && pos.y <= 2)
      }
      const lowerCells = listPositions('lower').filter((pos) => getCell(gameState.board, pos) === 'empty')
      return [...upperCells, ...lowerCells]
    }

    if (gameState.phase === 'moving') {
      if (!selectedFrom) {
        return (['upper', 'lower'] as const)
          .flatMap((layer) => listPositions(layer))
          .filter((pos) => getCell(gameState.board, pos) === controllingColor)
      }
      return getAdjacentPositions(selectedFrom).filter((pos) => getCell(gameState.board, pos) === 'empty')
    }

    return []
  }, [canInteract, controllingColor, gameState, pendingSandMove, selectedFrom])

  const tryMove = useCallback(
    (move: GameMove) => {
      const currentState = stateRef.current
      const result = applyMove(currentState, move)
      if (!result.success) {
        if (result.error === 'sand-required' && result.requiredSand) {
          const baseMove = move.type === 'pass' ? null : ({ ...move } as Extract<GameMove, { type: 'place' | 'move' }>)
          if (baseMove) {
            setPendingSandMove({ baseMove, sandTargets: result.requiredSand, assignments: [] })
            setStatusMessage('挟みが発生しました。飛ばす先を選んでください。')
          }
          return
        }
        setStatusMessage(result.message ?? '不正な手です')
        return
      }

      setPendingSandMove(null)
      setSelectedFrom(null)
      setStatusMessage(null)

      if (isAuthority) {
        if (result.state) {
          updateState(result.state)
          if (snapshot.status === 'connected') {
            sendMessage({ type: 'state-update', state: result.state })
          }
        }
      } else {
        setAwaitingAuthority(true)
        sendMessage({ type: 'move-request', move })
      }
    },
    [isAuthority, sendMessage, snapshot.status, updateState],
  )

  const handleCellClick = useCallback(
    (position: Position) => {
      if (pendingSandMove) {
        if (getCell(gameState.board, position) !== 'empty') {
          return
        }
        const updatedAssignments: SandAssignment[] = [
          ...pendingSandMove.assignments,
          { from: pendingSandMove.sandTargets[pendingSandMove.assignments.length], to: position },
        ]
        if (updatedAssignments.length === pendingSandMove.sandTargets.length) {
          const moveWithSand: GameMove = {
            ...pendingSandMove.baseMove,
            sandAssignments: updatedAssignments,
          }
          setPendingSandMove(null)
          tryMove(moveWithSand)
        } else {
          setPendingSandMove({ ...pendingSandMove, assignments: updatedAssignments })
        }
        return
      }

      if (!canInteract) return

      if (gameState.phase === 'placing') {
        tryMove({ type: 'place', to: position })
        return
      }

      if (gameState.phase === 'moving') {
        const cellOwner = getCell(gameState.board, position)
        if (!selectedFrom) {
          if (cellOwner === controllingColor) {
            setSelectedFrom(position)
          }
          return
        }
        if (position.layer === selectedFrom.layer) {
          setSelectedFrom(null)
          return
        }
        if (cellOwner === 'empty') {
          tryMove({ type: 'move', from: selectedFrom, to: position })
        }
      }
    },
    [canInteract, controllingColor, gameState.board, gameState.phase, pendingSandMove, selectedFrom, tryMove],
  )

  const handlePass = () => {
    tryMove({ type: 'pass' })
  }

  const handleReset = () => {
    const next = createInitialState('red')
    updateState(next)
    setPendingSandMove(null)
    setSelectedFrom(null)
    setAwaitingAuthority(false)
    setStatusMessage(null)
    if (isAuthority && snapshot.status === 'connected') {
      sendMessage({ type: 'state-update', state: next })
    }
  }

  const phaseDescription = gameState.winner
    ? gameState.winner === 'draw'
      ? '引き分け'
      : `${colorLabel[gameState.winner]}の勝ち！`
    : `${phaseLabel[gameState.phase]} / ${colorLabel[gameState.activePlayer]}の手番`

  const connectionStatusText = useMemo(() => {
    switch (snapshot.status) {
      case 'ready':
        return '対戦相手を待機中'
      case 'connected':
        return '接続完了'
      case 'connecting':
        return '接続処理中...'
      case 'error':
        return '通信エラーが発生しました'
      case 'initializing':
      default:
        return 'ホスト初期化中'
    }
  }, [snapshot.status])
  const displayedStatus = statusMessage ?? connectionStatusText

  const pendingInfo = pendingSandMove
    ? `挟み対象 ${pendingSandMove.sandTargets.length} 個 / 残り ${pendingSandMove.sandTargets.length - pendingSandMove.assignments.length}`
    : undefined

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">シンペイオンライン</h1>
            <p className="text-slate-400 text-sm">{phaseDescription}</p>
            {gameState.lastAction && <p className="text-slate-500 text-sm">{gameState.lastAction}</p>}
            {pendingInfo && <p className="text-amber-300 text-sm">{pendingInfo}</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:bg-slate-700 disabled:opacity-40"
              disabled={!isAuthority && snapshot.status === 'connected'}
            >
              ゲームリセット
            </button>
            <button
              type="button"
              onClick={handlePass}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 hover:bg-slate-700 disabled:opacity-40"
              disabled={!passEnabled}
            >
              パス
            </button>
          </div>
        </header>

        <section className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <div className="space-y-4">
            <CombinedBoard
              board={gameState.board}
              highlightCells={highlightCells}
              selectedCell={selectedFrom}
              onCellClick={handleCellClick}
              pendingSandTargets={pendingSandMove?.sandTargets ?? []}
              disabled={!canInteract && !pendingSand}
            />
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-sm text-slate-400">ステータス: {displayedStatus}</p>
              {snapshot.error && <p className="text-sm text-rose-300">{snapshot.error}</p>}
              {awaitingAuthority && <p className="text-sm text-amber-300">ホストの確定待ち...</p>}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="font-semibold">接続情報</p>
              <p className="text-sm">あなたの役割: {role === 'host' ? 'ホスト (赤)' : 'ゲスト (青)'}</p>
              <p className="text-sm">状態: {snapshot.status}</p>
              {snapshot.peerId && (
                <div className="text-sm">
                  <p className="text-slate-400">自分のPeer ID</p>
                  <p className="font-mono break-all">{snapshot.peerId}</p>
                </div>
              )}
              {inviteUrl && role === 'host' && (
                <div className="text-sm">
                  <p className="text-slate-400">招待URL</p>
                  <p className="font-mono break-all">{inviteUrl}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm text-slate-400" htmlFor="peer-id-input">
                  相手の Peer ID
                </label>
                <input
                  id="peer-id-input"
                  type="text"
                  value={manualRemoteId}
                  onChange={(event) => setManualRemoteId(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                  placeholder="peer-id"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => hasRemoteInput && connect(manualRemoteId.trim())}
                    className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-sm font-semibold disabled:opacity-40"
                    disabled={!hasRemoteInput}
                  >
                    接続
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 text-sm"
                  >
                    切断
                  </button>
                </div>
                {remoteRole && <p className="text-xs text-slate-400">相手の役割: {remoteRole === 'host' ? 'ホスト' : 'ゲスト'}</p>}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="font-semibold">ゲーム情報</p>
              <p className="text-sm">
                残り駒: 赤 {gameState.placementsRemaining.red} / 青 {gameState.placementsRemaining.blue}
              </p>
              <p className="text-sm">フェーズ: {phaseLabel[gameState.phase]}</p>
              <p className="text-sm">手数: {gameState.turnCount}</p>
              {gameState.phase === 'moving' && (
                <p className="text-sm">
                  {colorLabel[controllingColor]} の行動: {canPlayerMove(gameState, controllingColor) ? '移動可' : '移動不可'}
                </p>
              )}
              {snapshot.status !== 'connected' && role === 'host' && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">オフライン練習: 操作色</p>
                  <div className="flex gap-2">
                    {(['red', 'blue'] as PlayerColor[]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setLocalControlColor(color)}
                        className={`flex-1 rounded-lg py-1 text-sm border ${
                          localControlColor === color ? 'bg-slate-700 border-white' : 'bg-slate-800 border-slate-600'
                        }`}
                      >
                        {colorLabel[color]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}

export default App
