import { I18nContext, LOCALES } from '../../src/i18n'
import { TutorialPage } from '../../src/pages/TutorialPage'

const { en } = LOCALES
const status = () => cy.get('[role=status]')
const button = (label: string) => cy.get(`button[aria-label="${label}"]`)
const next = () => cy.contains('button', en.tutorial.next).click()

describe('Tutorial on the real cube', () => {
  beforeEach(() => {
    cy.mount(
      <I18nContext value={en}>
        <TutorialPage onDone={cy.stub().as('done')} />
      </I18nContext>,
    )
    // Before the first frame the canvas is blank.
    cy.cubePixels().its('drawn').should('be.above', 0.05)
  })

  it('turns the view when the cube is dragged, and says so', () => {
    status().should('have.text', en.tutorial.tryIt)
    cy.cubePixels().then(({ hash, colors }) => {
      // Solved and seen from the front: yellow on top, and no white or green in view.
      expect(colors.white, 'white').to.be.below(0.01)
      cy.dragCube()
      status().should('have.text', en.tutorial.didIt)
      cy.cubePixels().should((after) => {
        expect(after.hash, 'picture').not.to.equal(hash)
        expect(after.colors.green, 'green, from the side that turned into view').to.be.above(0.05)
      })
    })
  })

  // The cube starts nearly as close as it can get, so this zooms out, where there's room to go.
  it('zooms with the wheel, and says so', () => {
    next()
    cy.contains('h2', en.tutorial.steps.zoom.title)
    cy.cubePixels().then(({ drawn }) => {
      cy.wheelCube(400)
      status().should('have.text', en.tutorial.didIt)
      cy.cubePixels().its('drawn').should('be.below', drawn * 0.8)
    })
  })

  it('rings each view button in turn, and they work', () => {
    next()
    next()
    button(en.cube.whiteOnTop).should('have.class', 'tutorial-spot').click()
    status().should('have.text', en.tutorial.didIt)
    cy.cubePixels().its('colors.white').should('be.above', 0.1)

    next()
    button(en.cube.whiteOnTop).should('not.have.class', 'tutorial-spot')
    button(en.cube.toggleLetters).should('have.class', 'tutorial-spot').click()
    status().should('have.text', en.tutorial.didIt)

    next()
    button(en.cube.toggleLetters).should('not.have.class', 'tutorial-spot')
    button(en.cube.resetView).should('have.class', 'tutorial-spot').click()
    status().should('have.text', en.tutorial.didIt)

    cy.contains('button', en.tutorial.finish).click()
    cy.get('@done').should('have.been.calledOnce')
  })

  // Straight to the last step, with nothing turned over or animating, so the starting picture is settled.
  it('puts the view back exactly after a drag', () => {
    for (let i = 0; i < 4; i++) next()
    cy.contains('h2', en.tutorial.steps.camera.title)
    cy.cubePixels().then(({ hash }) => {
      cy.dragCube()
      cy.cubePixels().its('hash').should('not.equal', hash)
      button(en.cube.resetView).click()
      cy.cubePixels().its('hash').should('equal', hash)
    })
  })
})
