import { useEffect, useRef, useState } from 'react'
import type { Board, Position, SandMove } from '../game/types'

const positionKey = (pos: Position) => `${pos.layer}-${pos.x}-${pos.y}`

interface CombinedBoardProps {
  board: Board
  onCellClick?: (position: Position) => void
  highlightCells?: Position[]
  selectedCell?: Position | null
  pendingSandTargets?: Position[]
  disabled?: boolean
  sandAnimations?: SandMove[]
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

type FlyingPiece = {
  id: string
  color: SandMove['piece']
  start: { x: number; y: number }
  end: { x: number; y: number }
  size: number
  active: boolean
}

const CombinedBoard = ({
  board,
  onCellClick,
  highlightCells = [],
  selectedCell,
  pendingSandTargets = [],
  disabled,
  sandAnimations = [],
}: CombinedBoardProps) => {
  const highlightSet = new Set(highlightCells.map(positionKey))
  const pendingSet = new Set(pendingSandTargets.map(positionKey))
  const selectedKey = selectedCell ? positionKey(selectedCell) : null
  const interactionEnabled = !disabled && !!onCellClick
  const cellRefs = useRef(new Map<string, HTMLButtonElement | null>())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [flyingPieces, setFlyingPieces] = useState<FlyingPiece[]>([])

  useEffect(() => {
    if (!sandAnimations || sandAnimations.length === 0) {
      setFlyingPieces([])
      return
    }
    const container = containerRef.current
    if (!container) {
      return
    }
    const containerRect = container.getBoundingClientRect()
    const timestamp = Date.now()
    const pieces = sandAnimations
      .map((move, index) => {
        const fromRef = cellRefs.current.get(positionKey(move.from))
        const toRef = cellRefs.current.get(positionKey(move.to))
        if (!fromRef || !toRef) {
          return null
        }
        const fromRect = fromRef.getBoundingClientRect()
        const toRect = toRef.getBoundingClientRect()
        const size = Math.min(fromRect.width, fromRect.height) * 0.7
        return {
          id: `${timestamp}-${index}`,
          color: move.piece,
          start: {
            x: fromRect.left - containerRect.left + fromRect.width / 2,
            y: fromRect.top - containerRect.top + fromRect.height / 2,
          },
          end: {
            x: toRect.left - containerRect.left + toRect.width / 2,
            y: toRect.top - containerRect.top + toRect.height / 2,
          },
          size,
          active: false,
        }
      })
      .filter((value): value is FlyingPiece => value !== null)
    if (pieces.length === 0) {
      return
    }
    setFlyingPieces(pieces)
    const raf = requestAnimationFrame(() => {
      setFlyingPieces((current) => current.map((piece) => ({ ...piece, active: true })))
    })
    const timeout = window.setTimeout(() => {
      setFlyingPieces([])
    }, 600)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
    }
  }, [sandAnimations])

  const registerCellRef = (key: string, node: HTMLButtonElement | null) => {
    if (node) {
      cellRefs.current.set(key, node)
    } else {
      cellRefs.current.delete(key)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <p className="text-sm text-slate-300 mb-4">
        7×7 グリッド上で、白（4×4=上の世界）と黒（3×3=下の世界）のマスが交互に配置されています。
        配置フェーズは初手のみ白マス中央4箇所、それ以降は白黒どちらにも配置可能で、移動フェーズでは隣り合う白↔黒マス間で駒を移します。
      </p>
      <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
        <div className="grid grid-cols-7 gap-2">
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
          const isLower = pos.layer === 'lower'
          const tileBaseClass = isUpper
            ? 'inset-1 bg-slate-100/80 border border-white/40 shadow-[inset_0_1px_3px_rgba(255,255,255,0.35)]'
            : 'inset-2 bg-slate-900/80 border border-slate-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]'
          const pieceColorClass = occupant === 'red' ? 'bg-piece-red text-slate-900' : 'bg-piece-blue text-slate-900'
          const pieceShapeClass = isUpper
            ? 'w-9 h-9 md:w-11 md:h-11 rounded-full'
            : 'w-8 h-8 md:w-10 md:h-10 rounded-[1.35rem] text-sm'

          return (
            <button
              key={key}
              type="button"
              ref={(node) => registerCellRef(key, node)}
              onClick={() => onCellClick?.(pos)}
              className={`relative aspect-square rounded-2xl border flex items-center justify-center transition-all duration-150 bg-transparent
                ${clickable ? 'cursor-pointer border-slate-500/40 hover:border-white/80 hover:ring-1 hover:ring-white/40' : 'cursor-default border-slate-800/40 opacity-90'}
                ${isHighlight ? 'ring-2 ring-yellow-400' : ''}
                ${isSelected ? 'ring-2 ring-white border-white' : ''}
                ${isPending ? 'animate-pulse ring-2 ring-fuchsia-400 border-fuchsia-400' : ''}
              `}
              disabled={!clickable}
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute rounded-xl transition-all duration-200 ${tileBaseClass}`}
              />
              {occupant !== 'empty' && (
                <span
                  className={`relative inline-flex items-center justify-center font-semibold shadow-inner ${pieceColorClass} ${pieceShapeClass}`}
                >
                  {occupant === 'red' ? 'R' : 'B'}
                  {isLower && (
                    <span
                      aria-hidden
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[12px]
                        ${occupant === 'red' ? 'border-t-piece-red' : 'border-t-piece-blue'} border-l-transparent border-r-transparent drop-shadow`}
                    />
                  )}
                </span>
              )}
            </button>
          )
        })}
        </div>
        {flyingPieces.map((piece) => (
          <span
            key={piece.id}
            className={`absolute rounded-full flex items-center justify-center text-xs font-semibold text-slate-900 shadow-lg pointer-events-none ${
              piece.color === 'red' ? 'bg-piece-red' : 'bg-piece-blue'
            }`}
            style={{
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              left: `${piece.active ? piece.end.x : piece.start.x}px`,
              top: `${piece.active ? piece.end.y : piece.start.y}px`,
              transform: 'translate(-50%, -50%)',
              opacity: piece.active ? 0.95 : 0.7,
              transition: 'left 500ms ease-out, top 500ms ease-out, opacity 300ms ease-out',
            }}
          >
            {piece.color === 'red' ? 'R' : 'B'}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
        <span>□: 上の世界 (4×4)</span>
        <span>■: 下の世界 (3×3)</span>
      </div>
    </div>
  )
}

export default CombinedBoard
