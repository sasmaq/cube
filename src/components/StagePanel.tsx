import { useEffect, useRef } from 'react'
import { GRAY_HEX } from '../cube/state'
import { useI18n } from '../i18n'
import { caption, groupLabel, sameGroup } from '../i18n/locale'
import { STAGES } from '../solver/method'
import { countTurns, segmentAt, segmentEnd, stageAt, type Timeline } from '../player/timeline'
import type { Player } from '../player/usePlayer'
import { Icon } from './Icon'
import { AlgChips, MoveChip } from './MoveChip'

/** Explains what is happening right now: the step, the current action and the rest of the step. */
export function StagePanel({ player, timeline }: { player: Player; timeline: Timeline }) {
  const t = useI18n()
  const { pos } = player
  const finished = pos >= timeline.moves.length
  const stageId = stageAt(timeline, pos)
  const stage = STAGES.find((s) => s.id === stageId)
  const segIndex = segmentAt(timeline, pos)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>('[data-current="true"]')
    if (list && item) list.scrollTo({ top: item.offsetTop - list.offsetTop - 48, behavior: 'smooth' })
  }, [segIndex])

  if (finished || !stage) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-success text-success-content">
          <Icon name="check" className="size-8" />
        </div>
        <h2 className="text-xl font-bold">{t.panel.solvedTitle}</h2>
        <p className="max-w-xs text-sm opacity-80">{t.panel.solvedBody(countTurns(timeline.moves))}</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => player.seek(0)}>
          <Icon name="restart" className="size-4" /> {t.panel.watchAgain}
        </button>
      </div>
    )
  }

  const text = t.stages[stage.id - 1]
  const seg = timeline.segments[segIndex]
  const segText = caption(t, seg.text)
  const segFirst = timeline.segStart[segIndex]
  const stageSegs = timeline.segments.map((s, i) => ({ s, i })).filter(({ s }) => s.stage === stageId)

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary-ink">{t.common.stepOf(stage.id)}</div>
        <h2 className="text-xl font-bold">{text.name}</h2>
        <p className="mt-1 text-sm opacity-80">{text.goal}</p>
        {stage.id < 8 && (
          <p className="mt-2 flex items-start gap-2 text-xs opacity-70">
            <span className="mt-0.5 inline-block size-3 shrink-0 rounded-sm" style={{ background: GRAY_HEX }} aria-hidden />
            {t.panel.grayTiles}
          </p>
        )}
      </div>

      <div className="rounded-box border border-primary/30 bg-primary/5 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {seg.group && <span className="badge badge-sm badge-outline">{groupLabel(t, seg.group)}</span>}
          {seg.alg && <span className="badge badge-sm badge-primary badge-soft text-primary-ink">{t.algorithms[seg.alg.id].name}</span>}
          {seg.kind === 'rotate' && <span className="badge badge-sm badge-ghost">{t.panel.wholeCubeTurn}</span>}
        </div>
        <h3 className="font-semibold">{segText.title}</h3>
        <p className="mt-1 text-sm opacity-85">{segText.detail}</p>
        <div className="mt-3">
          <span dir="ltr" className="inline-flex flex-wrap items-center gap-1.5">
            {seg.moves.map((m, k) => {
              const i = segFirst + k
              return <MoveChip key={k} move={m} state={i < pos ? 'done' : i === pos ? 'current' : 'upcoming'} onClick={() => player.seek(i)} />
            })}
          </span>
        </div>
        <div className="mt-3">
          <button type="button" className="btn btn-primary btn-sm" onClick={player.nextSegment} disabled={player.playing}>
            <Icon name="play" className="size-4" /> {t.panel.playPart}
          </button>
        </div>
      </div>

      <details className="collapse-arrow collapse border border-base-300 bg-base-100">
        <summary className="collapse-title text-sm font-semibold">{t.panel.howItWorks}</summary>
        <div className="collapse-content text-sm">
          <ol className="list-decimal space-y-1.5 ps-5">
            {text.how.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
          {text.tip && <p className="mt-3 rounded-box bg-base-200 p-3 text-xs">💡 {text.tip}</p>}
          <div className="mt-3 flex flex-col gap-2">
            {stage.algorithms.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2">
                <span className="w-36 text-xs font-semibold">{t.algorithms[a.id].name}</span>
                <AlgChips moves={a.moves} />
              </div>
            ))}
          </div>
        </div>
      </details>

      <div className="lg:flex lg:min-h-32 lg:flex-1 lg:flex-col">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider opacity-60">{t.panel.everythingInStep}</div>
        <div ref={listRef} className="scrollbar-thin relative max-h-80 overflow-y-auto pe-1 lg:max-h-none lg:min-h-0 lg:flex-1">
          <ul className="flex flex-col gap-1">
            {stageSegs.map(({ s, i }, n) => {
              const start = timeline.segStart[i]
              const end = segmentEnd(timeline, i)
              const isCurrent = i === segIndex
              const done = pos >= end
              const newGroup = n === 0 || !sameGroup(stageSegs[n - 1].s.group, s.group) ? s.group : undefined
              return (
                <li key={i} data-current={isCurrent}>
                  {newGroup && <div className="mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-50">{groupLabel(t, newGroup)}</div>}
                  <button
                    type="button"
                    onClick={() => player.seek(start)}
                    className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-sm transition-colors ${
                      isCurrent ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-base-200'
                    } ${done ? 'opacity-55' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      {done ? <Icon name="check" className="size-4 text-success" /> : <span className="inline-block size-4" />}
                      {caption(t, s.text).title}
                    </span>
                    <span dir="ltr" className="flex flex-wrap gap-1">
                      {s.moves.map((m, k) => (
                        <MoveChip key={k} move={m} size="sm" />
                      ))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
