import { prepareWindow } from './common'

// Runs for every page a test opens, before the page's own scripts. The app picks its language
// from the browser's, so tests start from an English browser wherever they run.
Cypress.on('window:before:load', (win) => {
  prepareWindow(win)
  Object.defineProperty(win.navigator, 'language', { value: 'en-US', configurable: true })
})
