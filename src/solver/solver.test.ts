import { describe, expect, it } from 'vitest'
import { randomScramble, mulberry32 } from '../cube/scramble'
import { formatMove, parseMoves } from '../cube/moves'
import { SOLVED, applyMoves, isSolved, type Color } from '../cube/state'
import { LOCALES } from '../i18n'
import { caption, groupLabel } from '../i18n/locale'
import { algorithmDemo, exampleSolve, stageDemo } from './examples'
import { STAGES, tileShown } from './method'
import { STAGE_GOALS, solve, type Segment } from './solver'

function stageEndStates(start: string, segments: Segment[]) {
  const ends = new Map<number, string>()
  let s = start
  for (const seg of segments) {
    s = applyMoves(s, seg.moves)
    ends.set(seg.stage, s)
  }
  return ends
}

describe('eight-step solver', () => {
  it('returns nothing to do for a solved cube', () => {
    const sol = solve(SOLVED)
    expect(sol.segments).toHaveLength(0)
  })

  it('solves 2,000 random scrambles and reaches every stage goal in order', () => {
    const random = mulberry32(2026)
    const counts: number[] = []
    for (let n = 0; n < 2000; n++) {
      const start = applyMoves(SOLVED, randomScramble(25, random))
      const sol = solve(start)
      expect(isSolved(applyMoves(start, sol.segments.flatMap((s) => s.moves)))).toBe(true)

      // Stages appear in order, and after each stage its goal (and every earlier goal) holds.
      let state = start
      let lastStage = 0
      for (const seg of sol.segments) {
        expect(seg.stage).toBeGreaterThanOrEqual(lastStage)
        if (seg.stage !== lastStage) {
          for (let g = 0; g < seg.stage - 1; g++) {
            if (g >= 1) expect(STAGE_GOALS[g](state)).toBe(true)
          }
          lastStage = seg.stage
        }
        state = applyMoves(state, seg.moves)
      }
      const ends = stageEndStates(start, sol.segments)
      for (const [stage, s] of ends) expect(STAGE_GOALS[stage - 1](s), `stage ${stage} goal`).toBe(true)
      counts.push(sol.segments.reduce((a, s) => a + s.moves.length, 0))
    }
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    expect(avg).toBeLessThan(260)
    // ~2s alone and ~4s under coverage, so the default 5s is too tight on a busy or slow machine.
  }, 30_000)

  it('only uses F, U, L and R plus whole-cube turns', () => {
    const random = mulberry32(7)
    for (let n = 0; n < 300; n++) {
      const start = applyMoves(SOLVED, randomScramble(25, random))
      for (const seg of solve(start).segments) {
        for (const m of seg.moves) expect('FULRy').toContain(m.face)
      }
    }
  })

  it('follows the method: Step 7 needs at most two rounds and Step 8 at most three algorithms', () => {
    const random = mulberry32(99)
    for (let n = 0; n < 1000; n++) {
      const segs = solve(applyMoves(SOLVED, randomScramble(25, random))).segments
      const step7 = segs.filter((s) => s.stage === 7 && s.alg?.id === 'yellow-corners').length
      const step8 = segs.filter((s) => s.stage === 8 && s.alg?.id === 'yellow-edges').length
      const step5 = segs.filter((s) => s.stage === 5 && s.alg?.id === 'yellow-cross').length
      expect(step7).toBeLessThanOrEqual(2)
      expect(step8).toBeLessThanOrEqual(3)
      expect(step5).toBeLessThanOrEqual(3)
    }
  })

  it('every segment has moves and an explanation in each language', () => {
    const random = mulberry32(11)
    for (let n = 0; n < 200; n++) {
      for (const seg of solve(applyMoves(SOLVED, randomScramble(25, random))).segments) {
        expect(seg.moves.length).toBeGreaterThan(0)
        expect(seg.moves.map(formatMove).join(' ')).not.toContain('undefined')
        for (const t of Object.values(LOCALES)) {
          const { title, detail } = caption(t, seg.text)
          expect(title.length, `${t.lang} ${seg.text.id}`).toBeGreaterThan(3)
          expect(detail.length, `${t.lang} ${seg.text.id}`).toBeGreaterThan(10)
          expect(title + detail).not.toMatch(/undefined|NaN/)
          if (seg.group) expect(groupLabel(t, seg.group)).not.toMatch(/undefined|NaN/)
        }
      }
    }
  })

  it('handles a cube that is not held with yellow on top', () => {
    const start = applyMoves(SOLVED, parseMoves("x R U R' U' F2 z"))
    const sol = solve(start)
    expect(isSolved(sol.end)).toBe(true)
    expect(sol.segments[0].text.id).toBe('holdYellowOnTop')
  })

  it('counts turning the cube over toward the first step with work when the daisy is skipped', () => {
    // Each of these keeps the white cross, so Step 1 has nothing to do.
    for (const [scramble, firstStage] of [["R U R' z", 3], ['U x2', 7], ['x2', 8]] as const) {
      const start = applyMoves(SOLVED, parseMoves(scramble))
      const sol = solve(start)
      expect(sol.segments[0].text.id).toBe('holdYellowOnTop')
      expect(sol.segments[0].stage, scramble).toBe(firstStage)
      for (const [stage, s] of stageEndStates(start, sol.segments)) expect(STAGE_GOALS[stage - 1](s), `${scramble}: stage ${stage} goal`).toBe(true)
    }
  })
})

