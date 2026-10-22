// @vitest-environment jsdom
import '../test/dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '../i18n'
import { FakeCubeView } from '../test/FakeCubeView'
import { loadCubeView } from '../three/loadCubeView'
import { TutorialPage } from './TutorialPage'

vi.mock('../three/CubeView', async () => ({ CubeView: (await import('../test/FakeCubeView')).FakeCubeView }))
// Download the renderer up front, so each cube is ready as soon as it's rendered.
beforeAll(async () => {
  await loadCubeView()
})

const { en } = LOCALES

function renderTutorial() {
  const onDone = vi.fn()
  render(<TutorialPage onDone={onDone} />)
  return { onDone, view: FakeCubeView.latest() }
}

const click = (el: Element) =>
  act(async () => {
    fireEvent.click(el)
  })
const button = (name: string) => screen.getByRole('button', { name })
const status = () => screen.getByRole('status').textContent
const next = () => click(button(en.tutorial.next))

/** Presses on `el` and moves `dx` pixels across, then lets go. */
function drag(el: Element, dx: number, pointerId = 1) {
  fireEvent.pointerDown(el, { pointerId, clientX: 100, clientY: 100 })
  fireEvent.pointerMove(el, { pointerId, clientX: 100 + dx, clientY: 100 })
  fireEvent.pointerUp(el, { pointerId, clientX: 100 + dx, clientY: 100 })
}

describe('Tutorial', () => {
  it('starts by asking to drag the cube around', () => {
    const { view } = renderTutorial()
    expect(screen.getByText(en.tutorial.progress(1, 5))).toBeTruthy()
    expect(screen.getByRole('heading', { name: en.tutorial.steps.drag.title })).toBeTruthy()
    expect(screen.getByText(en.tutorial.cube)).toBeTruthy()
    expect(status()).toBe(en.tutorial.tryIt)
    expect(button(en.tutorial.back).hasAttribute('disabled')).toBe(true)
    expect(view.flipped).toBe(false)
  })

  it('notices a drag across the cube, but not a nudge or a press on a button', () => {
    const { view } = renderTutorial()
    drag(view.canvas, 10)
    expect(status()).toBe(en.tutorial.tryIt)
    drag(button(en.cube.resetView), 200)
    expect(status()).toBe(en.tutorial.tryIt)

    // Short moves add up while the pointer stays down.
    fireEvent.pointerDown(view.canvas, { pointerId: 1, clientX: 0, clientY: 0 })
    for (const x of [15, 30, 45]) fireEvent.pointerMove(view.canvas, { pointerId: 1, clientX: x, clientY: 0 })
    expect(status()).toBe(en.tutorial.didIt)
  })

  it('notices zooming with the wheel or a two-finger pinch', async () => {
    const { view } = renderTutorial()
    await next()
    expect(screen.getByRole('heading', { name: en.tutorial.steps.zoom.title })).toBeTruthy()
    fireEvent.wheel(button(en.cube.resetView))
    expect(status()).toBe(en.tutorial.tryIt)
    fireEvent.wheel(view.canvas, { deltaY: -100 })
    expect(status()).toBe(en.tutorial.didIt)

    await click(button(en.tutorial.back))
    await next()
    expect(status(), 'still done after going back and forth').toBe(en.tutorial.didIt)
  })

  it('counts two fingers on the cube as a pinch', async () => {
    const { view } = renderTutorial()
    await next()
    fireEvent.pointerDown(view.canvas, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerDown(view.canvas, { pointerId: 2, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(view.canvas, { pointerId: 2, clientX: 210, clientY: 100 })
    expect(status()).toBe(en.tutorial.didIt)
  })

  it('rings each view button in turn and notices when it is pressed', async () => {
    const { view, onDone } = renderTutorial()
    const flip = button(en.cube.whiteOnTop)
    const letters = button(en.cube.toggleLetters)
    const reset = button(en.cube.resetView)
    const ringed = () => [flip, letters, reset].filter((b) => b.classList.contains('tutorial-spot'))
    expect(ringed()).toEqual([])

    await next()
    await next()
    expect(screen.getByRole('heading', { name: en.tutorial.steps.flip.title })).toBeTruthy()
    expect(ringed()).toEqual([flip])
    await click(flip)
    expect(view.flipped).toBe(true)
    expect(status()).toBe(en.tutorial.didIt)

    await next()
    expect(screen.getByRole('heading', { name: en.tutorial.steps.labels.title })).toBeTruthy()
    expect(ringed()).toEqual([letters])
    expect(status()).toBe(en.tutorial.tryIt)
    await click(letters)
    expect(view.labels).toBe(true)
    expect(status()).toBe(en.tutorial.didIt)

    await next()
    expect(screen.getByRole('heading', { name: en.tutorial.steps.camera.title })).toBeTruthy()
    expect(ringed()).toEqual([reset])
    await click(reset)
    expect(view.cameraResets).toBe(1)
    expect(status()).toBe(en.tutorial.didIt)

    expect(screen.queryByRole('button', { name: en.tutorial.next })).toBeNull()
    expect(onDone).not.toHaveBeenCalled()
    await click(button(en.tutorial.finish))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('lets every step be skipped, and the whole tutorial too', async () => {
    const { onDone } = renderTutorial()
    for (let i = 1; i < 5; i++) {
      expect(status()).toBe(en.tutorial.tryIt)
      await next()
    }
    expect(screen.getByText(en.tutorial.progress(5, 5))).toBeTruthy()
    await click(button(en.tutorial.skip))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
