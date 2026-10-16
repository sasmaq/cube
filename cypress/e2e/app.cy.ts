import { LOCALES } from '../../src/i18n'
import type { Lang } from '../../src/i18n/locale'

const { en, ar } = LOCALES
const tab = (name: string) => cy.contains('[role=tab]', name)

describe('The app', () => {
  it('opens on the Solve page with the cube drawn', () => {
    cy.visit('/')
    cy.title().should('equal', 'Cube')
    tab('Solve').should('have.attr', 'aria-selected', 'true')
    cy.readFile('package.json')
      .its('version')
      .then((version) => cy.contains(`v${version}`))
    cy.contains('Step 1 of 8')
    cy.cubePixels().should(({ drawn, colors }) => {
      expect(drawn, 'canvas covered by the cube').to.be.above(0.05)
      expect(colors.gray, 'gray').to.be.above(0.3)
    })
  })

  it('moves between pages with the tabs, the logo and the back button', () => {
    cy.visit('/')
    tab('Learn').click()
    cy.location('hash').should('equal', '#learn')
    cy.contains('h2', 'Get to know your cube')

    cy.go('back')
    cy.contains('Step 1 of 8')
    cy.go('forward')
    cy.contains('h2', 'Get to know your cube')

    cy.contains('header a', 'Cube').click()
    cy.contains('Step 1 of 8')
  })

  it('remembers dark mode and the language after a reload', () => {
    // Every load in this test sees a system that prefers light, so only the saved choice can make it dark.
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'matchMedia').returns({ matches: false })
    })
    cy.visit('/')
    cy.get('html').should('have.attr', 'data-theme', 'winter')
    // The checkbox itself is hidden behind the sun and moon icons.
    cy.get(`label[title="${en.app.toggleDarkMode}"]`).click()
    cy.get(`button[aria-label="${en.app.otherLanguage.title}"]`).click()
    cy.get('html').should('have.attr', 'dir', 'rtl')

    cy.reload()
    cy.get('html').should('have.attr', 'data-theme', 'night').and('have.attr', 'lang', 'ar').and('have.attr', 'dir', 'rtl')
    cy.title().should('equal', ar.app.name)
    cy.contains(ar.common.stepOf(1))
    cy.get('input[aria-label="Dark mode"]').should('not.exist')
    cy.get(`input[aria-label="${ar.app.darkMode}"]`).should('be.checked')
  })

  it('sets the theme and language before the app runs, so the page never flashes', () => {
    // With the app's scripts held back, only the inline script in index.html can set these.
    cy.intercept({ pathname: /^\/assets\/.+\.js$/ }, { body: '', headers: { 'content-type': 'text/javascript' } })

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('theme', 'night')
        win.localStorage.setItem('lang', 'ar')
      },
    })
    cy.get('#root').should('be.empty')
    cy.get('html').should('have.attr', 'data-theme', 'night').and('have.attr', 'lang', 'ar').and('have.attr', 'dir', 'rtl')

    // With nothing saved, it follows the browser's language and color scheme.
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        Object.defineProperty(win.navigator, 'language', { value: 'ar-SA' })
        cy.stub(win, 'matchMedia').callsFake((query: string) => ({ matches: query === '(prefers-color-scheme: dark)' }))
      },
    })
    cy.get('#root').should('be.empty')
    cy.get('html').should('have.attr', 'data-theme', 'night').and('have.attr', 'lang', 'ar').and('have.attr', 'dir', 'rtl')
  })

  for (const lang of ['en', 'ar'] as Lang[]) {
    const t = LOCALES[lang]
    it(`fits a phone screen in ${lang === 'en' ? 'English' : 'Arabic'}`, () => {
      cy.viewport('iphone-x')
      cy.visit('/', { onBeforeLoad: (win) => win.localStorage.setItem('lang', lang) })
      cy.get('html').should('have.attr', 'dir', t.dir)

      // Nothing sticks out sideways, and the steps stay in reach at the bottom of the screen.
      const fits = () => cy.get('html').should(([html]) => expect(html.scrollWidth, 'page width').to.be.at.most(html.clientWidth))
      fits()
      cy.get(`nav[aria-label="${t.panel.steps}"]`).should(([nav]) => {
        const { top, bottom } = nav.getBoundingClientRect()
        expect(top, 'steps top').to.be.at.least(0)
        expect(bottom, 'steps bottom').to.be.at.most(nav.ownerDocument.documentElement.clientHeight)
      })
      cy.cubePixels().its('clipped').should('equal', false)

      tab(t.app.learn).click()
      cy.contains('h2', t.learn.basicsTitle)
      fits()
    })
  }
})
