import { useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { CubeStage, type ViewControl } from '../components/CubeStage'
import { Icon, type IconName } from '../components/Icon'
import { useI18n } from '../i18n'
import type { TutorialStep } from '../i18n/locale'
import { usePlayer } from '../player/usePlayer'

const STEPS: { id: TutorialStep; icon: IconName; control?: ViewControl }[] = [
  { id: 'drag', icon: 'move' },
  { id: 'zoom', icon: 'zoom' },
  { id: 'flip', icon: 'flip', control: 'flip' },
  { id: 'labels', icon: 'tag', control: 'labels' },
  { id: 'camera', icon: 'camera', control: 'camera' },
]

/** How far, in pixels, one pointer has to travel across the cube to count as looking around. */
const DRAG_PX = 40

/**
 * A hands-on tutorial for first-time visitors: looking around the cube, zooming, and the three view
 * buttons. Each step notices when it's been tried, but Next always works, so nobody gets stuck.
 */
export function TutorialPage({ onDone }: { onDone: () => void }) {
  const t = useI18n()
  const player = usePlayer()
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState<ReadonlySet<TutorialStep>>(() => new Set())
  // The pointers pressed on the cube with where each was last seen, and how far they've dragged.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragged = useRef(0)

  const step = STEPS[index]
  const text = t.tutorial.steps[step.id]
  const last = index === STEPS.length - 1
  const done = tried.has(step.id)
  const tryStep = (id: TutorialStep) => setTried((s) => (s.has(id) ? s : new Set(s).add(id)))

  // Only the canvas turns the view, so presses on the buttons over it don't count.
  const onPointerDown = (e: PointerEvent) => {
    if (e.target instanceof HTMLCanvasElement) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: PointerEvent) => {
    const seen = pointers.current.get(e.pointerId)
    if (!seen) return
    // Two fingers on the cube pinch to zoom; one pointer moving far enough is a drag.
    if (pointers.current.size > 1) return tryStep('zoom')
    dragged.current += Math.hypot(e.clientX - seen.x, e.clientY - seen.y)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dragged.current > DRAG_PX) tryStep('drag')
  }
  const onPointerUp = (e: PointerEvent) => pointers.current.delete(e.pointerId)
  const onWheel = (e: WheelEvent) => e.target instanceof HTMLCanvasElement && tryStep('zoom')

  // The tutorial card sits under the cube. On large screens the two fill the window below the bar above them (4rem).
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 pb-3 sm:px-4 sm:pb-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[600px]">
      <div
        className="card min-w-0 border border-base-300 bg-base-100 shadow-sm lg:min-h-0 lg:flex-1"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div className="card-body p-3 sm:p-4 lg:min-h-0">
          <CubeStage
            player={player}
            idleLabel={t.tutorial.cube}
            spotlight={step.control}
            onControl={tryStep}
            className="h-[40vh] min-h-[250px] sm:h-[48vh] lg:h-auto lg:min-h-0 lg:flex-1"
          />
        </div>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-4 sm:p-5 lg:gap-5 lg:p-8">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-ink">{t.tutorial.progress(index + 1, STEPS.length)}</span>
            <button type="button" className="btn btn-ghost btn-sm -me-2" onClick={onDone}>
              {t.tutorial.skip}
            </button>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-primary' : 'bg-base-300'}`} />
            ))}
          </div>

          <div className="flex items-start gap-3 lg:gap-4">
            {/* Drawn like the cube's buttons, so the one being explained is easy to spot. */}
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-base-300 bg-base-200 lg:size-14">
              <Icon name={step.icon} className="size-5 lg:size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div aria-live="polite">
                <h2 className="text-xl font-bold lg:text-2xl">{text.title}</h2>
                {/* On large screens two lines are kept for every step, enough for the longest, so the card
                    keeps one height and the cube above it doesn't resize. */}
                <p className="mt-1 opacity-85 lg:mt-2 lg:min-h-[2lh] xl:text-lg">{text.detail}</p>
              </div>
              <div role="status" className={`mt-3 flex items-center gap-2 text-sm font-medium ${done ? 'text-success' : 'opacity-70'}`}>
                {done ? <Icon name="check" className="size-5" /> : <span className="status status-primary mx-1.5 animate-pulse" />}
                {done ? t.tutorial.didIt : t.tutorial.tryIt}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setIndex(index - 1)} disabled={index === 0}>
              {t.tutorial.back}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => (last ? onDone() : setIndex(index + 1))}>
              {last ? t.tutorial.finish : t.tutorial.next}
              <Icon name="arrow" className="size-4 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
