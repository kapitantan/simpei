import { BOARD_SIZES, cloneBoard, createBoard, getCell, hasEmptyCell, isUpperCentralCell, setCell } from './board'
import type { GameMove, GameState, MoveResult, PlayerColor, Position, SandAssignment } from './types'

export const MAX_PIECES_PER_PLAYER = 4

const createPlacements = (): Record<PlayerColor, number> => ({ red: MAX_PIECES_PER_PLAYER, blue: MAX_PIECES_PER_PLAYER })

export const createInitialState = (startingPlayer: PlayerColor = 'red'): GameState => ({
  board: createBoard(),
  phase: 'placing',
  activePlayer: startingPlayer,
  winner: null,
  placementsRemaining: createPlacements(),
  turnCount: 0,
  consecutivePasses: 0,
})

const collectTriplets = (layer: 'upper' | 'lower'): Position[][] => {
  const { width, height } = BOARD_SIZES[layer]
  const triplets: Position[][] = []
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ]

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      directions.forEach(({ dx, dy }) => {
        const endX = x + dx * 2
        const endY = y + dy * 2
        if (endX >= 0 && endX < width && endY >= 0 && endY < height) {
          triplets.push([
            { layer, x, y },
            { layer, x: x + dx, y: y + dy },
            { layer, x: endX, y: endY },
          ])
        }
      })
    }
  }
  return triplets
}

const hasThreeInline = (state: GameState, player: PlayerColor): boolean => {
  return (['upper', 'lower'] as const).some((layer) =>
    collectTriplets(layer).some((triplet) => triplet.every((pos) => getCell(state.board, pos) === player)),
  )
}

const detectSandwiches = (boardState: GameState['board'], layer: 'upper' | 'lower', player: PlayerColor): Position[] => {
  const occupied = new Map<string, Position>()
  collectTriplets(layer).forEach(([first, middle, last]) => {
    const firstCell = getCell(boardState, first)
    const middleCell = getCell(boardState, middle)
    const lastCell = getCell(boardState, last)
    if (firstCell === player && lastCell === player && middleCell !== 'empty' && middleCell !== player) {
      const key = `${middle.layer}-${middle.x}-${middle.y}`
      occupied.set(key, middle)
    }
  })
  return Array.from(occupied.values())
}

const ensureSandAssignments = (
  sandwiches: Position[],
  assignments: SandAssignment[] | undefined,
  board: GameState['board'],
): { ok: boolean; message?: string } => {
  if (sandwiches.length === 0) {
    return { ok: true }
  }
  if (!assignments || assignments.length !== sandwiches.length) {
    return { ok: false, message: 'sand-required' }
  }
  const assignedKeys = new Set<string>()
  const sandwichKeys = new Set(sandwiches.map((pos) => `${pos.layer}-${pos.x}-${pos.y}`))

  for (const assignment of assignments) {
    const fromKey = `${assignment.from.layer}-${assignment.from.x}-${assignment.from.y}`
    if (!sandwichKeys.has(fromKey)) {
      return { ok: false, message: 'Invalid sand assignment source' }
    }
    const toCell = getCell(board, assignment.to)
    if (toCell !== 'empty') {
      return { ok: false, message: 'Sand target must be an empty cell' }
    }
    const destKey = `${assignment.to.layer}-${assignment.to.x}-${assignment.to.y}`
    if (assignedKeys.has(destKey)) {
      return { ok: false, message: 'Sand target duplicated' }
    }
    assignedKeys.add(destKey)
  }
  return { ok: true }
}

const applySandAssignments = (board: GameState['board'], assignments: SandAssignment[]) => {
  assignments.forEach(({ from, to }) => {
    const piece = getCell(board, from)
    if (piece === 'empty') {
      return
    }
    setCell(board, from, 'empty')
    setCell(board, to, piece)
  })
}

export const canPlayerMove = (state: GameState, player: PlayerColor): boolean => {
  const upperHasPiece = state.board.upper.cells.some((row) => row.some((cell) => cell === player))
  const lowerHasPiece = state.board.lower.cells.some((row) => row.some((cell) => cell === player))
  const lowerHasSpace = hasEmptyCell(state.board, 'lower')
  const upperHasSpace = hasEmptyCell(state.board, 'upper')

  return (upperHasPiece && lowerHasSpace) || (lowerHasPiece && upperHasSpace)
}

export const describePosition = (pos: Position) =>
  `${pos.layer === 'upper' ? '上' : '下'}(${pos.x + 1},${pos.y + 1})`

