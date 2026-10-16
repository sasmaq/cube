import { CubeCanvas } from '../../src/components/CubeCanvas'

// CubeCanvas re-creates its view whenever onReady changes, so it needs a stable function.
const ignoreView = () => {}

/** The canvas fills the div CubeCanvas puts it in, at the screen's resolution (capped at 2×, like CubeView). */
const fitsItsBox = ([canvas]: JQuery<HTMLElement>) => {
  const box = canvas.parentElement!
  expect(canvas.clientWidth, 'width').to.equal(box.clientWidth)
  expect(canvas.clientHeight, 'height').to.equal(box.clientHeight)
  expect((canvas as HTMLCanvasElement).width, 'pixels across').to.equal(Math.floor(box.clientWidth * Math.min(devicePixelRatio, 2)))
}

describe('Cube canvas', () => {
  for (const [width, height] of [
    [640, 360],
    [360, 360],
    [240, 600],
  ]) {
    it(`fills a ${width}×${height} box and keeps the whole solved cube in view`, () => {
      cy.mount(
        <div style={{ position: 'relative', width, height }}>
          <CubeCanvas onReady={ignoreView} className="absolute inset-0" />
        </div>,
      )
      cy.get('canvas').should('have.prop', 'clientWidth', width).and(fitsItsBox)
      // Held with yellow on top, blue in front and red on the right.
      cy.cubePixels().should(({ drawn, clipped, colors }) => {
        expect(clipped, 'cut off at the edge').to.equal(false)
        expect(drawn, 'canvas covered by the cube').to.be.above(0.05)
        for (const shown of ['yellow', 'blue', 'red'] as const) expect(colors[shown], shown).to.be.above(0.1)
        for (const hidden of ['white', 'green', 'orange', 'gray'] as const) expect(colors[hidden], hidden).to.be.below(0.01)
      })
    })
  }

  it('follows its box when the window changes size', () => {
    cy.mount(
      <div style={{ position: 'relative', height: 400 }}>
        <CubeCanvas onReady={ignoreView} className="absolute inset-0" />
      </div>,
    )
    cy.get('canvas').should('have.prop', 'clientWidth', Cypress.config('viewportWidth')).and(fitsItsBox)
    cy.viewport(420, 700)
    cy.get('canvas').should('have.prop', 'clientWidth', 420).and(fitsItsBox)
    cy.cubePixels().should(({ drawn, clipped }) => {
      expect(clipped, 'cut off at the edge').to.equal(false)
      expect(drawn, 'canvas covered by the cube').to.be.above(0.05)
    })
  })
})
