import { I18nContext, LOCALES } from '../../src/i18n'
import { SolvePage } from '../../src/pages/SolvePage'
import { buildTimeline, segmentEnd, stageRange } from '../../src/player/timeline'
import { usePlayer } from '../../src/player/usePlayer'
import { exampleSolve } from '../../src/solver/examples'

const { en } = LOCALES
const example = exampleSolve()
const TIMELINE = buildTimeline(example.start, example.segments)

function Solve() {
  const player = usePlayer(TIMELINE)
  return <SolvePage player={player} />
}

const mountSolve = () =>
  cy.mount(
    <I18nContext value={en}>
      <Solve />
    </I18nContext>,
  )
// Turns play in real time, and CI draws WebGL in software at a couple of frames a second, so a
// single turn there can take seconds. Waits for playback to reach a position get this long.
const PLAYBACK = { timeout: 60_000 }

const progress = (options?: Partial<Cypress.Timeoutable>) => cy.get('input[aria-label="Solution progress"]', options)
const button = (label: string) => cy.get(`button[aria-label="${label}"]`)

describe('Solve page on the real cube', () => {
  beforeEach(mountSolve)

  it('draws the mixed-up cube with the pieces Step 1 doesn’t need grayed out', () => {
    cy.get('[role=alert]').should('not.exist')
    cy.cubePixels().should(({ drawn, clipped, colors }) => {
      expect(drawn, 'canvas covered by the cube').to.be.above(0.05)
      expect(clipped, 'cut off at the edge').to.equal(false)
      expect(colors.gray, 'gray').to.be.above(0.3)
    })
  })

  it('turns the cube and back, leaving exactly the same picture', () => {
    // Until the first frame the canvas is empty, and that picture never comes back.
    cy.cubePixels()
      .should(({ drawn }) => expect(drawn, 'canvas covered by the cube').to.be.above(0.05))
      .its('hash')
      .then((start) => {
        button('Next move').click()
        progress(PLAYBACK).should('have.value', '1')
        cy.cubePixels().its('hash').should('not.equal', start)

        button('Previous move').click()
        progress(PLAYBACK).should('have.value', '0')
        cy.cubePixels().its('hash').should('equal', start)
      })
  })

  it('plays one part in real time and stops at its end', () => {
    const k = example.segments.findIndex((s) => s.moves.length > 1)
    progress().setSlider(TIMELINE.segStart[k])
    cy.contains('button', 'Play this part').click()
    button('Pause').should('exist')
    cy.contains('Turning')
    progress(PLAYBACK).should('have.value', String(segmentEnd(TIMELINE, k)))
    button('Play').should('exist')
  })

  it('pauses at the end of a step when playing', () => {
    const [, step1End] = stageRange(TIMELINE, 1)!
    cy.get('input[aria-label="Playback speed"]').setSlider(5)
    button('Play').click()
    button('Pause').should('exist')
    progress(PLAYBACK).should('have.value', String(step1End))
    button('Play').should('exist')
    cy.contains('Step 2 of 8')
  })

  it('shows the solved cube in full color and turns it over to show white on top', () => {
    progress().setSlider(TIMELINE.moves.length)
    cy.contains('h2', 'Solved!')
    cy.cubePixels().should(({ colors }) => {
      expect(colors.gray, 'gray').to.be.below(0.01)
      expect(colors.yellow, 'yellow').to.be.above(0.1)
      expect(colors.white, 'white').to.be.below(0.01)
    })

    cy.get('button[aria-label="White on top"]').click()
    cy.cubePixels().should(({ colors }) => {
      expect(colors.yellow, 'yellow').to.be.below(0.01)
      expect(colors.white, 'white').to.be.above(0.1)
    })

    cy.get('button[aria-label="White on top"]').click()
    cy.cubePixels().its('colors.yellow').should('be.above', 0.1)
  })
})

describe('Solve page without WebGL', () => {
  it('explains itself, and the rest of the page still works', () => {
    const getContext = HTMLCanvasElement.prototype.getContext
    cy.stub(HTMLCanvasElement.prototype, 'getContext').callsFake(function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...(rest as [undefined]))
    })
    cy.stub(console, 'error').as('consoleError')
    mountSolve()
    cy.get('[role=alert]').should('have.text', en.cube.webglFailed)
    cy.get('@consoleError').should('have.been.called')
    button('Next step').click()
    cy.contains('Step 2 of 8')
  })
})
