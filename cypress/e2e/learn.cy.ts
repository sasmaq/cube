describe('Learning the method', () => {
  it('opens from a link and plays a move on the demo cube', () => {
    cy.visit('/#learn')
    cy.contains('[role=tab]', 'Learn').should('have.attr', 'aria-selected', 'true')
    cy.contains('Demo cube')
    cy.cubePixels()
      .its('hash')
      .then((solved) => {
        cy.contains('button', 'Front face clockwise').click()
        cy.contains('Done! Press play to watch it again')
        cy.cubePixels().its('hash').should('not.equal', solved)
      })
  })

  it('watches a step and pauses it', () => {
    cy.visit('/#learn')
    cy.get('#step-5').contains('button', 'Watch this step').click()
    cy.contains('Step 5: The Yellow Cross')
    cy.get('button[aria-label="Pause"]').click()
    cy.get('button[aria-label="Play"]').should('exist')
    cy.get('input[aria-label="Solution progress"]').should(([input]) => expect(Number((input as HTMLInputElement).value)).to.be.above(0))
  })

  it('takes the tutorial again, then comes back to the Learn page', () => {
    cy.visit('/#learn')
    cy.contains('button', 'Start tutorial').click()
    cy.contains('Tutorial · 1 of 5')
    cy.cubePixels().its('drawn').should('be.above', 0.05)
    cy.contains('button', 'Skip tutorial').click()
    cy.location('hash').should('equal', '#learn')
    cy.contains('h2', 'Get to know your cube')
    // Seen once, the tutorial doesn't come back on its own.
    cy.reload()
    cy.contains('h2', 'Get to know your cube')
  })

  it('brings the demo cube into view on a phone', () => {
    cy.viewport('iphone-x')
    cy.visit('/#learn')
    cy.get('#step-8').scrollIntoView()
    cy.get('.cube-stage').should(([stage]) => expect(stage.getBoundingClientRect().bottom, 'bottom').to.be.below(0))

    cy.get('#step-8').contains('button', 'Watch this step').click()
    cy.contains('Step 8: The Yellow Edges')
    // It scrolls smoothly, so this retries until the cube has arrived.
    cy.get('.cube-stage').should(([stage]) => {
      const { top, bottom } = stage.getBoundingClientRect()
      expect(top, 'top').to.be.at.least(0)
      expect(bottom, 'bottom').to.be.at.most(stage.ownerDocument.documentElement.clientHeight)
    })
  })
})
