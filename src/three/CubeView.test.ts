// @vitest-environment jsdom
import '../test/dom'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { parseMove, parseMoves } from '../cube/moves'
import { COLOR_HEX, GRAY_HEX, SOLVED, applyMoves, type Color, type CubeState } from '../cube/state'
import { CubeView } from './CubeView'

// jsdom can't make a WebGL context, so swap in a renderer that only records what it's asked to do.
const renderers = vi.hoisted(() => [] as { render: () => void; loop: ((time: number) => void) | null }[])
vi.mock('three', async (importOriginal) => {
  const three = await importOriginal<typeof import('three')>()
  class FakeRenderer {
    domElement = document.createElement('canvas')
    render = vi.fn()
    loop: ((time: number) => void) | null = null
    constructor() {
      renderers.push(this)
    }
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    setAnimationLoop(loop: ((time: number) => void) | null) {
      this.loop = loop
    }
    dispose() {}
  }
  return { ...three, WebGLRenderer: FakeRenderer }
})

/** The private parts of CubeView these tests look at. */
interface Internals {
  cubies: { home: readonly number[]; group: THREE.Group; stickers: { mesh: THREE.Mesh; index: number }[] }[]
  labels: THREE.Sprite[]
  root: THREE.Group
  camera: THREE.PerspectiveCamera
}

function setup(size?: { width: number; height: number }) {
  const container = document.createElement('div')
  if (size) {
    Object.defineProperty(container, 'clientWidth', { value: size.width })
    Object.defineProperty(container, 'clientHeight', { value: size.height })
  }
  document.body.append(container)
  const view = new CubeView(container)
  const renderer = renderers.at(-1)!
  const tick = (time: number) => renderer.loop?.(time)
  return { view, container, renderer, tick, internals: view as unknown as Internals }
}

const hexOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshStandardMaterial).color
const sameColor = (mesh: THREE.Mesh, hex: string) => hexOf(mesh).equals(new THREE.Color(hex))

function expectColors(internals: Internals, state: CubeState, shown: (index: number) => boolean = () => true) {
  for (const c of internals.cubies) {
    for (const s of c.stickers) {
      const hex = shown(s.index) ? COLOR_HEX[state[s.index] as Color] : GRAY_HEX
      expect(sameColor(s.mesh, hex), `sticker ${s.index}`).toBe(true)
    }
  }
}

function expectAtHome(internals: Internals) {
  for (const c of internals.cubies) {
    expect(c.group.parent).toBe(internals.root)
    expect(c.group.position.toArray()).toEqual([...c.home])
    expect(c.group.quaternion.equals(new THREE.Quaternion())).toBe(true)
  }
}

