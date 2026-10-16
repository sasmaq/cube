import { useI18n } from '../i18n'
import { STAGES } from '../solver/method'
import { stageAt, stageRange, type Timeline } from '../player/timeline'
import { Icon } from './Icon'

interface StageStepperProps {
  timeline: Timeline
  pos: number
  onSelect: (stage: number) => void
}

/** The eight steps along the bottom. Each shows how far it has played; tap one to jump to it. */
export function StageStepper({ timeline, pos, onSelect }: StageStepperProps) {
  const t = useI18n()
  const current = stageAt(timeline, pos)

  return (
    <nav aria-label={t.panel.steps} className="sticky bottom-3 z-20 shrink-0 rounded-box border border-base-300 bg-base-100/95 p-1.5 shadow-float backdrop-blur sm:p-2 lg:static lg:shadow-sm">
      <ol className="grid grid-cols-8 gap-1 sm:gap-1.5">
        {STAGES.map((stage) => {
          const range = stageRange(timeline, stage.id)
          const done = range ? pos >= range[1] : current > stage.id
          const active = current === stage.id
          const progress = done ? 1 : active && range ? (pos - range[0]) / (range[1] - range[0]) : 0
          const text = t.stages[stage.id - 1]
          const name = t.common.stepName(stage.id, text.name)
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => onSelect(stage.id)}
                aria-current={active ? 'step' : undefined}
                title={range ? name : t.panel.alreadyDone(name)}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-0.5 pt-1.5 pb-1 text-center transition-colors sm:px-1 ${
                  active ? 'bg-primary/10' : 'hover:bg-base-200'
                }`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                    done ? 'bg-primary text-primary-content' : active ? 'bg-base-100 text-primary-ink ring-2 ring-primary' : 'bg-base-200 text-base-content/60'
                  }`}
                >
                  {done ? <Icon name="check" className="size-4" /> : stage.id}
                </span>
                <span className={`hidden text-xs leading-tight sm:block ${active ? 'font-bold text-primary-ink' : done ? 'font-medium' : 'opacity-60'}`}>{text.short}</span>
                <span className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-base-300">
                  <span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
