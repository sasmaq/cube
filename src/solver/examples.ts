import { parseMoves } from '../cube/moves'
import { mulberry32, randomScramble } from '../cube/scramble'
import { SOLVED, applyMoves, type CubeState } from '../cube/state'
import { sameGroup, say, type Locale } from '../i18n/locale'
import type { AlgId } from './method'
import { solve, type Segment, type Solution } from './solver'

/** A short, self-contained sequence for the Learn page's demo cube. */
export interface Demo {
  title: (t: Locale) => string
  start: CubeState
  segments: Segment[]
}

/** The moves the Learn page's notation section can show. */
export const DEMO_MOVES = ['F', "F'", 'U', "U'", 'R', "R'", 'L', "L'", 'F2', 'y'] as const
export type DemoMove = (typeof DEMO_MOVES)[number]

/**
 * The cube the Solve page walks through, mixed from solved with yellow on top and blue in front.
 * It was picked because every step has work to do and shows most of its cases: three different
 * daisy moves, all three corner triggers, a dot in Step 5 and a matching pair in Step 7.
 */
export const EXAMPLE_SCRAMBLE = "U' L' F2 R L2 B' L D2 U R2 U' L B D U R2 L' D2 R' U"

export function exampleSolve(): Solution {
  return solve(applyMoves(SOLVED, parseMoves(EXAMPLE_SCRAMBLE)))
}

const SEARCH_SEEDS = 120
const solutions = new Map<number, Solution>()

function sampleSolve(seed: number): Solution {
  let sol = solutions.get(seed)
  if (!sol) {
    sol = solve(applyMoves(SOLVED, randomScramble(25, mulberry32(seed * 7919 + 13))))
    solutions.set(seed, sol)
  }
  return sol
}

function stateBefore(sol: Solution, index: number): CubeState {
  return applyMoves(
    sol.start,
    sol.segments.slice(0, index).flatMap((s) => s.moves),
  )
}

const stageCache = new Map<number, Demo>()

/** A whole step from a real solve. Picks an example that shows several different cases. */
export function stageDemo(stage: number): Demo {
  const cached = stageCache.get(stage)
  if (cached) return cached
  let best: { sol: Solution; first: number; last: number; score: number } | undefined
  for (let seed = 1; seed <= 40; seed++) {
    const sol = sampleSolve(seed)
    const idx = sol.segments.map((s, i) => (s.stage === stage ? i : -1)).filter((i) => i >= 0)
    if (!idx.length) continue
    const segs = idx.map((i) => sol.segments[i])
    const variety = new Set(segs.map((s) => s.alg?.id ?? s.kind)).size
    const length = segs.reduce((a, s) => a + s.moves.length, 0)
    // Prefer variety, but keep the demo reasonably short.
    const score = variety * 10 - length / 6
    if (!best || score > best.score) best = { sol, first: idx[0], last: idx[idx.length - 1], score }
  }
  if (!best) throw new Error(`No example found for step ${stage}`)
  const demo = { title: (t: Locale) => t.common.stepName(stage, t.stages[stage - 1].name), start: stateBefore(best.sol, best.first), segments: best.sol.segments.slice(best.first, best.last + 1) }
  stageCache.set(stage, demo)
  return demo
}

/** One algorithm in context: the group of segments (setup turns + the algorithm) where it first appears. */
export function algorithmDemo(stage: number, algId: AlgId): Demo {
  for (let seed = 1; seed <= SEARCH_SEEDS; seed++) {
    const sol = sampleSolve(seed)
    const i = sol.segments.findIndex((s) => s.stage === stage && s.alg?.id === algId)
    if (i === -1) continue
    const group = sol.segments[i].group
    let first = i
    let last = i
    while (first > 0 && sol.segments[first - 1].stage === stage && sameGroup(sol.segments[first - 1].group, group)) first--
    while (last + 1 < sol.segments.length && sol.segments[last + 1].stage === stage && sameGroup(sol.segments[last + 1].group, group)) last++
    const title = (t: Locale) => `${t.algorithms[algId].name} · ${t.common.step(stage)}`
    return { title, start: stateBefore(sol, first), segments: sol.segments.slice(first, last + 1) }
  }
  throw new Error(`No example found for ${algId}`)
}

/** A single move on a solved cube, for the notation section. */
export function moveDemo(notation: DemoMove): Demo {
  return {
    title: (t) => `${notation.replace("'", '′')} · ${t.moves[notation]}`,
    start: SOLVED,
    segments: [{ stage: 0, kind: 'algorithm', text: say('moveDemo', notation), moves: parseMoves(notation) }],
  }
}