export const applyMove = (state: GameState, move: GameMove): MoveResult => {
  if (state.winner) {
    return { success: false, error: 'illegal', message: 'ゲームは既に終了しています' }
  }

  const player = state.activePlayer
  const board = cloneBoard(state.board)
  const nextState: GameState = {
    ...state,
    board,
  }

  if (move.type === 'pass') {
    if (state.phase !== 'moving') {
      return { success: false, error: 'illegal', message: '配置フェーズではパスできません' }
    }
    if (canPlayerMove(state, player)) {
      return { success: false, error: 'illegal', message: '移動可能な駒が存在します' }
    }
    nextState.consecutivePasses += 1
    if (nextState.consecutivePasses >= 2) {
      nextState.winner = 'draw'
      nextState.lastAction = '両者パスにより引き分け'
    } else {
      nextState.lastAction = `${player === 'red' ? '赤' : '青'}がパス`
    }
  } else if (move.type === 'place') {
    if (state.phase !== 'placing') {
      return { success: false, error: 'illegal', message: '配置フェーズ以外で駒を置くことはできません' }
    }
    if (state.placementsRemaining[player] <= 0) {
      return { success: false, error: 'illegal', message: 'すべての駒を配置済みです' }
    }
    const cell = getCell(board, move.to)
    if (cell !== 'empty') {
      return { success: false, error: 'illegal', message: 'そのマスには置けません' }
    }
    if (state.turnCount === 0 && !isUpperCentralCell(move.to)) {
      return { success: false, error: 'illegal', message: '初手は上の中央4マスに置く必要があります' }
    }
    setCell(board, move.to, player)
    nextState.placementsRemaining = {
      ...state.placementsRemaining,
      [player]: state.placementsRemaining[player] - 1,
    }
    if (nextState.placementsRemaining.red === 0 && nextState.placementsRemaining.blue === 0) {
      nextState.phase = 'moving'
    }
    nextState.lastAction = `${player === 'red' ? '赤' : '青'}が${describePosition(move.to)}に配置`
    nextState.consecutivePasses = 0
  } else if (move.type === 'move') {
    if (state.phase !== 'moving') {
      return { success: false, error: 'illegal', message: '移動フェーズ以外では動かせません' }
    }
    const fromCell = getCell(board, move.from)
    if (fromCell !== player) {
      return { success: false, error: 'illegal', message: '自分の駒ではありません' }
    }
    const toCell = getCell(board, move.to)
    if (toCell !== 'empty') {
      return { success: false, error: 'illegal', message: '移動先が埋まっています' }
    }
    if (move.from.layer === move.to.layer) {
      return { success: false, error: 'illegal', message: '必ず上下どちらかへ移動してください' }
    }
    setCell(board, move.from, 'empty')
    setCell(board, move.to, player)
    nextState.lastAction = `${player === 'red' ? '赤' : '青'}が${describePosition(move.from)}から${describePosition(move.to)}へ移動`
    nextState.consecutivePasses = 0
  }

  let activeLayer: 'upper' | 'lower' | null = null
  if (move.type === 'place') {
    activeLayer = move.to.layer
  } else if (move.type === 'move') {
    activeLayer = move.to.layer
  }

  const sandAssignments: SandAssignment[] | undefined =
    move.type === 'place' || move.type === 'move' ? move.sandAssignments : undefined

  if (activeLayer) {
    const sandwiches = detectSandwiches(board, activeLayer, player)
    const validation = ensureSandAssignments(sandwiches, sandAssignments, board)
    if (!validation.ok) {
      return {
        success: false,
        error: validation.message === 'sand-required' ? 'sand-required' : 'illegal',
        message: validation.message,
        requiredSand: sandwiches,
      }
    }
    if (sandwiches.length > 0 && sandAssignments) {
      applySandAssignments(board, sandAssignments)
      nextState.lastAction = `${nextState.lastAction ?? ''} / 挟み処理 ${sandwiches.length}件`
    }
  }

  if (!nextState.winner && move.type !== 'pass' && hasThreeInline(nextState, player)) {
    nextState.winner = player
    nextState.lastAction = `${player === 'red' ? '赤' : '青'}が3連を達成`
  }

  if (!nextState.winner) {
    nextState.activePlayer = player === 'red' ? 'blue' : 'red'
  }
  if (move.type !== 'pass') {
    nextState.turnCount += 1
  }

  return {
    success: true,
    state: nextState,
  }
}
