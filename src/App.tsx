import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { Logo } from './components/Logo'
import { I18nContext, LOCALES, initialLang, useI18n } from './i18n'
import type { Lang } from './i18n/locale'
import { LearnPage } from './pages/LearnPage'
import { SolvePage } from './pages/SolvePage'
import { TutorialPage } from './pages/TutorialPage'
import { WelcomePage } from './pages/WelcomePage'
import { buildTimeline } from './player/timeline'
import { usePlayer } from './player/usePlayer'
import { exampleSolve, type Demo } from './solver/examples'

type Page = 'solve' | 'learn'
type Theme = 'winter' | 'night'
/** What first-time visitors see before the app: the welcome screen, then the tutorial. */
type Intro = 'welcome' | 'tutorial'

const example = exampleSolve()
const EXAMPLE_TIMELINE = buildTimeline(example.start, example.segments)

function pageFromHash(): Page {
  return window.location.hash === '#learn' ? 'learn' : 'solve'
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'winter' || saved === 'night') return saved
  } catch {
    // Storage can be blocked; fall back to the system preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'winter'
}

/** Saves something the visitor chose. Storage can be blocked; then the choice lasts until the page closes. */
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not persisting it is fine.
  }
}

/** The welcome screen, unless this browser has already finished or skipped the tutorial. */
function initialIntro(): Intro | null {
  try {
    if (localStorage.getItem('intro') === 'done') return null
  } catch {
    // Storage can be blocked; then every visit could be the first.
  }
  return 'welcome'
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash)
  const [intro, setIntro] = useState<Intro | null>(initialIntro)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = LOCALES[lang]
  const solvePlayer = usePlayer(EXAMPLE_TIMELINE)
  const learnPlayer = usePlayer()
  // Kept with the Learn page's player, so the demo keeps its title while another page is open.
  const [learnDemo, setLearnDemo] = useState<Demo | null>(null)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.lang = t.lang
    root.dir = t.dir
    document.title = t.app.name
  }, [t])

  // Only a choice made with the buttons is saved. Until then each visit follows the system's color
  // scheme and the browser's language, as they are at the time.
  const chooseTheme = (next: Theme) => {
    setTheme(next)
    remember('theme', next)
  }
  const chooseLang = (next: Lang) => {
    setLang(next)
    remember('lang', next)
  }

  const go = (p: Page) => {
    window.location.hash = p === 'learn' ? 'learn' : ''
    setPage(p)
    window.scrollTo({ top: 0 })
  }

  const showIntro = (next: Intro | null) => {
    setIntro(next)
    window.scrollTo({ top: 0 })
  }

  // Finishing or skipping the tutorial opens whichever page the address asks for.
  // Without storage the welcome comes back next visit, which is fine.
  const finishIntro = () => {
    showIntro(null)
    remember('intro', 'done')
  }

  const settings = <Settings theme={theme} onTheme={chooseTheme} onLang={chooseLang} />

  return (
    <I18nContext value={t}>
      <div className={`flex min-h-screen flex-col ${intro === 'welcome' ? 'bg-base-100' : ''}`}>
        {intro ? (
          <>
            {/* Laid out like the header's bar, so these buttons sit exactly where they do in the app. */}
            <div className="navbar mx-auto max-w-[1400px] gap-2 px-3 sm:px-4">
              <div className="navbar-end ms-auto gap-1">{settings}</div>
            </div>
            <main className="flex flex-1 flex-col">
              {intro === 'welcome' ? <WelcomePage onStart={() => showIntro('tutorial')} /> : <TutorialPage onDone={finishIntro} />}
            </main>
          </>
        ) : (
          <>
            <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
              <div className="navbar mx-auto max-w-[1400px] gap-2 px-3 sm:px-4">
                <div className="navbar-start gap-2">
                  {/* Labeled for phones, where the name beside the logo is hidden. */}
                  <a
                    href="#"
                    onClick={(e) => (e.preventDefault(), go('solve'))}
                    aria-label={t.app.name}
                    className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
                  >
                    <Logo />
                    <span className="hidden sm:inline">{t.app.name}</span>
                  </a>
                </div>
                <nav className="navbar-center">
                  <div role="tablist" className="tabs tabs-box tabs-sm sm:tabs-md">
                    <button type="button" role="tab" aria-selected={page === 'solve'} className={`tab gap-1.5 ${page === 'solve' ? 'tab-active' : ''}`} onClick={() => go('solve')}>
                      <Icon name="cube" className="size-4" /> {t.app.solve}
                    </button>
                    <button type="button" role="tab" aria-selected={page === 'learn'} className={`tab gap-1.5 ${page === 'learn' ? 'tab-active' : ''}`} onClick={() => go('learn')}>
                      <Icon name="book" className="size-4" /> {t.app.learn}
                    </button>
                  </div>
                </nav>
                <div className="navbar-end gap-1">
                  <span dir="ltr" className="me-1 hidden text-xs font-medium tabular-nums opacity-50 sm:inline">
                    v{__APP_VERSION__}
                  </span>
                  {settings}
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-4">
              {page === 'solve' ? (
                <SolvePage player={solvePlayer} />
              ) : (
                <LearnPage player={learnPlayer} demo={learnDemo} onDemo={setLearnDemo} onTutorial={() => showIntro('tutorial')} />
              )}
            </main>
          </>
        )}
      </div>
    </I18nContext>
  )
}

/** The language and dark mode buttons, in the header and on the intro screens. */
function Settings({ theme, onTheme, onLang }: { theme: Theme; onTheme: (theme: Theme) => void; onLang: (lang: Lang) => void }) {
  const t = useI18n()
  return (
    <>
      <button
        type="button"
        className="btn btn-circle btn-ghost btn-sm text-sm font-bold"
        lang={t.app.otherLanguage.lang}
        title={t.app.otherLanguage.title}
        aria-label={t.app.otherLanguage.title}
        onClick={() => onLang(t.app.otherLanguage.lang)}
      >
        {t.app.otherLanguage.label}
      </button>
      <label className="btn btn-circle btn-ghost btn-sm swap swap-rotate" title={t.app.toggleDarkMode}>
        <input type="checkbox" checked={theme === 'night'} onChange={(e) => onTheme(e.target.checked ? 'night' : 'winter')} aria-label={t.app.darkMode} />
        <Icon name="sun" className="swap-off size-5" />
        <Icon name="moon" className="swap-on size-5" />
      </label>
    </>
  )
}
