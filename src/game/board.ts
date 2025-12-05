import type { Board, BoardLayer, CellState, Layer, PlayerColor, Position } from './types'

export const BOARD_SIZES: Record<Layer, { width: number; height: number }> = {
  upper: { width: 4, height: 4 },
  lower: { width: 3, height: 3 },
}

const createLayer = (layer: Layer): BoardLayer => {
  const { width, height } = BOARD_SIZES[layer]
  return {
    width,
    height,
    cells: Array.from({ length: height }, () => Array<CellState>(width).fill('empty')),
  }
}

export const createBoard = (): Board => ({
  upper: createLayer('upper'),
  lower: createLayer('lower'),
})

export const cloneBoard = (board: Board): Board => ({
  upper: { ...board.upper, cells: board.upper.cells.map((row) => [...row]) },
  lower: { ...board.lower, cells: board.lower.cells.map((row) => [...row]) },
})

const isInside = (layer: BoardLayer, { x, y }: Position): boolean =>
  x >= 0 && y >= 0 && x < layer.width && y < layer.height

export const getCell = (board: Board, position: Position): CellState => {
  const layer = board[position.layer]
  if (!isInside(layer, position)) {
    throw new Error('Position outside board')
  }
  return layer.cells[position.y][position.x]
}

export const setCell = (board: Board, position: Position, value: CellState) => {
  const layer = board[position.layer]
  if (!isInside(layer, position)) {
    throw new Error('Position outside board')
  }
  layer.cells[position.y][position.x] = value
}

export const listPositions = (layerName: Layer): Position[] => {
  const { width, height } = BOARD_SIZES[layerName]
  const positions: Position[] = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      positions.push({ layer: layerName, x, y })
    }
  }
  return positions
}

export const getOppositeLayer = (layer: Layer): Layer => (layer === 'upper' ? 'lower' : 'upper')

export const hasEmptyCell = (board: Board, layer: Layer): boolean =>
  board[layer].cells.some((row) => row.some((cell) => cell === 'empty'))

export const countPiecesOnLayer = (board: Board, layer: Layer, player: PlayerColor) =>
  board[layer].cells.flat().filter((cell) => cell === player).length

export const isUpperCentralCell = (position: Position): boolean =>
  position.layer === 'upper' && position.x >= 1 && position.x <= 2 && position.y >= 1 && position.y <= 2
