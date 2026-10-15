import type { Amount, Move, MoveFace } from './moves'

/** Small deterministic PRNG so examples can be reproduced from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FACES: MoveFace[] = ['U', 'D', 'R', 'L', 'F', 'B']
const AXIS: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 }
const AMOUNTS: Amount[] = [1, -1, 2]

/** Random-move scramble that never turns the same face twice in a row or the same axis three times. */
export function randomScramble(length = 25, random: () => number = Math.random): Move[] {
  const moves: Move[] = []
  while (moves.length < length) {
    const face = FACES[Math.floor(random() * FACES.length)]
    const last = moves[moves.length - 1]
    const prev = moves[moves.length - 2]
    if (last && last.face === face) continue
    if (last && prev && AXIS[last.face] === AXIS[face] && AXIS[prev.face] === AXIS[face]) continue
    moves.push({ face, amount: AMOUNTS[Math.floor(random() * AMOUNTS.length)] })
  }
  return moves
}
