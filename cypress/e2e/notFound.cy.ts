import { LOCALES } from '../../src/i18n'

const { en, ar } = LOCALES
// Nested, so the page only works if it loads its scripts and styles from the site's root.
const MISSING = '/no/such/page'

describe('The 404 page', () => {
  it('answers an unknown address with a 404 and a way back to the app', () => {
    cy.request({ url: MISSING, failOnStatusCode: false }).its('status').should('equal', 404)

    cy.visit(MISSING, { failOnStatusCode: false })
    cy.title().should('equal', en.notFound.pageTitle)
    cy.contains('h1', en.notFound.title)
    // Laid out by the stylesheet, so it loaded.
    cy.get('main').should('have.css', 'display', 'flex')
    cy.contains('a', en.notFound.home).click()

    cy.location('pathname').should('equal', '/')
    cy.contains('Step 1 of 8')
  })

  it('follows the saved theme and language', () => {
    cy.visit(MISSING, {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        win.localStorage.setItem('theme', 'night')
        win.localStorage.setItem('lang', 'ar')
      },
    })
    cy.get('html').should('have.attr', 'data-theme', 'night').and('have.attr', 'lang', 'ar').and('have.attr', 'dir', 'rtl')
    cy.title().should('equal', ar.notFound.pageTitle)
    cy.contains('h1', ar.notFound.title)
    cy.contains('a', ar.notFound.home)
  })
})