describe('Solve page example', () => {
  it('has work to do in every step', () => {
    const { segments } = exampleSolve()
    for (let stage = 1; stage <= 8; stage++) expect(segments.some((s) => s.stage === stage), `step ${stage}`).toBe(true)
    expect(segments.filter((s) => s.stage === 5 && s.alg).length, 'starts Step 5 from a dot').toBe(3)
  })
})

describe('Learn page demos', () => {
  it('has an example for every step and every algorithm with a Watch button', () => {
    for (const stage of STAGES) {
      const demo = stageDemo(stage.id)
      expect(demo.segments.every((s) => s.stage === stage.id)).toBe(true)
      const end = applyMoves(demo.start, demo.segments.flatMap((s) => s.moves))
      expect(STAGE_GOALS[stage.id - 1](end), `step ${stage.id} demo reaches its goal`).toBe(true)

      for (const a of stage.algorithms) {
        const d = algorithmDemo(stage.id, a.id)
        expect(d.segments.some((s) => s.alg?.id === a.id), `${a.id} in step ${stage.id}`).toBe(true)
        expect(d.segments.every((s) => s.stage === stage.id)).toBe(true)
        for (const t of Object.values(LOCALES)) expect(d.title(t)).not.toMatch(/undefined|NaN/)
      }
    }
  })
})

describe('graying out by step', () => {
  it('shows centers and white edges in Step 1, and grays out the rest', () => {
    expect(tileShown(1, ['B'], 'B')).toBe(true)
    expect(tileShown(1, ['W', 'R'], 'R')).toBe(true)
    expect(tileShown(1, ['W', 'R', 'B'], 'W')).toBe(false)
    expect(tileShown(1, ['R', 'B'], 'R')).toBe(false)
  })

  it('shows only the yellow tiles while Steps 5 and 6 turn yellow up', () => {
    expect(tileShown(5, ['Y', 'R'], 'Y')).toBe(true)
    expect(tileShown(5, ['Y', 'R'], 'R')).toBe(false)
    expect(tileShown(5, ['Y', 'R', 'B'], 'Y')).toBe(false)
    expect(tileShown(6, ['Y', 'R', 'B'], 'Y')).toBe(true)
    expect(tileShown(6, ['Y', 'R', 'B'], 'R')).toBe(false)
    expect(tileShown(7, ['Y', 'R', 'B'], 'R')).toBe(true)
    expect(tileShown(7, ['Y', 'R'], 'R')).toBe(false)
  })

  it('keeps pieces from earlier steps in color and shows everything in Step 8', () => {
    for (let stage = 3; stage <= 8; stage++) expect(tileShown(stage, ['W', 'R'], 'R')).toBe(true)
    for (let stage = 4; stage <= 8; stage++) expect(tileShown(stage, ['R', 'B'], 'B')).toBe(true)
    for (const piece of [['W', 'R'], ['R', 'B'], ['Y', 'R'], ['Y', 'R', 'B'], ['W', 'R', 'B']] as Color[][]) {
      for (const tile of piece) expect(tileShown(8, piece, tile)).toBe(true)
    }
  })
})
