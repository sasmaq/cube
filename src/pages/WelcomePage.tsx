import { Icon, type IconName } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useI18n } from '../i18n'

/** The first thing a new visitor sees: what the app is for, and a button that starts the tutorial. */
export function WelcomePage({ onStart }: { onStart: () => void }) {
  const t = useI18n()
  return (
    // The bottom padding matches the bar above, so the content sits in the middle of the screen.
    <div className="flex flex-1 items-center justify-center px-4 pt-4 pb-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <Logo large />
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t.welcome.title}</h1>
          <p className="text-lg opacity-80">{t.welcome.lead}</p>
        </div>
        <div className="grid w-full gap-3 text-start sm:grid-cols-2">
          <Feature icon="cube" title={t.app.solve} text={t.welcome.solve} />
          <Feature icon="book" title={t.app.learn} text={t.welcome.learn} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <button type="button" className="btn btn-primary btn-lg min-w-48" onClick={onStart}>
            {t.welcome.start}
            <Icon name="arrow" className="size-5 rtl:-scale-x-100" />
          </button>
          <p className="text-sm opacity-60">{t.welcome.startHint}</p>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-box border border-base-300 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-ink">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="text-sm opacity-75">{text}</p>
      </div>
    </div>
  )
}
