import { parseMoves, prettyMove, type Move } from '../cube/moves'
import { useI18n } from '../i18n'

interface MoveChipProps {
  move: Move
  size?: 'sm' | 'md' | 'lg'
  state?: 'done' | 'current' | 'upcoming'
  onClick?: () => void
}

/**
 * One move as a colored chip. The notation is always left-to-right so a prime stays after its
 * letter (R′), while the tooltip follows the page language even inside a left-to-right row.
 */
export function MoveChip({ move, size = 'md', state, onClick }: MoveChipProps) {
  const className = `move-chip move-${move.face} ${size === 'md' ? '' : size} ${state === 'done' ? 'done' : state === 'current' ? 'current' : ''}`
  const { describeMove, dir } = useI18n()
  const label = describeMove(move)
  const text = <span dir="ltr">{prettyMove(move)}</span>
  if (onClick) {
    return (
      <button type="button" dir={dir} className={`${className} cursor-pointer hover:brightness-110`} onClick={onClick} title={label} aria-label={`${prettyMove(move)}: ${label}`}>
        {text}
      </button>
    )
  }
  return (
    <span dir={dir} className={className} title={label}>
      {text}
    </span>
  )
}

/** A whole algorithm as a row of chips, e.g. for "R U R′". Notation reads left to right in every language. */
export function AlgChips({ moves, size = 'sm' }: { moves: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span dir="ltr" className="inline-flex flex-wrap gap-1 align-middle">
      {parseMoves(moves).map((m, i) => (
        <MoveChip key={i} move={m} size={size} />
      ))}
    </span>
  )
}
