// @vitest-environment jsdom
import './test/dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const { en } = LOCALES

describe('App', () => {
  // These visitors have been here before; the first visit has tests of its own below.
  beforeEach(() => localStorage.setItem('intro', 'done'))

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

  it('keeps the Learn demo and its title while the Solve page is open', async () => {
    render(<App />)
    await click(screen.getByRole('tab', { name: /Learn/ }))
    const row = screen.getByText(en.algorithms['daisy-left'].name).closest('.min-w-0')!.parentElement!
    await click(within(row).getByRole('button', { name: en.learn.watch }))
    const title = `${en.algorithms['daisy-left'].name} · ${en.common.step(1)}`
    expect(screen.getByText(title)).toBeTruthy()

    await click(screen.getByRole('tab', { name: /Solve/ }))
    await click(screen.getByRole('tab', { name: /Learn/ }))
    expect(screen.getByText(title)).toBeTruthy()
  })

  it('takes the tutorial again from the Learn page, then comes back to it', async () => {
    render(<App />)
    await click(screen.getByRole('tab', { name: /Learn/ }))
    await click(screen.getByRole('button', { name: en.learn.tutorial }))
    expect(screen.getByText(en.tutorial.progress(1, 5))).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.queryByRole('heading', { name: en.welcome.title })).toBeNull()

    await click(screen.getByRole('button', { name: en.tutorial.skip }))
    expect(screen.getByRole('heading', { name: 'Get to know your cube' })).toBeTruthy()
    expect(window.location.hash).toBe('#learn')
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

  it('saves the theme and language only once the visitor picks them, so until then they follow the system', () => {
    render(<App />)
    expect(localStorage.getItem('theme')).toBeNull()
    expect(localStorage.getItem('lang')).toBeNull()
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

    // With nothing saved this could be a first visit, so it welcomes, and the tutorial still ends.
    await click(screen.getByRole('button', { name: en.welcome.start }))
    await click(screen.getByRole('button', { name: en.tutorial.skip }))
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
  })
})

describe('A first visit', () => {
  it('welcomes, runs the tutorial, then opens the app and stays out of the way', async () => {
    const { unmount } = render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: en.welcome.title })).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
    // The language and dark mode buttons are there from the start.
    expect(screen.getByRole('button', { name: 'العربية' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Dark mode' })).toBeTruthy()

    await click(screen.getByRole('button', { name: en.welcome.start }))
    expect(screen.getByText(en.tutorial.progress(1, 5))).toBeTruthy()
    expect(screen.getByRole('heading', { name: en.tutorial.steps.drag.title })).toBeTruthy()
    for (let i = 0; i < 4; i++) await click(screen.getByRole('button', { name: en.tutorial.next }))
    await click(screen.getByRole('button', { name: en.tutorial.finish }))

    expect(screen.getByRole('tab', { name: /Solve/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
    expect(localStorage.getItem('intro')).toBe('done')
    unmount()

    render(<App />)
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
  })

  it('opens the page in the address after skipping the tutorial', async () => {
    history.replaceState(null, '', '#learn')
    render(<App />)
    await click(screen.getByRole('button', { name: en.welcome.start }))
    await click(screen.getByRole('button', { name: en.tutorial.skip }))
    expect(screen.getByRole('heading', { name: 'Get to know your cube' })).toBeTruthy()
    expect(localStorage.getItem('intro')).toBe('done')
  })

  it('welcomes again next time if the tutorial was left unfinished', async () => {
    const { unmount } = render(<App />)
    await click(screen.getByRole('button', { name: en.welcome.start }))
    unmount()

    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: en.welcome.title })).toBeTruthy()
  })

  it('welcomes in Arabic, right to left', async () => {
    vi.spyOn(Navigator.prototype, 'language', 'get').mockReturnValue('ar-SA')
    render(<App />)
    expect(html.dir).toBe('rtl')
    expect(screen.getByRole('heading', { level: 1, name: LOCALES.ar.welcome.title })).toBeTruthy()
    await click(screen.getByRole('button', { name: LOCALES.ar.welcome.start }))
    expect(screen.getByText(LOCALES.ar.tutorial.progress(1, 5))).toBeTruthy()
  })
})
