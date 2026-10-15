import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { I18nContext, LOCALES, initialLang } from './i18n'
import type { Lang } from './i18n/locale'
import { LearnPage } from './pages/LearnPage'
import { SolvePage } from './pages/SolvePage'
import { buildTimeline } from './player/timeline'
import { usePlayer } from './player/usePlayer'
import { exampleSolve } from './solver/examples'

type Page = 'solve' | 'learn'
type Theme = 'winter' | 'night'

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

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = LOCALES[lang]
  const solvePlayer = usePlayer(EXAMPLE_TIMELINE)
  const learnPlayer = usePlayer()

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Not persisting the theme is fine.
    }
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.lang = t.lang
    root.dir = t.dir
    document.title = t.app.name
    try {
      localStorage.setItem('lang', t.lang)
    } catch {
      // Not persisting the language is fine.
    }
  }, [t])

  const go = (p: Page) => {
    window.location.hash = p === 'learn' ? 'learn' : ''
    setPage(p)
    window.scrollTo({ top: 0 })
  }

  return (
    <I18nContext value={t}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
          <div className="navbar mx-auto max-w-[1400px] gap-2 px-3 sm:px-4">
            <div className="navbar-start gap-2">
              <a href="#" onClick={(e) => (e.preventDefault(), go('solve'))} className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
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
              <button
                type="button"
                className="btn btn-circle btn-ghost btn-sm text-sm font-bold"
                lang={t.app.otherLanguage.lang}
                title={t.app.otherLanguage.title}
                aria-label={t.app.otherLanguage.title}
                onClick={() => setLang(t.app.otherLanguage.lang)}
              >
                {t.app.otherLanguage.label}
              </button>
              <label className="btn btn-circle btn-ghost btn-sm swap swap-rotate" title={t.app.toggleDarkMode}>
                <input type="checkbox" checked={theme === 'night'} onChange={(e) => setTheme(e.target.checked ? 'night' : 'winter')} aria-label={t.app.darkMode} />
                <Icon name="sun" className="swap-off size-5" />
                <Icon name="moon" className="swap-on size-5" />
              </label>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-3 sm:p-4">
          {page === 'solve' ? <SolvePage player={solvePlayer} /> : <LearnPage player={learnPlayer} />}
        </main>
      </div>
    </I18nContext>
  )
}

function Logo() {
  const c = ['#ffd500', '#c41e3a', '#0051ba', '#009e60', '#ff5800', '#ffd500', '#0051ba', '#c41e3a', '#f4f4f4']
  return (
    <span className="grid size-7 grid-cols-3 gap-[2px] rounded-md bg-neutral p-[3px]" aria-hidden>
      {c.map((color, i) => (
        <span key={i} className="rounded-[2px]" style={{ background: color }} />
      ))}
    </span>
  )
}
