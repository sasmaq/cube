// @vitest-environment jsdom
import './test/dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { LOCALES } from './i18n'
import { buildTimeline } from './player/timeline'
import { exampleSolve } from './solver/examples'
import { FakeCubeView } from './test/FakeCubeView'

vi.mock('./three/CubeView', async () => ({ CubeView: (await import('./test/FakeCubeView')).FakeCubeView }))

const html = document.documentElement
const click = (el: Element) =>
  act(async () => {
    fireEvent.click(el)
  })

describe('App', () => {
  it('opens on the Solve page with the example solve', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /Solve/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeTruthy()
    expect(document.title).toBe('Cube')
    expect(html.lang).toBe('en')
    expect(html.dir).toBe('ltr')
  })

  it('switches pages with the tabs, the logo and the address', async () => {
    render(<App />)
    await click(screen.getByRole('tab', { name: /Learn/ }))
    expect(window.location.hash).toBe('#learn')
    expect(screen.getByRole('heading', { name: 'Get to know your cube' })).toBeTruthy()

    await click(screen.getByRole('link', { name: 'Cube' }))
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()

    act(() => {
      history.replaceState(null, '', '#learn')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('heading', { name: 'Get to know your cube' })).toBeTruthy()
  })

  it('keeps its place in the solve while the Learn page is open', async () => {
    render(<App />)
    await click(screen.getByRole('button', { name: 'Next move' }))
    await click(screen.getByRole('tab', { name: /Learn/ }))
    await click(screen.getByRole('tab', { name: /Solve/ }))
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Solution progress' }).value).toBe('1')
    const example = exampleSolve()
    expect(FakeCubeView.latest().state).toBe(buildTimeline(example.start, example.segments).states[1])
  })

  it('switches to Arabic and remembers the choice', async () => {
    render(<App />)
    await click(screen.getByRole('button', { name: 'العربية' }))
    expect(html.lang).toBe('ar')
    expect(html.dir).toBe('rtl')
    expect(document.title).toBe(LOCALES.ar.app.name)
    expect(localStorage.getItem('lang')).toBe('ar')
    expect(screen.getByRole('button', { name: 'English' })).toBeTruthy()
  })

  it('starts in the saved language, otherwise Arabic when the browser prefers it', () => {
    vi.spyOn(Navigator.prototype, 'language', 'get').mockReturnValue('ar-SA')
    const { unmount } = render(<App />)
    expect(html.dir).toBe('rtl')
    unmount()

    localStorage.setItem('lang', 'en')
    render(<App />)
    expect(html.dir).toBe('ltr')
  })

  it('toggles dark mode and remembers it', async () => {
    const { unmount } = render(<App />)
    const toggle = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Dark mode' })
    expect(toggle.checked).toBe(false)
    await click(toggle)
    expect(html.getAttribute('data-theme')).toBe('night')
    expect(localStorage.getItem('theme')).toBe('night')
    unmount()

    render(<App />)
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Dark mode' }).checked).toBe(true)
  })

  it('still works when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<App />)
    await click(screen.getByRole('checkbox', { name: 'Dark mode' }))
    expect(html.getAttribute('data-theme')).toBe('night')
    expect(html.lang).toBe('en')
  })
})
