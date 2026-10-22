// @vitest-environment jsdom
import '../test/dom'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatMoves, invertMoves, parseMoves } from '../cube/moves'
import { SOLVED, applyMoves } from '../cube/state'
import { say } from '../i18n/locale'
import type { Segment } from '../solver/solver'
import { FakeCubeView } from '../test/FakeCubeView'
import { SPEED_MS, usePlayer, type Player } from './usePlayer'

const renderer = vi.hoisted(() => ({ downloading: false }))
vi.mock('../three/loadCubeView', () => ({ cubeViewDownloading: () => renderer.downloading }))

const seg = (stage: number, moves: string): Segment => ({ stage, kind: 'algorithm', text: say('makeRoom'), moves: parseMoves(moves) })

// Moves 0–2 are Step 1, Step 2 has nothing to do, and moves 3–4 are Step 3. The solution ends solved.
const SEGMENTS = [seg(1, 'y U'), seg(1, 'F'), seg(3, "L'"), seg(3, 'U2')]
const START = applyMoves(SOLVED, invertMoves(SEGMENTS.flatMap((s) => s.moves)))

function setup({ holdTurns = false, autoplayAfter }: { holdTurns?: boolean; autoplayAfter?: number } = {}) {
  const hook = renderHook(() => usePlayer())
  const view = new FakeCubeView()
  view.holdTurns = holdTurns
  act(() => hook.result.current.attach(view.asView()))
  act(() => hook.result.current.load(START, SEGMENTS, autoplayAfter))
  return { view, player: () => hook.result.current }
}

/** Run a player action and wait for the turns it plays. */
const run = (action: () => unknown) =>
  act(async () => {
    await action()
  })

