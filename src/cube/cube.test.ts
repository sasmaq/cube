import { describe, expect, it } from 'vitest'
import { faceStickerIndex, FACES } from './geometry'
import { formatMoves, invertMoves, parseMoves, simplifyMoves, type Move } from './moves'
import { SOLVED, applyMoves, centerColor, colorFacing, isSolved, pieceAt, type CubeState } from './state'

const run = (alg: string, from: CubeState = SOLVED) => applyMoves(from, parseMoves(alg))
const face = (s: CubeState, f: string) => s.slice(FACES.indexOf(f as never) * 9, FACES.indexOf(f as never) * 9 + 9)

describe('move semantics follow standard notation', () => {
  it('U carries the right face onto the front', () => {
    expect(face(run('U'), 'F').slice(0, 3)).toBe('RRR')
  })
  it('R carries the front face up onto the top', () => {
    const u = face(run('R'), 'U')
    expect([u[2], u[5], u[8]].join('')).toBe('BBB')
  })
  it('F carries the left face up onto the top', () => {
    expect(face(run('F'), 'U').slice(6)).toBe('OOO')
  })
  it('L carries the back face onto the top', () => {
    const u = face(run('L'), 'U')
    expect([u[0], u[3], u[6]].join('')).toBe('GGG')
  })
  it('D carries the left face onto the front', () => {
    expect(face(run('D'), 'F').slice(6)).toBe('OOO')
  })
  it('B carries the right face onto the top', () => {
    expect(face(run('B'), 'U').slice(0, 3)).toBe('RRR')
  })
  it('y brings the right face to the front', () => {
    expect(centerColor(run('y'), 'F')).toBe('R')
    expect(centerColor(run('y'), 'U')).toBe('Y')
  })
})

describe('move algebra', () => {
  it('every move has order four', () => {
    for (const f of ['U', 'D', 'R', 'L', 'F', 'B', 'M', 'E', 'S', 'x', 'y', 'z']) {
      expect(run(`${f} ${f} ${f} ${f}`)).toBe(SOLVED)
      expect(run(`${f} ${f}'`)).toBe(SOLVED)
      expect(run(`${f}2 ${f}2`)).toBe(SOLVED)
    }
  })
  it('the sexy move has order six', () => {
    expect(run("R U R' U' ".repeat(6))).toBe(SOLVED)
    expect(run("R U R' U' ".repeat(3))).not.toBe(SOLVED)
  })
  it('inverting a sequence undoes it', () => {
    const scramble = parseMoves("R U2 F' L D B2 R' U F2 L'")
    expect(applyMoves(applyMoves(SOLVED, scramble), invertMoves(scramble))).toBe(SOLVED)
  })
  it('parses and formats notation, including typographic primes', () => {
    expect(formatMoves(parseMoves('R U’ F2 L2\' y′ (R U R\')'))).toBe("R U' F2 L2 y' R U R'")
  })
  it('rejects unknown moves', () => {
    expect(() => parseMoves('R Q')).toThrow(/Q/)
  })
  it('simplifies adjacent turns', () => {
    const moves: Move[] = parseMoves("U U R R' F F F")
    expect(formatMoves(simplifyMoves(moves))).toBe("U2 F'")
  })
  it('isSolved accepts any whole-cube orientation', () => {
    expect(isSolved(run('y x2 z'))).toBe(true)
    expect(isSolved(run('R'))).toBe(false)
  })
})

/** True when the first two layers (everything below the yellow layer) are solved. */
function firstTwoLayersSolved(s: CubeState) {
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 0; y++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        const p = pieceAt(s, [x, y, z])
        if (!p.stickers.every((st) => centerColor(s, st.face) === st.color)) return false
      }
  return true
}

describe("the method's algorithms", () => {
  it('triggers only disturb one bottom corner slot and keep the cross', () => {
    const afterRight = run("R U R'")
    for (const pos of [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0], [-1, -1, 1], [-1, -1, -1], [1, -1, -1]] as const) {
      const p = pieceAt(afterRight, pos)
      expect(p.stickers.every((st) => centerColor(afterRight, st.face) === st.color)).toBe(true)
    }
  })

  it('Step 6 (R U R\' U R U2 R\') keeps the first two layers', () => {
    expect(firstTwoLayersSolved(run("R U R' U R U2 R'"))).toBe(true)
  })

  it('Step 7: first algorithm + Step 6 algorithm swaps the two right corners when the matching pair is on the left', () => {
    const firstAlg = "L' U R U' L U R'"
    const second = "R U R' U R U2 R'"
    // Work backwards from solved to find the case this combination fixes.
    const setup = applyMoves(SOLVED, invertMoves(parseMoves(`${firstAlg} ${second}`)))
    expect(firstTwoLayersSolved(setup)).toBe(true)
    expect(face(setup, 'U')).toBe('YYYYYYYYY')
    // The two corners on the left face match each other and the left center ("headlights").
    expect(colorFacing(setup, [-1, 1, 1], 'L')).toBe('O')
    expect(colorFacing(setup, [-1, 1, -1], 'L')).toBe('O')
    // The right-hand corners are swapped.
    expect(colorFacing(setup, [1, 1, 1], 'F')).not.toBe('B')
    // After the first algorithm the yellow cross is still there.
    const mid = run(firstAlg, setup)
    const u = face(mid, 'U')
    expect([u[1], u[3], u[4], u[5], u[7]].join('')).toBe('YYYYY')
    expect(run(`${firstAlg} ${second}`, setup)).toBe(SOLVED)
  })

  it('Step 8 (F2 U L R\' F2 L\' R U F2) keeps the back face and cycles the other three top edges', () => {
    const s = run("F2 U L R' F2 L' R U F2")
    expect(face(s, 'B')).toBe('GGGGGGGGG')
    expect(firstTwoLayersSolved(s)).toBe(true)
    // Corners stay put.
    for (const pos of [[1, 1, 1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1]] as const) {
      const p = pieceAt(s, pos)
      expect(p.stickers.every((st) => st.face === 'U' ? st.color === 'Y' : centerColor(s, st.face) === st.color)).toBe(true)
    }
    // Three applications return to solved.
    expect(run("F2 U L R' F2 L' R U F2 ".repeat(3))).toBe(SOLVED)
    expect(faceStickerIndex([0, 1, 1], 'F')).toBe(19)
  })
})