describe('CubeView', () => {
  it('puts a canvas in the container and colors every sticker from the state', () => {
    const { view, container, internals } = setup()
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(internals.cubies).toHaveLength(26)
    expectColors(internals, SOLVED)

    const state = applyMoves(SOLVED, parseMoves("R U F' L2"))
    view.setState(state)
    expect(view.getState()).toBe(state)
    expectColors(internals, state)
  })

  it('grays out the tiles a filter rejects, and shows them all again without one', () => {
    const { view, internals } = setup()
    const state = applyMoves(SOLVED, parseMoves('R U'))
    view.setState(state)
    view.setFilter((_piece, tile) => tile === 'W')
    expectColors(internals, state, (i) => state[i] === 'W')
    view.setFilter(null)
    expectColors(internals, state)
  })

  it('turns a layer over the given time, then snaps back and shows the new state', async () => {
    const { view, tick, internals } = setup()
    const done = vi.fn()
    view.animate(parseMove('R'), 100).then(done)
    expect(view.isBusy()).toBe(true)

    tick(1000)
    tick(1050)
    const right = internals.cubies.filter((c) => c.home[0] === 1)
    const pivot = right[0].group.parent!
    expect(pivot).not.toBe(internals.root)
    expect(right.every((c) => c.group.parent === pivot)).toBe(true)
    // Halfway through the time is halfway through the eased turn: R is -90° about x.
    expect(pivot.rotation.x).toBeCloseTo(-Math.PI / 4)
    expect(view.getState()).toBe(SOLVED)

    tick(1100)
    await Promise.resolve()
    expect(done).toHaveBeenCalled()
    expect(view.isBusy()).toBe(false)
    expect(view.getState()).toBe(applyMoves(SOLVED, parseMoves('R')))
    expectAtHome(internals)
    expectColors(internals, view.getState())
  })

  it('plays queued turns one after another', () => {
    const { view, tick } = setup()
    view.animate(parseMove('R'), 100)
    view.animate(parseMove("U'"), 100)
    tick(0)
    tick(100)
    expect(view.getState()).toBe(applyMoves(SOLVED, parseMoves('R')))
    tick(150)
    tick(250)
    expect(view.getState()).toBe(applyMoves(SOLVED, parseMoves("R U'")))
    expect(view.isBusy()).toBe(false)
  })

  it('drops running and queued turns when the state is set, and still resolves them', async () => {
    const { view, tick, internals } = setup()
    const running = view.animate(parseMove('R'), 100)
    const queued = view.animate(parseMove('U'), 100)
    tick(0)
    tick(50)
    const state = applyMoves(SOLVED, parseMoves('F'))
    view.setState(state)
    await Promise.all([running, queued])
    expect(view.isBusy()).toBe(false)
    expect(view.getState()).toBe(state)
    expectAtHome(internals)

    tick(200)
    expect(view.getState()).toBe(state)
  })

  it('only renders when something changed', () => {
    const { view, tick, renderer } = setup()
    tick(0)
    expect(renderer.render).toHaveBeenCalledTimes(1)
    tick(16)
    expect(renderer.render).toHaveBeenCalledTimes(1)

    view.setLabels(true)
    tick(32)
    expect(renderer.render).toHaveBeenCalledTimes(2)

    view.animate(parseMove('U'), 100)
    tick(48)
    tick(100)
    tick(148)
    expect(renderer.render).toHaveBeenCalledTimes(5)
    tick(200)
    expect(renderer.render).toHaveBeenCalledTimes(5)
  })

  it('redraws after the camera is reset', () => {
    const { view, tick, renderer, internals } = setup()
    tick(0)
    internals.camera.position.set(0, 0, 15)
    tick(16)
    const renders = vi.mocked(renderer.render).mock.calls.length

    view.resetCamera()
    tick(32)
    expect(renderer.render).toHaveBeenCalledTimes(renders + 1)
    expect(internals.camera.position.distanceTo(new THREE.Vector3(6.3, 5.6, 9.0))).toBeCloseTo(0)
  })

  it('shows face letters on request', () => {
    const { view, internals } = setup()
    expect(internals.labels.every((l) => !l.visible)).toBe(true)
    view.setLabels(true)
    expect(internals.labels.every((l) => l.visible)).toBe(true)
  })

  it('turns the cube upside down smoothly, or at once', () => {
    const { view, tick, internals } = setup()
    view.setFlipped(true)
    tick(0)
    tick(300)
    expect(internals.root.rotation.z).toBeCloseTo(Math.PI / 2)
    tick(600)
    expect(internals.root.rotation.z).toBeCloseTo(Math.PI)

    view.setFlipped(false, false)
    expect(internals.root.rotation.z).toBe(0)
  })

  it('fits the camera to the container, zooming out on tall narrow ones', () => {
    expect(setup({ width: 800, height: 400 }).internals.camera.aspect).toBe(2)
    expect(setup({ width: 800, height: 400 }).internals.camera.zoom).toBe(1)
    expect(setup({ width: 300, height: 600 }).internals.camera.zoom).toBeCloseTo(0.5 / 1.1)
  })

  it('stops, resolves pending turns and removes its canvas when disposed', async () => {
    const { view, container, renderer, tick } = setup()
    const turn = view.animate(parseMove('R'), 100)
    view.dispose()
    await turn
    expect(renderer.loop).toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
    tick(0)
    expect(renderer.render).not.toHaveBeenCalled()
  })
})