describe('usePlayer', () => {
  it('shows a solved cube and ignores the controls until a solution is loaded', async () => {
    const { result } = renderHook(() => usePlayer())
    const view = new FakeCubeView()
    view.state = START
    act(() => result.current.attach(view.asView()))
    expect(result.current.timeline).toBeNull()
    expect(result.current.state).toBe(SOLVED)
    expect(view.state).toBe(SOLVED)
    expect(view.filter).toBeNull()

    await run(() => result.current.play())
    await run(() => result.current.stepForward())
    act(() => result.current.seek(3))
    expect(view.animated).toEqual([])
    expect(result.current.pos).toBe(0)
  })

  it('loads a solution at its start and grays out what the first step ignores', () => {
    const { view, player } = setup()
    expect(player().pos).toBe(0)
    expect(player().state).toBe(START)
    expect(view.state).toBe(START)
    expect(view.filter?.(['W', 'R'], 'R')).toBe(true)
    expect(view.filter?.(['W', 'R', 'B'], 'W')).toBe(false)
  })

  it('plays one step at a time when pausing after each step', async () => {
    const { view, player } = setup()
    await run(() => player().play())
    expect(player().pos).toBe(3)
    expect(player().playing).toBe(false)
    expect(formatMoves(view.animated)).toBe('y U F')
    expect(view.state).toBe(player().timeline!.states[3])
    // Step 3 brings the white corners into color.
    expect(view.filter?.(['W', 'R', 'B'], 'W')).toBe(true)

    await run(() => player().play())
    expect(player().pos).toBe(5)
    expect(view.state).toBe(SOLVED)
    expect(view.filter).toBeNull()
  })

  it('plays to the end without pausing when asked, timing each turn by the speed', async () => {
    const { view, player } = setup()
    act(() => {
      player().setPauseAtSteps(false)
      player().setSpeed(5)
    })
    await run(() => player().play())
    expect(player().pos).toBe(5)
    const quarter = SPEED_MS[4]
    // Whole-cube turns and half turns get a little longer.
    expect(view.durations).toEqual([quarter * 1.15, quarter, quarter, quarter, quarter * 1.45])
  })

  it('starts again from the beginning when played at the end', async () => {
    const { view, player } = setup()
    act(() => player().seek(5))
    await run(() => player().toggle())
    expect(player().pos).toBe(3)
    expect(formatMoves(view.animated)).toBe('y U F')
  })

  it('steps forward and back one move at a time', async () => {
    const { view, player } = setup()
    await run(() => player().stepForward())
    expect(player().pos).toBe(1)
    await run(() => player().stepBack())
    expect(player().pos).toBe(0)
    expect(formatMoves(view.animated)).toBe("y y'")
    expect(view.state).toBe(START)

    // Nothing before the start or after the end.
    await run(() => player().stepBack())
    act(() => player().seek(5))
    await run(() => player().stepForward())
    expect(view.animated).toHaveLength(2)
  })

  it('seeks to any position, kept within the solution', () => {
    const { view, player } = setup()
    act(() => player().seek(4))
    expect(player().pos).toBe(4)
    expect(view.state).toBe(player().timeline!.states[4])
    act(() => player().seek(99))
    expect(player().pos).toBe(5)
    act(() => player().seek(-3))
    expect(player().pos).toBe(0)
  })

  it('jumps between steps and parts, skipping steps with nothing to do', () => {
    const { player } = setup()
    const from = (p: number, action: (player: Player) => void) => {
      act(() => player().seek(p))
      act(() => action(player()))
      return player().pos
    }
    expect(from(0, (p) => p.nextStage())).toBe(3)
    expect(from(3, (p) => p.nextStage())).toBe(5)
    expect(from(5, (p) => p.nextStage())).toBe(5)

    expect(from(5, (p) => p.prevStage())).toBe(3)
    expect(from(4, (p) => p.prevStage())).toBe(3)
    expect(from(3, (p) => p.prevStage())).toBe(0)
    expect(from(0, (p) => p.prevStage())).toBe(0)

    expect(from(0, (p) => p.seekStage(2))).toBe(3)
    expect(from(5, (p) => p.seekStage(1))).toBe(0)
    expect(from(0, (p) => p.seekStage(8))).toBe(5)

    // The start of the current part, or of the one before when already there.
    expect(from(1, (p) => p.prevSegment())).toBe(0)
    expect(from(2, (p) => p.prevSegment())).toBe(0)
    expect(from(3, (p) => p.prevSegment())).toBe(2)
    expect(from(5, (p) => p.prevSegment())).toBe(4)
  })

  it('plays the rest of the current part', async () => {
    const { view, player } = setup()
    await run(() => player().nextSegment())
    expect(player().pos).toBe(2)
    await run(() => player().nextSegment())
    expect(player().pos).toBe(3)
    act(() => player().seek(5))
    await run(() => player().nextSegment())
    expect(player().pos).toBe(5)
    expect(formatMoves(view.animated)).toBe('y U F')
  })

  it('lets the current turn finish after pausing, then stops', async () => {
    const { view, player } = setup({ holdTurns: true })
    let playing: Promise<void> | undefined
    act(() => {
      playing = player().play()
    })
    expect(player().playing).toBe(true)
    act(() => player().pause())
    expect(player().playing).toBe(false)
    await act(async () => {
      view.finishTurn()
      await playing
    })
    expect(player().pos).toBe(1)
    expect(view.isBusy()).toBe(false)
    expect(view.animated).toHaveLength(1)
  })

  it('carries on playing when play is pressed again before the paused turn has finished', async () => {
    const { view, player } = setup({ holdTurns: true })
    let playing: Promise<void> | undefined
    act(() => {
      playing = player().play()
    })
    act(() => player().pause())
    act(() => {
      player().play()
    })
    expect(player().playing).toBe(true)
    await act(async () => view.finishTurn())
    await act(async () => view.finishTurn())
    await act(async () => {
      view.finishTurn()
      await playing
    })
    // It plays on to the end of Step 1, as if it had never paused.
    expect(formatMoves(view.animated)).toBe('y U F')
    expect(player().pos).toBe(3)
    expect(player().playing).toBe(false)
  })

  it.each(['stepForward', 'stepBack', 'nextSegment', 'toggle'] as const)('pauses instead when %s is used while playing', async (control) => {
    const { view, player } = setup({ holdTurns: true })
    act(() => player().seek(1))
    let playing: Promise<void> | undefined
    act(() => {
      playing = player().play()
    })
    await run(() => player()[control]())
    expect(player().playing).toBe(false)
    await act(async () => {
      view.finishTurn()
      await playing
    })
    expect(player().pos).toBe(2)
    expect(view.animated).toHaveLength(1)
  })

  it('drops the running turn when seeking', async () => {
    const { view, player } = setup({ holdTurns: true })
    let stepping: Promise<void> | undefined
    act(() => {
      stepping = player().stepForward()
    })
    act(() => player().seek(4))
    await act(async () => {
      await stepping
    })
    expect(player().pos).toBe(4)
    expect(view.state).toBe(player().timeline!.states[4])
  })

  it('stops playing when the cube view goes away, and a new view picks up where it was', async () => {
    const { view, player } = setup({ holdTurns: true })
    act(() => {
      player().setLabels(true)
      player().setFlipped(true)
    })
    expect(view.labels).toBe(true)
    expect(view.flipped).toBe(true)

    let playing: Promise<void> | undefined
    act(() => {
      playing = player().play()
    })
    act(() => player().attach(null))
    expect(player().playing).toBe(false)
    await act(async () => {
      view.dispose()
      await playing
    })
    expect(player().pos).toBe(0)

    const next = new FakeCubeView()
    act(() => player().attach(next.asView()))
    expect(next.state).toBe(START)
    expect(next.labels).toBe(true)
    expect(next.flipped).toBe(true)
    expect(next.filter).not.toBeNull()
  })

  it('resets the camera and keeps the speed between 1 and 5', () => {
    const { view, player } = setup()
    act(() => player().resetCamera())
    expect(view.cameraResets).toBe(1)
    act(() => player().setSpeed(9))
    expect(player().speed).toBe(5)
    act(() => player().setSpeed(0))
    expect(player().speed).toBe(1)
  })
})

