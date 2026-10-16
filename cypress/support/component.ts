import { mount } from 'cypress/react'
import '../../src/index.css'
import { prepareWindow } from './common'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

// Components mount into this same window, so it only needs preparing once.
prepareWindow(window)

Cypress.Commands.add('mount', mount)
