import { describe, expect, it } from 'vitest'
import { parseMoves } from '../cube/moves'
import { SOLVED, applyMoves } from '../cube/state'
import { say } from '../i18n/locale'
import type { Segment } from '../solver/solver'
import { buildTimeline, countTurns, segmentAt, segmentEnd, stageAt, stageRange } from './timeline'

const seg = (stage: number, moves: string): Segment => ({ stage, kind: 'algorithm', text: say('makeRoom'), moves: parseMoves(moves) })

// Step 1 has two parts, Step 2 has nothing to do and Step 3 has one part: five moves in all.
const t = buildTimeline(SOLVED, [seg(1, 'y R'), seg(1, "U R'"), seg(3, 'F2')])

describe('timeline', () => {
  it('flattens the segments into moves, with the cube state before each one', () => {
    expect(t.moves.map((m) => m.seg)).toEqual([0, 0, 1, 1, 2])
    expect(t.segStart).toEqual([0, 2, 4])
    expect(t.states).toHaveLength(6)
    expect(t.states[0]).toBe(SOLVED)
    expect(t.states[3]).toBe(applyMoves(SOLVED, parseMoves('y R U')))
    expect(t.states[5]).toBe(applyMoves(SOLVED, parseMoves("y R U R' F2")))
  })

  it('finds the segment and step at each position, with step 9 once finished', () => {
    const positions = [0, 1, 2, 3, 4, 5]
    expect(positions.map((p) => segmentAt(t, p))).toEqual([0, 0, 1, 1, 2, 2])
    expect(positions.map((p) => stageAt(t, p))).toEqual([1, 1, 1, 1, 3, 9])
    expect([0, 1, 2].map((s) => segmentEnd(t, s))).toEqual([2, 4, 5])
  })

  it('gives each step its range of moves, or null when it had nothing to do', () => {
    expect(stageRange(t, 1)).toEqual([0, 4])
    expect(stageRange(t, 2)).toBeNull()
    expect(stageRange(t, 3)).toEqual([4, 5])
  })

  it('leaves whole-cube turns out of the turn count', () => {
    expect(countTurns(t.moves)).toBe(4)
    expect(countTurns(parseMoves("x R y2 z' U"))).toBe(2)
  })

  it('handles a solution with nothing to do', () => {
    const empty = buildTimeline(SOLVED, [])
    expect(empty.states).toEqual([SOLVED])
    expect(segmentAt(empty, 0)).toBe(-1)
    expect(stageAt(empty, 0)).toBe(9)
    expect(stageRange(empty, 1)).toBeNull()
  })
})
