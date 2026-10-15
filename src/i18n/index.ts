import { createContext, useContext } from 'react'
import { ar } from './ar'
import { en } from './en'
import type { Lang, Locale } from './locale'

export const LOCALES: Record<Lang, Locale> = { en, ar }

export const I18nContext = createContext<Locale>(en)

/** The current language's text, plus its `lang` and `dir`. */
export function useI18n(): Locale {
  return useContext(I18nContext)
}

/** The saved language, else Arabic when the browser prefers it. index.html applies the same rule before first paint. */
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'en' || saved === 'ar') return saved
  } catch {
    // Storage can be blocked; fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}