describe('usePlayer auto-play after loading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  const wait = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms)
    })

  it('starts playing once the delay has passed', () => {
    const { view, player } = setup({ holdTurns: true, autoplayAfter: 450 })
    wait(449)
    expect(view.animated).toHaveLength(0)
    wait(1)
    expect(player().playing).toBe(true)
    expect(formatMoves(view.animated)).toBe('y')
  })

  it.each([
    ['seeking', (p: Player) => p.seek(2)],
    ['pausing', (p: Player) => p.pause()],
    ['jumping to a step', (p: Player) => p.nextStage()],
    ['stepping back', (p: Player) => p.stepBack()],
  ])('is cancelled by %s first', (_, action) => {
    const { view, player } = setup({ holdTurns: true, autoplayAfter: 450 })
    act(() => {
      action(player())
    })
    wait(450)
    expect(player().playing).toBe(false)
    expect(view.animated).toHaveLength(0)
  })

  it('is cancelled by stepping forward first', async () => {
    const { view, player } = setup({ holdTurns: true, autoplayAfter: 450 })
    let stepping: Promise<void> | undefined
    act(() => {
      stepping = player().stepForward()
    })
    await act(async () => {
      view.finishTurn()
      await stepping
    })
    wait(450)
    expect(player().pos).toBe(1)
    expect(view.animated).toHaveLength(1)
  })

  it('is cancelled by leaving the page, even after coming back before the delay ends', () => {
    const { player } = setup({ holdTurns: true, autoplayAfter: 450 })
    act(() => player().attach(null))
    const next = new FakeCubeView()
    next.holdTurns = true
    act(() => player().attach(next.asView()))
    wait(450)
    expect(player().playing).toBe(false)
    expect(next.animated).toHaveLength(0)
  })

  it('is replaced when something else is loaded', () => {
    const { view, player } = setup({ holdTurns: true, autoplayAfter: 450 })
    wait(300)
    act(() => player().load(START, SEGMENTS.slice(2), 450))
    wait(200)
    expect(view.animated).toHaveLength(0)
    wait(250)
    expect(formatMoves(view.animated)).toBe("L'")
  })
})

describe('usePlayer before the cube has downloaded', () => {
  beforeEach(() => {
    renderer.downloading = true
  })
  afterEach(() => {
    renderer.downloading = false
  })

  function setupWithoutView() {
    const hook = renderHook(() => usePlayer())
    act(() => hook.result.current.load(START, SEGMENTS))
    let playing: Promise<void> | undefined
    act(() => {
      playing = hook.result.current.play()
    })
    return { player: () => hook.result.current, playing: () => playing }
  }

  it('plays once the cube is here', async () => {
    const { player, playing } = setupWithoutView()
    expect(player().playing).toBe(true)

    const view = new FakeCubeView()
    await act(async () => {
      player().attach(view.asView())
      await playing()
    })
    expect(formatMoves(view.animated)).toBe('y U F')
    expect(player().pos).toBe(3)
    expect(player().playing).toBe(false)
  })

  it('can be paused while waiting', async () => {
    const { player, playing } = setupWithoutView()
    act(() => player().pause())
    expect(player().playing).toBe(false)

    const view = new FakeCubeView()
    await act(async () => {
      player().attach(view.asView())
      await playing()
    })
    expect(view.animated).toEqual([])
    expect(player().pos).toBe(0)
  })

  it('stops waiting when the cube can’t be shown', async () => {
    const { player, playing } = setupWithoutView()
    await act(async () => {
      player().attach(null)
      await playing()
    })
    expect(player().playing).toBe(false)
  })

  it('ignores play when no cube is on its way', async () => {
    renderer.downloading = false
    const { player, playing } = setupWithoutView()
    await act(async () => {
      await playing()
    })
    expect(player().playing).toBe(false)
  })
})
