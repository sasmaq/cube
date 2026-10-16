/**
 * Shared setup for tests that run in jsdom. Import it first in any file marked
 * `// @vitest-environment jsdom`.
 */
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  localStorage.clear()
  // Clear the hash without firing hashchange into the next test.
  history.replaceState(null, '', '/')
})

// jsdom has no layout, media queries, resize observers or canvas drawing. Stand-ins that do
// nothing are enough; tests that care about one spy on it.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.scrollTo = () => {}
Element.prototype.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}

// Enough of a 2D context for CubeView's face-letter textures: every method is a no-op.
HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => {}, set: () => true })
} as unknown as typeof HTMLCanvasElement.prototype.getContext
