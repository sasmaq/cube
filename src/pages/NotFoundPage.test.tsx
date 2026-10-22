// @vitest-environment jsdom
import '../test/dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nContext, LOCALES } from '../i18n'
import { NotFoundPage } from './NotFoundPage'

const { en, ar } = LOCALES

describe('NotFoundPage', () => {
  it('says the page is missing and links back to the app', () => {
    render(<NotFoundPage />)
    expect(screen.getByRole('heading', { name: en.notFound.title })).toBeTruthy()
    expect(screen.getByText('404')).toBeTruthy()
    expect(screen.getByRole('link', { name: en.notFound.home }).getAttribute('href')).toBe('/')
    expect(document.title).toBe(en.notFound.pageTitle)
  })

  it('speaks the language it is given', () => {
    render(
      <I18nContext value={ar}>
        <NotFoundPage />
      </I18nContext>,
    )
    expect(screen.getByRole('heading', { name: ar.notFound.title })).toBeTruthy()
    expect(screen.getByRole('link', { name: ar.notFound.home })).toBeTruthy()
    expect(document.title).toBe(ar.notFound.pageTitle)
  })
})
