export type Layer = 'upper' | 'lower'
export type PlayerColor = 'red' | 'blue'
export type Phase = 'placing' | 'moving'
export type Winner = PlayerColor | 'draw' | null

export type CellState = PlayerColor | 'empty'

export interface Position {
  layer: Layer
  x: number
  y: number
}

export interface BoardLayer {
  width: number
  height: number
  cells: CellState[][]
}

export interface Board {
  upper: BoardLayer
  lower: BoardLayer
}

export type SandAssignment = {
  from: Position
  to: Position
}

export type GameMove =
  | { type: 'place'; to: Position; sandAssignments?: SandAssignment[] }
  | { type: 'move'; from: Position; to: Position; sandAssignments?: SandAssignment[] }
  | { type: 'pass' }

export interface GameState {
  board: Board
  phase: Phase
  activePlayer: PlayerColor
  winner: Winner
  placementsRemaining: Record<PlayerColor, number>
  turnCount: number
  consecutivePasses: number
  lastAction?: string
}

export interface MoveResult {
  success: boolean
  state?: GameState
  error?: 'illegal' | 'sand-required'
  message?: string
  requiredSand?: Position[]
}
