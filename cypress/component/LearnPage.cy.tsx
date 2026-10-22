import { useState } from 'react'
import { I18nContext, LOCALES } from '../../src/i18n'
import { LearnPage } from '../../src/pages/LearnPage'
import { usePlayer } from '../../src/player/usePlayer'
import type { Demo } from '../../src/solver/examples'

function Learn() {
  const player = usePlayer()
  const [demo, setDemo] = useState<Demo | null>(null)
  return <LearnPage player={player} demo={demo} onDemo={setDemo} onTutorial={() => {}} />
}

describe('Learn page on the real cube', () => {
  beforeEach(() => {
    cy.mount(
      <I18nContext value={LOCALES.en}>
        <Learn />
      </I18nContext>,
    )
  })

  it('plays a picked move on the solved demo cube after a short pause', () => {
    cy.cubePixels()
      .should(({ colors }) => expect(colors.gray, 'gray').to.be.below(0.01))
      .its('hash')
      .then((solved) => {
        cy.contains('button', 'Front face clockwise').click()
        cy.contains('F · Front face clockwise')
        cy.contains('Done! Press play to watch it again')
        cy.cubePixels().its('hash').should('not.equal', solved)
      })
  })

  it('grays out what a step doesn’t need yet while watching it', () => {
    cy.get('#step-1').contains('button', 'Watch this step').click()
    cy.contains('Step 1: The Daisy')
    cy.cubePixels().its('colors.gray').should('be.above', 0.3)
  })
})
