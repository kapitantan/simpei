import type { GameMove, GameState, PlayerColor } from '../game/types'

export type PeerRole = 'host' | 'guest'
export type ConnectionStatus = 'initializing' | 'ready' | 'connecting' | 'connected' | 'error'

export type PeerMessage =
  | { type: 'join'; role: PeerRole }
  | { type: 'start-game'; state: GameState }
  | { type: 'move-request'; move: GameMove }
  | { type: 'state-update'; state: GameState }
  | { type: 'error'; message: string }

export interface PeerConnectionOptions {
  host: string
  port?: number
  path?: string
  secure?: boolean
}

export interface PeerStateSnapshot {
  peerId?: string
  remotePeerId?: string
  status: ConnectionStatus
  error?: string
}

export interface MoveEnvelope {
  move: GameMove
  submittedBy: PlayerColor
}
