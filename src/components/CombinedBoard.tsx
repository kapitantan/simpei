import type { Board, Layer, Position } from '../game/types'

const positionKey = (pos: Position) => `${pos.layer}-${pos.x}-${pos.y}`

interface CombinedBoardProps {
  board: Board
  onCellClick?: (position: Position) => void
  highlightCells?: Position[]
  selectedCell?: Position | null
  pendingSandTargets?: Position[]
  disabled?: boolean
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

  const renderCell = (layer: Layer, x: number, y: number, extraClassName: string) => {
    const pos: Position = { layer, x, y }
    const key = positionKey(pos)
    const occupant = board[layer].cells[y][x]
    const isHighlight = highlightSet.has(key)
    const isSelected = key === selectedKey
    const isPending = pendingSet.has(key)
    const clickable = interactionEnabled && (isHighlight || isSelected || isPending)

    return (
      <button
        key={key}
        type="button"
        onClick={() => onCellClick?.(pos)}
        className={`relative flex items-center justify-center rounded-xl border transition-all duration-150 ${extraClassName}
          ${occupant === 'empty' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-700 border-slate-500'}
          ${isHighlight ? 'ring-2 ring-yellow-400' : ''}
          ${isSelected ? 'ring-2 ring-white border-white' : ''}
          ${isPending ? 'animate-pulse ring-2 ring-fuchsia-400 border-fuchsia-400' : ''}
          ${clickable ? 'cursor-pointer hover:border-white hover:bg-slate-600/80' : 'cursor-default opacity-90'}
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
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <p className="text-sm text-slate-300 mb-4">4×4（上の世界）の中央に 3×3（下の世界）が重なっています</p>
      <div className="relative w-full max-w-3xl mx-auto aspect-square">
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-3 z-10">
          {board.upper.cells.map((row, y) =>
            row.map((_cell, x) => renderCell('upper', x, y, '')),
          )}
        </div>
        <div
          className="absolute z-20 grid grid-cols-3 grid-rows-3 gap-3 pointer-events-none"
          style={{ inset: '12%' }}
        >
          {board.lower.cells.map((row, y) =>
            row.map((_cell, x) => (
              <div key={`wrapper-${x}-${y}`} className="pointer-events-auto">
                {renderCell('lower', x, y, 'text-sm')}
              </div>
            )),
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
        <span>外枠: 上の世界 (4×4)</span>
        <span>内側: 下の世界 (3×3)</span>
      </div>
    </div>
  )
}

export default CombinedBoard
