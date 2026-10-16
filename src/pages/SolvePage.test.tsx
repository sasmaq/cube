// @vitest-environment jsdom
import '../test/dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nContext, LOCALES } from '../i18n'
import { caption, type Lang } from '../i18n/locale'
import { buildTimeline, countTurns, segmentEnd } from '../player/timeline'
import { usePlayer } from '../player/usePlayer'
import { exampleSolve } from '../solver/examples'
import { FakeCubeView } from '../test/FakeCubeView'
import { SolvePage } from './SolvePage'

vi.mock('../three/CubeView', async () => ({ CubeView: (await import('../test/FakeCubeView')).FakeCubeView }))

const { en } = LOCALES
const example = exampleSolve()
const TIMELINE = buildTimeline(example.start, example.segments)
const TURNS = countTurns(TIMELINE.moves)
const STEP_1_PARTS = example.segments.filter((s) => s.stage === 1)

function Solve() {
  const player = usePlayer(TIMELINE)
  return <SolvePage player={player} />
}

function renderSolve(lang: Lang = 'en') {
  render(
    <I18nContext value={LOCALES[lang]}>
      <Solve />
    </I18nContext>,
  )
  return FakeCubeView.latest()
}

const progress = (lang: Lang = 'en') => screen.getByRole<HTMLInputElement>('slider', { name: LOCALES[lang].playback.progress })
const stepper = () => screen.getByRole('navigation', { name: 'Steps' })
/** The "Everything in this step" list. */
const partList = () => screen.getByText('Everything in this step').nextElementSibling as HTMLElement
/** The box explaining the current part. */
const currentPart = () => screen.getByRole('heading', { level: 3 }).parentElement!

const click = (el: Element) =>
  act(async () => {
    fireEvent.click(el)
  })

const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) =>
  act(async () => {
    fireEvent.keyDown(target, { key, ...init })
  })

