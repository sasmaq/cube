import { useRef, useState } from 'react'
import { STAGES } from '../solver/method'
import { DEMO_MOVES, algorithmDemo, moveDemo, stageDemo, type Demo } from '../solver/examples'
import { segmentAt } from '../player/timeline'
import type { Player } from '../player/usePlayer'
import { CubeStage } from '../components/CubeStage'
import { Icon } from '../components/Icon'
import { AlgChips, MoveChip } from '../components/MoveChip'
import { PlaybackBar } from '../components/PlaybackBar'
import { COLOR_HEX, type Color } from '../cube/state'
import { useI18n } from '../i18n'
import { caption, groupLabel } from '../i18n/locale'

const OPPOSITES: [Color, Color][] = [
  ['Y', 'W'],
  ['B', 'G'],
  ['R', 'O'],
]

export function LearnPage({ player, onTutorial }: { player: Player; onTutorial: () => void }) {
  const t = useI18n()
  const [demo, setDemo] = useState<Demo | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const watch = (make: () => Demo) => {
    const d = make()
    setDemo(d)
    player.load(d.start, d.segments, 450)
    // On small screens the demo cube sits above the list, so bring it into view.
    if (window.matchMedia('(max-width: 1023px)').matches) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const tl = player.timeline
  const seg = tl && tl.segments.length ? tl.segments[segmentAt(tl, player.pos)] : null
  const segText = seg ? caption(t, seg.text) : null
  const finished = tl !== null && player.pos >= tl.moves.length

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div ref={panelRef} className="order-first scroll-mt-20 lg:order-last">
        <div className="card border border-base-300 bg-base-100 shadow-sm lg:sticky lg:top-20">
          <div className="card-body gap-3 p-3 sm:p-4">
            <CubeStage player={player} demoTitle={demo?.title(t)} idleLabel={t.learn.demoCube} className="h-[38vh] min-h-[260px] lg:h-[46vh]" />
            {tl ? (
              <>
                <PlaybackBar player={player} compact />
                <div className="min-h-24 rounded-box bg-base-200 p-3 text-sm">
                  {finished ? (
                    <p className="opacity-80">{t.learn.done}</p>
                  ) : seg && segText ? (
                    <>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        {seg.group && <span className="badge badge-sm badge-outline">{groupLabel(t, seg.group)}</span>}
                        {seg.alg && <span className="badge badge-sm badge-primary badge-soft text-primary-ink">{t.algorithms[seg.alg.id].name}</span>}
                      </div>
                      <div className="font-semibold">{segText.title}</div>
                      <p className="opacity-80">{segText.detail}</p>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="p-2 text-center text-sm opacity-70">{t.learn.pressWatch}</p>
            )}
            <button type="button" className="btn btn-block" onClick={onTutorial}>
              {t.learn.tutorial}
              <Icon name="arrow" className="size-5 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary-ink">{t.learn.basics}</div>
              <h2 className="card-title text-2xl">{t.learn.basicsTitle}</h2>
            </div>
            <p className="opacity-85">{t.learn.basicsIntro}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <PieceCard title={t.learn.centers} tiles={1} text={t.learn.centersText} />
              <PieceCard title={t.learn.edges} tiles={2} text={t.learn.edgesText} />
              <PieceCard title={t.learn.corners} tiles={3} text={t.learn.cornersText} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-box bg-base-200 p-4 text-sm">
                <div className="mb-2 font-semibold">{t.learn.oppositeColors}</div>
                <div className="flex flex-col gap-1.5">
                  {OPPOSITES.map(([a, b]) => (
                    <div key={a} className="flex items-center gap-2">
                      <Swatch color={COLOR_HEX[a]} /> {t.colors[a]} <span className="opacity-50">{t.learn.opposite}</span> <Swatch color={COLOR_HEX[b]} /> {t.colors[b]}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-box bg-primary/10 p-4 text-sm">
                <div className="mb-2 font-semibold">{t.learn.holdTitle}</div>
                <p>
                  {t.learn.holdBody[0]}
                  <b>{t.learn.holdBody[1]}</b>
                  {t.learn.holdBody[2]}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary-ink">{t.learn.notation}</div>
              <h2 className="card-title text-2xl">{t.learn.notationTitle}</h2>
            </div>
            <p className="opacity-85">{t.learn.notationIntro}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {DEMO_MOVES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="flex flex-col items-center gap-1.5 rounded-box border border-base-300 p-3 text-center text-xs transition-colors hover:bg-base-200"
                  onClick={() => watch(() => moveDemo(m))}
                >
                  <AlgChips moves={m} size="md" />
                  <span className="opacity-75">{t.moves[m]}</span>
                </button>
              ))}
            </div>
            <p className="text-sm opacity-70">
              {t.learn.notationNote[0]}
              <MoveChip move={{ face: 'y', amount: 1 }} size="sm" />
              {t.learn.notationNote[1]}
            </p>
          </div>
        </section>

        {STAGES.map((stage) => {
          const text = t.stages[stage.id - 1]
          return (
            <section key={stage.id} id={`step-${stage.id}`} className="card scroll-mt-20 border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary-ink">{t.common.stepOf(stage.id)}</div>
                    <h2 className="card-title text-2xl">{text.name}</h2>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => watch(() => stageDemo(stage.id))}>
                    <Icon name="play" className="size-4" /> {t.learn.watchStep}
                  </button>
                </div>
                <p className="font-medium">{text.goal}</p>
                <ol className="list-decimal space-y-1.5 ps-5 text-sm opacity-90">
                  {text.how.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ol>
                {text.tip && (
                  <div role="note" className="alert alert-info alert-soft text-sm">
                    <Icon name="info" className="size-5 shrink-0" />
                    <span className="text-base-content">{text.tip}</span>
                  </div>
                )}
                <div className="flex flex-col divide-y divide-base-300 rounded-box border border-base-300">
                  {stage.algorithms.map((a) => (
                    <div key={a.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{t.algorithms[a.id].name}</span>
                          <AlgChips moves={a.moves} />
                        </div>
                        <div className="mt-1 text-xs opacity-70">{t.algorithms[a.id].when}</div>
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm shrink-0 self-start sm:self-center" onClick={() => watch(() => algorithmDemo(stage.id, a.id))}>
                        <Icon name="eye" className="size-4" /> {t.learn.watch}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block size-4 rounded border border-black/20" style={{ background: color }} />
}

function PieceCard({ title, tiles, text }: { title: string; tiles: number; text: string }) {
  const colors = ['#ffd500', '#c41e3a', '#0051ba']
  return (
    <div className="rounded-box border border-base-300 p-4">
      <div className="mb-2 flex gap-1">
        {colors.slice(0, tiles).map((c) => (
          <span key={c} className="size-6 rounded-md border border-black/20" style={{ background: c }} />
        ))}
      </div>
      <div className="font-semibold">{title}</div>
      <p className="text-sm opacity-75">{text}</p>
    </div>
  )
}
