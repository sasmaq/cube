import { useI18n } from '../i18n'
import type { Player } from '../player/usePlayer'
import { countTurns } from '../player/timeline'
import { Icon } from './Icon'

// Back and forward arrows point the way the page reads; the play triangle stays as it is.
const ARROW = 'size-5 rtl:-scale-x-100'

export function PlaybackBar({ player, compact = false }: { player: Player; compact?: boolean }) {
  const t = useI18n()
  const { timeline, pos, playing } = player
  const total = timeline?.moves.length ?? 0
  const disabled = !timeline || total === 0
  const turnsDone = timeline ? countTurns(timeline.moves.slice(0, pos)) : 0
  const turnsTotal = timeline ? countTurns(timeline.moves) : 0

  return (
    <div className="flex flex-col gap-3">
      <input
        type="range"
        className="range range-primary range-xs w-full"
        min={0}
        max={Math.max(total, 1)}
        value={pos}
        disabled={disabled}
        onChange={(e) => player.seek(Number(e.target.value))}
        aria-label={t.playback.progress}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="join">
          <button type="button" className="btn join-item btn-sm sm:btn-md" onClick={player.prevStage} disabled={disabled} title={t.playback.prevStepTitle} aria-label={t.playback.prevStep}>
            <Icon name="skipBack" className={ARROW} />
          </button>
          <button type="button" className="btn join-item btn-sm sm:btn-md" onClick={player.stepBack} disabled={disabled || pos === 0} title={t.playback.prevMoveTitle} aria-label={t.playback.prevMove}>
            <Icon name="stepBack" className={ARROW} />
          </button>
          <button
            type="button"
            className="btn btn-primary join-item btn-sm sm:btn-md min-w-16"
            onClick={player.toggle}
            disabled={disabled}
            title={t.playback.playPauseTitle}
            aria-label={playing ? t.playback.pause : t.playback.play}
          >
            <Icon name={playing ? 'pause' : pos >= total && total > 0 ? 'restart' : 'play'} />
          </button>
          <button type="button" className="btn join-item btn-sm sm:btn-md" onClick={player.stepForward} disabled={disabled || pos >= total} title={t.playback.nextMoveTitle} aria-label={t.playback.nextMove}>
            <Icon name="stepForward" className={ARROW} />
          </button>
          <button type="button" className="btn join-item btn-sm sm:btn-md" onClick={player.nextStage} disabled={disabled || pos >= total} title={t.playback.nextStepTitle} aria-label={t.playback.nextStep}>
            <Icon name="skipForward" className={ARROW} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">{t.playback.speed}</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={player.speed}
            onChange={(e) => player.setSpeed(Number(e.target.value))}
            className="range range-xs w-24"
            aria-label={t.playback.playbackSpeed}
            title={t.playback.speeds[player.speed - 1]}
          />
        </div>

        {timeline && (
          <div className="text-sm tabular-nums opacity-80" title={t.playback.turnsTitle}>
            {t.playback.turns(turnsDone, turnsTotal)}
          </div>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={player.pauseAtSteps} onChange={(e) => player.setPauseAtSteps(e.target.checked)} />
            {t.playback.pauseAfterStep}
          </label>
        </div>
      )}
    </div>
  )
}
