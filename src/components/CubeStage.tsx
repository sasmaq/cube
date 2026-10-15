import { prettyMove } from '../cube/moves'
import { useI18n } from '../i18n'
import { stageAt } from '../player/timeline'
import type { Player } from '../player/usePlayer'
import { CubeCanvas } from './CubeCanvas'
import { Icon } from './Icon'
import { MoveChip } from './MoveChip'

interface CubeStageProps {
  player: Player
  className?: string
  /** Shown top-left when no solution is loaded. */
  idleLabel?: string
  /** Replaces the "Step n" badge, e.g. for Learn page demos. */
  demoTitle?: string
}

/** The 3D cube with status overlays: current step, the move being played, and view controls. */
export function CubeStage({ player, className = '', idleLabel, demoTitle }: CubeStageProps) {
  const t = useI18n()
  const { timeline, pos } = player
  const stage = timeline ? stageAt(timeline, pos) : 0
  const finished = timeline !== null && pos >= timeline.moves.length
  const upcoming = timeline && !finished ? timeline.moves[pos].move : null
  const stageName = stage >= 1 && stage <= 8 ? t.stages[stage - 1].name : null
  // The view buttons sit at the end of the row, so their tooltips open toward the middle.
  const tip = t.dir === 'rtl' ? 'tooltip-right' : 'tooltip-left'

  return (
    <div className={`cube-stage relative overflow-hidden rounded-box ${className}`}>
      <CubeCanvas onReady={player.attach} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          {timeline ? (
            demoTitle ? (
              <span className="badge badge-primary h-auto py-0.5 font-semibold shadow-sm">{demoTitle}</span>
            ) : finished ? (
              <span className="badge badge-success gap-1 font-semibold shadow-sm">
                <Icon name="check" className="size-4" /> {t.cube.solved}
              </span>
            ) : (
              <span className="badge badge-primary h-auto py-0.5 font-semibold leading-snug shadow-sm">{stageName ? `${t.common.step(stage)} · ${stageName}` : t.cube.demo}</span>
            )
          ) : (
            <span className="badge badge-neutral badge-soft font-semibold shadow-sm">{idleLabel ?? t.cube.solvedCube}</span>
          )}
          {player.flipped && (
            <span className="badge badge-sm h-auto max-w-56 border-base-300 bg-base-100/85 py-0.5 text-start leading-snug shadow-sm">{t.cube.upsideDown}</span>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1">
          <div className={`tooltip ${tip}`} data-tip={player.flipped ? t.cube.flipBack : t.cube.flipOver}>
            <button
              type="button"
              className={`btn btn-sm rounded-full max-sm:btn-circle ${player.flipped ? 'btn-primary' : 'btn-ghost bg-base-100/70'}`}
              onClick={() => player.setFlipped(!player.flipped)}
              aria-pressed={player.flipped}
              aria-label={t.cube.whiteOnTop}
            >
              <Icon name="flip" className="size-4" />
              <span className="hidden sm:inline">{t.cube.whiteOnTop}</span>
            </button>
          </div>
          <div className={`tooltip ${tip}`} data-tip={player.labels ? t.cube.hideLetters : t.cube.showLetters}>
            <button
              type="button"
              className={`btn btn-circle btn-sm ${player.labels ? 'btn-primary' : 'btn-ghost bg-base-100/70'}`}
              onClick={() => player.setLabels(!player.labels)}
              aria-label={t.cube.toggleLetters}
            >
              <Icon name="tag" className="size-4" />
            </button>
          </div>
          <div className={`tooltip ${tip}`} data-tip={t.cube.resetView}>
            <button type="button" className="btn btn-circle btn-ghost btn-sm bg-base-100/70" onClick={player.resetCamera} aria-label={t.cube.resetView}>
              <Icon name="camera" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {upcoming && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div className="flex items-center gap-3 rounded-box bg-base-100/85 px-3 py-2 shadow-md backdrop-blur">
            <MoveChip move={upcoming} size="lg" state="current" />
            <div className="text-sm leading-tight">
              <div className="text-xs uppercase tracking-wide opacity-60">{player.playing ? t.cube.turning : t.cube.nextMove}</div>
              <div className="font-medium">{t.describeMove(upcoming)}</div>
            </div>
          </div>
        </div>
      )}
      {!timeline && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs opacity-60">{t.cube.dragHint}</div>
      )}
      <span className="sr-only" aria-live="polite">
        {upcoming ? t.cube.srNextMove(prettyMove(upcoming)) : finished ? t.cube.srSolved : ''}
      </span>
    </div>
  )
}
