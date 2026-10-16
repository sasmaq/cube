import type { Move } from '../cube/moves'
import { SOLVED, applyMove, type CubeState } from '../cube/state'
import type { CubeView, TileFilter } from '../three/CubeView'

/**
 * Stands in for the three.js CubeView. Turns finish at once, unless `holdTurns` is set: then each
 * turn keeps running until `finishTurn()`, so a test can act while a turn is still on screen.
 */
export class FakeCubeView {
  /** Every view created, newest last. */
  static instances: FakeCubeView[] = []
  /** Makes the next constructor throw, the way CubeView does when WebGL is missing. */
  static failNext = false

  state: CubeState = SOLVED
  animated: Move[] = []
  /** How long each animated turn was asked to take, in milliseconds. */
  durations: number[] = []
  filter: TileFilter | null = null
  labels = false
  flipped = false
  cameraResets = 0
  disposed = false
  holdTurns = false
  private running: { move: Move; resolve: () => void } | null = null

  constructor() {
    if (FakeCubeView.failNext) {
      FakeCubeView.failNext = false
      throw new Error('WebGL is not available')
    }
    FakeCubeView.instances.push(this)
  }

  static latest(): FakeCubeView {
    const view = FakeCubeView.instances.at(-1)
    if (!view) throw new Error('No cube view was created')
    return view
  }

  /** This fake typed as the real thing, for code that takes a CubeView. */
  asView(): CubeView {
    return this as unknown as CubeView
  }

  animate(move: Move, duration: number): Promise<void> {
    this.animated.push(move)
    this.durations.push(duration)
    if (!this.holdTurns) {
      this.state = applyMove(this.state, move)
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.running = { move, resolve }
    })
  }

  finishTurn() {
    const turn = this.running
    if (!turn) throw new Error('No turn is playing')
    this.running = null
    this.state = applyMove(this.state, turn.move)
    turn.resolve()
  }

  isBusy(): boolean {
    return this.running !== null
  }

  setState(state: CubeState) {
    const turn = this.running
    this.running = null
    this.state = state
    turn?.resolve()
  }

  setFilter(filter: TileFilter | null) {
    this.filter = filter
  }

  setLabels(visible: boolean) {
    this.labels = visible
  }

  setFlipped(flipped: boolean) {
    this.flipped = flipped
  }

  resetCamera() {
    this.cameraResets++
  }

  dispose() {
    this.disposed = true
    this.setState(this.state)
  }
}
