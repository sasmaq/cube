import type { Move } from '../cube/moves'
import { applyMove, type CubeState } from '../cube/state'
import type { Segment } from '../solver/solver'

export interface TimelineMove {
  move: Move
  seg: number
}

/** A solution flattened into individual moves, with the cube state before each one. */
export interface Timeline {
  start: CubeState
  segments: Segment[]
  moves: TimelineMove[]
  /** Index of the first move of each segment. */
  segStart: number[]
  /** states[i] is the cube after i moves; states[moves.length] is the end. */
  states: CubeState[]
}

export function buildTimeline(start: CubeState, segments: Segment[]): Timeline {
  const moves: TimelineMove[] = []
  const segStart: number[] = []
  segments.forEach((seg, i) => {
    segStart.push(moves.length)
    for (const move of seg.moves) moves.push({ move, seg: i })
  })
  const states = [start]
  for (const m of moves) states.push(applyMove(states[states.length - 1], m.move))
  return { start, segments, moves, segStart, states }
}

/** Index of the segment that the move at `pos` belongs to (the last one once finished). */
export function segmentAt(t: Timeline, pos: number): number {
  if (t.moves.length === 0) return -1
  return pos < t.moves.length ? t.moves[pos].seg : t.segments.length - 1
}

/** The stage being worked on at `pos`, or 9 once the whole timeline has played. */
export function stageAt(t: Timeline, pos: number): number {
  if (pos >= t.moves.length) return 9
  return t.segments[t.moves[pos].seg].stage
}

export function segmentEnd(t: Timeline, seg: number): number {
  return seg + 1 < t.segStart.length ? t.segStart[seg + 1] : t.moves.length
}

/** First and one-past-last move index for a stage, or null if the stage had nothing to do. */
export function stageRange(t: Timeline, stage: number): [number, number] | null {
  let first = -1
  let last = -1
  t.moves.forEach((m, i) => {
    if (t.segments[m.seg].stage === stage) {
      if (first === -1) first = i
      last = i
    }
  })
  return first === -1 ? null : [first, last + 1]
}

/** Face turns only; whole-cube rotations don't count toward the move total. */
export function countTurns(moves: readonly { move: Move }[] | readonly Move[]): number {
  return moves.filter((m) => {
    const face = 'move' in m ? m.move.face : m.face
    return face !== 'x' && face !== 'y' && face !== 'z'
  }).length
}
