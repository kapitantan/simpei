import type { Board, Position } from '../game/types'

const positionKey = (pos: Position) => `${pos.layer}-${pos.x}-${pos.y}`

interface CombinedBoardProps {
  board: Board
  onCellClick?: (position: Position) => void
  highlightCells?: Position[]
  selectedCell?: Position | null
  pendingSandTargets?: Position[]
  disabled?: boolean
}

const GRID_SIZE = 7

const toPosition = (row: number, col: number): Position | null => {
  if (row % 2 === 0 && col % 2 === 0) {
    return { layer: 'upper', y: row / 2, x: col / 2 }
  }
  if (row % 2 === 1 && col % 2 === 1 && row < GRID_SIZE - 1 && col < GRID_SIZE - 1) {
    return { layer: 'lower', y: (row - 1) / 2, x: (col - 1) / 2 }
  }
  return null
}

const CombinedBoard = ({
  board,
  onCellClick,
  highlightCells = [],
  selectedCell,
  pendingSandTargets = [],
  disabled,
}: CombinedBoardProps) => {
  const highlightSet = new Set(highlightCells.map(positionKey))
  const pendingSet = new Set(pendingSandTargets.map(positionKey))
  const selectedKey = selectedCell ? positionKey(selectedCell) : null
  const interactionEnabled = !disabled && !!onCellClick

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <p className="text-sm text-slate-300 mb-4">
        7×7 グリッド上で、白（4×4=上の世界）と黒（3×3=下の世界）のマスが交互に配置されています。
        配置フェーズは初手のみ白マス中央4箇所、それ以降は白黒どちらにも配置可能で、移動フェーズでは隣り合う白↔黒マス間で駒を移します。
      </p>
      <div className="grid grid-cols-7 gap-2 w-full max-w-3xl mx-auto">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
          const row = Math.floor(index / GRID_SIZE)
          const col = index % GRID_SIZE
          const pos = toPosition(row, col)
          if (!pos) {
            return <div key={`empty-${index}`} className="aspect-square rounded-xl bg-slate-800/30 border border-slate-800" />
          }

          const key = positionKey(pos)
          const occupant = board[pos.layer].cells[pos.y][pos.x]
          const isHighlight = highlightSet.has(key)
          const isSelected = key === selectedKey
          const isPending = pendingSet.has(key)
          const clickable = interactionEnabled && (isHighlight || isSelected || isPending)

          const isUpper = pos.layer === 'upper'

          return (
            <button
              key={key}
              type="button"
              onClick={() => onCellClick?.(pos)}
              className={`aspect-square rounded-xl border flex items-center justify-center transition-colors duration-150
                ${isUpper ? 'bg-slate-800 border-slate-600' : 'bg-slate-700 border-slate-500'}
                ${clickable ? 'cursor-pointer hover:border-white hover:bg-slate-600' : 'cursor-default opacity-90'}
                ${isHighlight ? 'ring-2 ring-yellow-400' : ''}
                ${isSelected ? 'ring-2 ring-white border-white' : ''}
                ${isPending ? 'animate-pulse ring-2 ring-fuchsia-400 border-fuchsia-400' : ''}
              `}
              disabled={!clickable}
            >
              {occupant !== 'empty' && (
                <span
                  className={`inline-flex w-9 h-9 md:w-11 md:h-11 rounded-full items-center justify-center text-base font-semibold shadow-inner
                    ${occupant === 'red' ? 'bg-piece-red text-slate-900' : 'bg-piece-blue text-slate-900'}`}
                >
                  {occupant === 'red' ? 'R' : 'B'}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
        <span>□: 上の世界 (4×4)</span>
        <span>■: 下の世界 (3×3)</span>
      </div>
    </div>
  )
}

export default CombinedBoard
