import { useEffect } from 'react'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useI18n } from '../i18n'

/** What 404.html shows for any address the site doesn't have: a short note and a link back to the app. */
export function NotFoundPage() {
  const t = useI18n()

  useEffect(() => {
    document.title = t.notFound.pageTitle
  }, [t])

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-100 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Logo large />
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold tracking-widest text-primary-ink">404</p>
          <h1 className="text-4xl font-extrabold tracking-tight">{t.notFound.title}</h1>
          <p className="text-lg opacity-80">{t.notFound.lead}</p>
        </div>
        <a href="/" className="btn btn-primary btn-lg min-w-48">
          {t.notFound.home}
          <Icon name="arrow" className="size-5 rtl:-scale-x-100" />
        </a>
      </div>
    </main>
  )
}
