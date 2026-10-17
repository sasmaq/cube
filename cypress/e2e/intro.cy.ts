import { LOCALES } from '../../src/i18n'
import type { Lang } from '../../src/i18n/locale'

const { en } = LOCALES
const status = () => cy.get('[role=status]')
const tutorialCard = () => cy.contains('button', en.tutorial.skip).closest('.card')

/** Nothing sticks out sideways, so the page never scrolls that way. */
const fits = () => cy.get('html').should(([html]) => expect(html.scrollWidth, 'page width').to.be.at.most(html.clientWidth))

/** The whole element is on screen without scrolling. */
const onScreen = ([el]: JQuery<HTMLElement>) => {
  const { top, bottom } = el.getBoundingClientRect()
  expect(top, 'top').to.be.at.least(0)
  expect(bottom, 'bottom').to.be.at.most(el.ownerDocument.documentElement.clientHeight)
}

describe('A first visit', { expose: { intro: true } }, () => {
  it('welcomes, runs the tutorial, then opens the app from then on', () => {
    cy.visit('/')
    cy.contains('h1', en.welcome.title)
    cy.get('[role=tab]').should('not.exist')
    cy.get('canvas').should('not.exist')
    cy.contains('button', en.welcome.start).click()

    // The tutorial card sits under the cube, with both on screen, and keeps its height from step to step.
    cy.contains(en.tutorial.progress(1, 5))
    tutorialCard()
      .should(onScreen)
      .then(([card]) => {
        const { top, height } = card.getBoundingClientRect()
        cy.get('canvas').should(([canvas]) => expect(canvas.getBoundingClientRect().bottom, 'cube bottom').to.be.at.most(top))
        cy.wrap(height).as('cardHeight')
      })
    cy.cubePixels().its('drawn').should('be.above', 0.05)
    cy.dragCube()
    status().should('have.text', en.tutorial.didIt)
    cy.contains('button', en.tutorial.next).click()

    cy.wheelCube(400)
    status().should('have.text', en.tutorial.didIt)
    cy.contains('button', en.tutorial.next).click()

    for (const label of [en.cube.whiteOnTop, en.cube.toggleLetters, en.cube.resetView]) {
      status().should('have.text', en.tutorial.tryIt)
      cy.get<number>('@cardHeight').then((height) => tutorialCard().should(([card]) => expect(card.getBoundingClientRect().height, 'card height').to.equal(height)))
      cy.get(`button[aria-label="${label}"]`).should('have.class', 'tutorial-spot').click()
      status().should('have.text', en.tutorial.didIt)
      cy.contains('button', label === en.cube.resetView ? en.tutorial.finish : en.tutorial.next).click()
    }

    cy.contains('[role=tab]', 'Solve').should('have.attr', 'aria-selected', 'true')
    cy.contains('Step 1 of 8')
    // The Solve page has a cube of its own, not the one from the tutorial.
    cy.get('button[aria-label="White on top"]').should('have.attr', 'aria-pressed', 'false')

    cy.reload()
    cy.contains('Step 1 of 8')
    cy.contains('h1', en.welcome.title).should('not.exist')
  })

  it('welcomes again until the tutorial is finished or skipped, then opens the page that was asked for', () => {
    cy.visit('/#learn')
    cy.contains('button', en.welcome.start).click()
    cy.contains(en.tutorial.progress(1, 5))
    cy.reload()
    cy.contains('h1', en.welcome.title)

    cy.contains('button', en.welcome.start).click()
    cy.contains('button', en.tutorial.skip).click()
    cy.location('hash').should('equal', '#learn')
    cy.contains('h2', 'Get to know your cube')
    cy.reload()
    cy.contains('h2', 'Get to know your cube')
  })

  for (const [width, height] of [
    [1600, 900],
    [375, 812],
  ]) {
    it(`keeps the language and dark mode buttons where the app has them, ${width} wide`, () => {
      cy.viewport(width, height)
      cy.visit('/')
      const buttons = () => cy.get(`button[aria-label="${en.app.otherLanguage.title}"], label[title="${en.app.toggleDarkMode}"]`)
      const places = ($els: JQuery<HTMLElement>) => $els.toArray().map((el) => ({ left: el.getBoundingClientRect().left, top: el.getBoundingClientRect().top }))
      cy.contains('h1', en.welcome.title)
      buttons().then(($welcome) => {
        const welcome = places($welcome)
        cy.contains('button', en.welcome.start).click()
        cy.contains(en.tutorial.progress(1, 5))
        buttons().should(($tutorial) => expect(places($tutorial), 'in the tutorial').to.deep.equal(welcome))
        cy.contains('button', en.tutorial.skip).click()
        cy.contains('Step 1 of 8')
        buttons().should(($app) => expect(places($app), 'in the app').to.deep.equal(welcome))
      })
    })
  }

  for (const lang of ['en', 'ar'] as Lang[]) {
    const t = LOCALES[lang]
    it(`keeps the tutorial card one height through every step on the narrowest desktop screen in ${lang === 'en' ? 'English' : 'Arabic'}`, () => {
      cy.viewport(1024, 700)
      cy.visit('/', { onBeforeLoad: (win) => win.localStorage.setItem('lang', lang) })
      cy.contains('button', t.welcome.start).click()
      const card = () => cy.contains('button', t.tutorial.skip).closest('.card')
      card()
        .should(onScreen)
        .then(([first]) => {
          const height = first.getBoundingClientRect().height
          for (let n = 2; n <= 5; n++) {
            cy.contains('button', t.tutorial.next).click()
            cy.contains(t.tutorial.progress(n, 5))
            card().should(([el]) => expect(el.getBoundingClientRect().height, `card height at step ${n}`).to.equal(height))
          }
        })
    })

    it(`fits a phone screen in ${lang === 'en' ? 'English' : 'Arabic'}`, () => {
      cy.viewport('iphone-x')
      cy.visit('/', { onBeforeLoad: (win) => win.localStorage.setItem('lang', lang) })
      cy.get('html').should('have.attr', 'dir', t.dir)
      fits()
      cy.contains('button', t.welcome.start).should(onScreen).click()

      // The cube, its buttons and the whole tutorial card are in view at once, even for the longest step.
      cy.contains('h2', t.tutorial.steps.drag.title)
      fits()
      cy.cubePixels().should(({ drawn, clipped }) => {
        expect(drawn, 'canvas covered by the cube').to.be.above(0.05)
        expect(clipped, 'cut off at the edge').to.equal(false)
      })
      cy.get(`button[aria-label="${t.cube.whiteOnTop}"]`).should(onScreen)
      cy.contains('button', t.tutorial.next).click()
      cy.contains('button', t.tutorial.next).click()
      cy.contains('h2', t.tutorial.steps.flip.title).closest('.card').should(onScreen)
      fits()
    })
  }
})
