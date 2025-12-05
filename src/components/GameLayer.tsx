import type { BoardLayer, Layer, Position } from '../game/types'

const cellSizeByLayer: Record<Layer, string> = {
  upper: 'w-16 h-16 md:w-20 md:h-20',
  lower: 'w-16 h-16 md:w-24 md:h-24',
}

const gridColsByLayer: Record<Layer, string> = {
  upper: 'grid-cols-4',
  lower: 'grid-cols-3',
}

const positionKey = (pos: Position) => `${pos.layer}-${pos.x}-${pos.y}`

interface GameLayerProps {
  layer: Layer
  label: string
  board: BoardLayer
  onCellClick?: (position: Position) => void
  highlightCells?: Position[]
  selectedCell?: Position | null
  pendingSandTargets?: Position[]
  disabled?: boolean
}

const GameLayer = ({
  layer,
  label,
  board,
  onCellClick,
  highlightCells = [],
  selectedCell,
  pendingSandTargets = [],
  disabled,
}: GameLayerProps) => {
  const highlightSet = new Set(highlightCells.map(positionKey))
  const pendingSet = new Set(pendingSandTargets.map(positionKey))
  const selectedKey = selectedCell ? positionKey(selectedCell) : null

  return (
    <div className="bg-slate-900 rounded-xl p-4 shadow-xl border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-200 font-semibold">{label}</p>
        <p className="text-xs text-slate-400">{board.width}×{board.height}</p>
      </div>
      <div className={`grid gap-2 ${gridColsByLayer[layer]}`}>
        {board.cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const pos: Position = { layer, x: colIndex, y: rowIndex }
            const key = positionKey(pos)
            const isHighlight = highlightSet.has(key)
            const isSelected = key === selectedKey
            const isPending = pendingSet.has(key)
            const occupant = cell === 'empty' ? null : cell
            const clickable = !disabled && !!onCellClick && (isHighlight || isSelected)

            return (
              <button
                key={key}
                onClick={() => onCellClick?.(pos)}
                className={`relative rounded-lg border transition-colors ${cellSizeByLayer[layer]} flex items-center justify-center text-lg font-semibold
                  ${clickable ? 'cursor-pointer' : 'cursor-default'}
                  ${occupant === null ? 'border-slate-600 bg-slate-800' : 'border-slate-500 bg-slate-700'}
                  ${isHighlight ? 'ring-2 ring-yellow-400' : ''}
                  ${isSelected ? 'border-white ring-2 ring-white' : ''}
                  ${isPending ? 'animate-pulse border-fuchsia-400 ring-2 ring-fuchsia-400' : ''}
                `}
                disabled={!clickable}
              >
                {occupant && (
                  <span
                    className={`inline-flex w-10 h-10 rounded-full items-center justify-center text-base font-bold shadow-inner
                      ${occupant === 'red' ? 'bg-piece-red text-slate-900' : 'bg-piece-blue text-slate-900'}`}
                  >
                    {occupant === 'red' ? 'R' : 'B'}
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

export default GameLayer