describe('Solve page', () => {
  it('starts at Step 1 with the whole solution ahead', () => {
    const view = renderSolve()
    expect(view.state).toBe(TIMELINE.start)
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'The Daisy' })).toBeTruthy()
    expect(screen.getByText('Step 1 · The Daisy')).toBeTruthy()
    expect(screen.getByRole('heading', { name: caption(en, example.segments[0].text).title })).toBeTruthy()
    expect(screen.getByText(`0 / ${TURNS} turns`)).toBeTruthy()
    expect(progress().value).toBe('0')
    expect(within(stepper()).getByTitle('Step 1: The Daisy').getAttribute('aria-current')).toBe('step')
    expect(within(partList()).getAllByRole('button')).toHaveLength(STEP_1_PARTS.length)
  })

  it('steps through the solution with the playback buttons', async () => {
    const view = renderSolve()
    await click(screen.getByRole('button', { name: 'Next move' }))
    expect(progress().value).toBe('1')
    expect(view.animated).toEqual([TIMELINE.moves[0].move])

    await click(screen.getByRole('button', { name: 'Previous move' }))
    expect(progress().value).toBe('0')

    await click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Step 2 of 8')).toBeTruthy()
    expect(within(stepper()).getByTitle('Step 2: The White Cross').getAttribute('aria-current')).toBe('step')

    await click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
  })

  it('jumps to a step from the stepper, and celebrates at the end', async () => {
    renderSolve()
    await click(within(stepper()).getByTitle('Step 8: The Yellow Edges'))
    expect(screen.getByText('Step 8 of 8')).toBeTruthy()
    // Nothing is grayed out in the last step, so there's no note about it.
    expect(screen.queryByText(/Gray tiles don’t matter yet/)).toBeNull()

    await act(async () => {
      fireEvent.change(progress(), { target: { value: String(TIMELINE.moves.length) } })
    })
    expect(screen.getByRole('heading', { name: 'Solved!' })).toBeTruthy()
    expect(screen.getByText('Solved')).toBeTruthy()
    expect(screen.getByText(`That took ${TURNS} face turns across all eight steps. Tap any step below to watch it again.`)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next move' })).toHaveProperty('disabled', true)

    await click(screen.getByRole('button', { name: /Watch again/ }))
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
  })

  it('seeks to a part or a move when clicked, and plays the rest of a part', async () => {
    renderSolve()
    // The first part with more than one move, found through its step.
    const k = example.segments.findIndex((s) => s.moves.length > 1)
    const { stage } = example.segments[k]
    const firstOfStep = example.segments.findIndex((s) => s.stage === stage)
    await click(within(stepper()).getByTitle(en.common.stepName(stage, en.stages[stage - 1].name)))
    await click(within(partList()).getAllByRole('button')[k - firstOfStep])
    expect(progress().value).toBe(String(TIMELINE.segStart[k]))

    const [, secondMove] = within(currentPart()).getAllByRole('button')
    await click(secondMove)
    expect(progress().value).toBe(String(TIMELINE.segStart[k] + 1))

    await click(within(currentPart()).getByRole('button', { name: /Play this part/ }))
    await waitFor(() => expect(progress().value).toBe(String(segmentEnd(TIMELINE, k))))
  })

  it('scrolls the step list so the current part stays in view', async () => {
    renderSolve()
    // The current item sits 300px down the list; the list itself is 500px down the page.
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.current === 'true' ? 300 : 500
    })
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo')
    await click(within(partList()).getAllByRole('button')[2])
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 252, behavior: 'smooth' })
  })

  it('steps, skips parts and jumps steps from the keyboard', async () => {
    renderSolve()
    await press('ArrowRight')
    expect(progress().value).toBe('1')
    await press('ArrowLeft')
    expect(progress().value).toBe('0')

    await press('ArrowRight', { shiftKey: true })
    await waitFor(() => expect(progress().value).toBe(String(segmentEnd(TIMELINE, 0))))
    await press('ArrowLeft', { shiftKey: true })
    expect(progress().value).toBe('0')

    await press('ArrowDown', { shiftKey: true })
    expect(screen.getByText('Step 2 of 8')).toBeTruthy()
    await press('ArrowUp', { shiftKey: true })
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
  })

  it('plays and pauses with Space', async () => {
    const view = renderSolve()
    view.holdTurns = true
    await press(' ')
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getByText('Turning')).toBeTruthy()

    await press(' ')
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy()
    await act(async () => view.finishTurn())
    expect(progress().value).toBe('1')
    expect(view.animated).toHaveLength(1)
  })

  it.each([
    ['a focused button', () => screen.getByRole('button', { name: 'Next step' })],
    ['the focused “How this step works” summary', () => screen.getByText('How this step works')],
  ])('leaves Space to %s', async (_, target) => {
    const view = renderSolve()
    await press(' ', {}, target())
    expect(view.animated).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy()
  })

  it('ignores keys typed into inputs or pressed with Ctrl, Alt or Cmd', async () => {
    const view = renderSolve()
    await press('ArrowRight', {}, progress())
    await press('ArrowRight', { ctrlKey: true })
    await press('ArrowRight', { altKey: true })
    await press('ArrowRight', { metaKey: true })
    expect(view.animated).toHaveLength(0)
  })

  it('swaps the arrows in Arabic, so forward follows the reading direction', async () => {
    renderSolve('ar')
    await press('ArrowLeft')
    expect(progress('ar').value).toBe('1')
    await press('ArrowRight')
    expect(progress('ar').value).toBe('0')
  })

  it('turns the cube over, shows face letters and resets the view', async () => {
    const view = renderSolve()
    await click(screen.getByRole('button', { name: 'White on top' }))
    expect(view.flipped).toBe(true)
    expect(screen.getByRole('button', { name: 'White on top' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Upside down: move letters still assume yellow on top')).toBeTruthy()

    await click(screen.getByRole('button', { name: 'Toggle face letters' }))
    expect(view.labels).toBe(true)
    await click(screen.getByRole('button', { name: 'Reset the view' }))
    expect(view.cameraResets).toBe(1)
  })

  it('changes the speed and whether to pause after each step', async () => {
    renderSolve()
    const speed = screen.getByRole<HTMLInputElement>('slider', { name: 'Playback speed' })
    await act(async () => {
      fireEvent.change(speed, { target: { value: '5' } })
    })
    expect(speed.title).toBe('Very fast')

    const pauseAfterStep = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Pause after each step' })
    expect(pauseAfterStep.checked).toBe(true)
    await click(pauseAfterStep)
    expect(pauseAfterStep.checked).toBe(false)
  })

  it('explains itself when WebGL is unavailable, and the rest of the page still works', async () => {
    FakeCubeView.failNext = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Solve />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.cube.webglFailed)
    expect(screen.getByText('Step 1 of 8')).toBeTruthy()
  })
})
