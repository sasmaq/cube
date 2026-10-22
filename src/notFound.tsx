import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { I18nContext, LOCALES, initialLang } from './i18n'
import { NotFoundPage } from './pages/NotFoundPage'

// The entry for 404.html. Its inline script has already set the theme and the page's language and
// direction, by the same rules as initialLang.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nContext value={LOCALES[initialLang()]}>
      <NotFoundPage />
    </I18nContext>
  </StrictMode>,
)
