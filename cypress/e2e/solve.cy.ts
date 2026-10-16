const progress = () => cy.get('input[aria-label="Solution progress"]')
const button = (label: string) => cy.get(`button[aria-label="${label}"]`)
const steps = () => cy.get('nav[aria-label="Steps"]')

describe('Solving the example cube', () => {
  beforeEach(() => cy.visit('/'))

  it('plays the first step with the space bar and stops before the next one', () => {
    cy.contains(/^0 \/ \d+ turns$/)
    cy.get('input[aria-label="Playback speed"]').setSlider(5)
    cy.get('body').type(' ')
    button('Pause').should('exist')
    cy.contains('Turning')

    cy.contains('Step 2 of 8', { timeout: 15_000 })
    button('Play').should('exist')
    steps().find('[aria-current=step]').should('have.attr', 'title', 'Step 2: The White Cross')
    cy.contains(/^0 \/ \d+ turns$/).should('not.exist')
  })

  it('skips to the end, shows the solved cube, and starts over', () => {
    steps().find('[title="Step 8: The Yellow Edges"]').click()
    cy.contains('Step 8 of 8')
    button('Next step').click()
    cy.contains('h2', 'Solved!')
    cy.cubePixels().should(({ colors }) => {
      expect(colors.gray, 'gray').to.be.below(0.01)
      expect(colors.yellow, 'yellow').to.be.above(0.1)
    })

    cy.contains('button', 'Watch again').click()
    cy.contains('Step 1 of 8')
    progress().should('have.value', '0')
    cy.cubePixels().its('colors.gray').should('be.above', 0.3)
  })

  it('keeps its place, and the same picture, while the Learn page is open', () => {
    button('Next move').click()
    progress().should('have.value', '1')
    cy.cubePixels()
      .its('hash')
      .then((hash) => {
        cy.contains('[role=tab]', 'Learn').click()
        cy.contains('h2', 'Get to know your cube')
        cy.contains('[role=tab]', 'Solve').click()
        progress().should('have.value', '1')
        cy.cubePixels().its('hash').should('equal', hash)
      })
  })
})
