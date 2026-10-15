import { STICKERS, rotateVec, stickerIndex, type Axis } from './geometry'

/** Face turns, middle slices and whole-cube rotations in standard notation. */
export type MoveFace = 'U' | 'D' | 'R' | 'L' | 'F' | 'B' | 'M' | 'E' | 'S' | 'x' | 'y' | 'z'
export type Amount = 1 | 2 | -1

export interface Move {
  face: MoveFace
  amount: Amount
}

interface MoveDef {
  axis: Axis
  /** Which layer turns: a coordinate along the axis, or null for the whole cube. */
  layer: number | null
  /** Sign of the rotation (about the +axis) that a clockwise turn makes. */
  dir: 1 | -1
}

// Clockwise is judged looking at the named face from outside, so faces on the
// positive side of an axis turn by -90° about it and faces on the negative side by +90°.
export const MOVE_DEFS: Record<MoveFace, MoveDef> = {
  U: { axis: 'y', layer: 1, dir: -1 },
  D: { axis: 'y', layer: -1, dir: 1 },
  E: { axis: 'y', layer: 0, dir: 1 },
  y: { axis: 'y', layer: null, dir: -1 },
  R: { axis: 'x', layer: 1, dir: -1 },
  L: { axis: 'x', layer: -1, dir: 1 },
  M: { axis: 'x', layer: 0, dir: 1 },
  x: { axis: 'x', layer: null, dir: -1 },
  F: { axis: 'z', layer: 1, dir: -1 },
  B: { axis: 'z', layer: -1, dir: 1 },
  S: { axis: 'z', layer: 0, dir: -1 },
  z: { axis: 'z', layer: null, dir: -1 },
}

const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1, z: 2 }

export function isRotation(m: Move): boolean {
  return m.face === 'x' || m.face === 'y' || m.face === 'z'
}

/** Quarter turns about the +axis that this move performs. */
export function quarterTurns(m: Move): number {
  return MOVE_DEFS[m.face].dir * m.amount
}

export function inLayer(m: Move, pos: readonly number[]): boolean {
  const def = MOVE_DEFS[m.face]
  return def.layer === null || pos[AXIS_INDEX[def.axis]] === def.layer
}

/** For each target sticker j, the sticker index whose color lands on j. */
function buildPermutation(m: Move): Int8Array {
  const def = MOVE_DEFS[m.face]
  const q = quarterTurns(m)
  const from = new Int8Array(54)
  for (const s of STICKERS) {
    if (inLayer(m, s.pos)) {
      const j = stickerIndex(rotateVec(s.pos, def.axis, q), rotateVec(s.normal, def.axis, q))
      from[j] = s.index
    } else {
      from[s.index] = s.index
    }
  }
  return from
}

const PERMS = new Map<string, Int8Array>()
for (const face of Object.keys(MOVE_DEFS) as MoveFace[]) {
  for (const amount of [1, 2, -1] as Amount[]) {
    PERMS.set(formatMove({ face, amount }), buildPermutation({ face, amount }))
  }
}

export function permutationOf(m: Move): Int8Array {
  return PERMS.get(formatMove(m))!
}

export function formatMove(m: Move): string {
  return m.face + (m.amount === 2 ? '2' : m.amount === -1 ? "'" : '')
}

/** Display form with a typographic prime, e.g. R′. */
export function prettyMove(m: Move): string {
  return formatMove(m).replace("'", '′')
}

export function formatMoves(moves: readonly Move[]): string {
  return moves.map(formatMove).join(' ')
}

export function invertMove(m: Move): Move {
  return { face: m.face, amount: m.amount === 2 ? 2 : ((-m.amount) as Amount) }
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return moves.map(invertMove).reverse()
}

const MOVE_TOKEN = /^([UDRLFBMESxyz])(2|3)?('|’|‘|`|′)?(2)?$/

/** Parse notation such as "R U R' U2 F2 y'". Accepts typographic primes and trailing "2'". */
export function parseMoves(text: string): Move[] {
  const tokens = text
    .replace(/[()[\],]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  return tokens.map((token) => {
    const match = MOVE_TOKEN.exec(token)
    if (!match) throw new Error(`"${token}" is not a move I recognise`)
    const [, face, num1, prime, num2] = match
    const count = num1 === '3' ? 3 : num1 === '2' || num2 === '2' ? 2 : 1
    let amount: Amount = count === 2 ? 2 : count === 3 ? -1 : 1
    if (prime && amount !== 2) amount = amount === 1 ? -1 : 1
    return { face: face as MoveFace, amount }
  })
}

export function parseMove(text: string): Move {
  const [m] = parseMoves(text)
  return m
}

/** Merge consecutive turns of the same face/rotation (e.g. U U → U2, R R' → nothing). */
export function simplifyMoves(moves: readonly Move[]): Move[] {
  const out: Move[] = []
  for (const m of moves) {
    const last = out[out.length - 1]
    if (last && last.face === m.face) {
      const total = (((last.amount + m.amount) % 4) + 4) % 4
      out.pop()
      if (total === 1) out.push({ face: m.face, amount: 1 })
      else if (total === 2) out.push({ face: m.face, amount: 2 })
      else if (total === 3) out.push({ face: m.face, amount: -1 })
    } else {
      out.push(m)
    }
  }
  return out
}

