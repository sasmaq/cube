import {
  CORNER_POSITIONS,
  EDGE_POSITIONS,
  FACES,
  FACE_NORMALS,
  STICKERS,
  centerIndex,
  cubieAt,
  faceFromNormal,
  type Face,
  type Vec3,
} from './geometry'
import { parseMoves, permutationOf, type Move } from './moves'

/** Sticker colors: Yellow, White, Blue, Green, Red, Orange. */
export type Color = 'Y' | 'W' | 'B' | 'G' | 'R' | 'O'
export const COLORS: readonly Color[] = ['Y', 'W', 'B', 'G', 'R', 'O']

export const COLOR_HEX: Record<Color, string> = {
  Y: '#ffd500',
  W: '#f4f4f4',
  B: '#0051ba',
  G: '#009e60',
  R: '#c41e3a',
  O: '#ff5800',
}

/** Tiles the current step doesn't care about yet are drawn in this gray. */
export const GRAY_HEX = '#6c6c6c'

/**
 * The cube is held with the yellow center on top and white on the
 * bottom. With the standard color scheme that puts blue in front, red on the right.
 */
export const HOME_CENTERS: Record<Face, Color> = { U: 'Y', R: 'R', F: 'B', D: 'W', L: 'O', B: 'G' }

/** A cube state is 54 color letters in URFDLB facelet order. */
export type CubeState = string

export const SOLVED: CubeState = FACES.map((f) => HOME_CENTERS[f].repeat(9)).join('')

export function applyMove(state: CubeState, m: Move): CubeState {
  const from = permutationOf(m)
  let out = ''
  for (let j = 0; j < 54; j++) out += state[from[j]]
  return out
}

export function applyMoves(state: CubeState, moves: readonly Move[]): CubeState {
  let s = state
  for (const m of moves) s = applyMove(s, m)
  return s
}

/** The 24 ways to hold a cube, as whole-cube rotation sequences. */
export const ORIENTATIONS: readonly Move[][] = ['', 'x', 'x2', "x'", 'z', "z'"].flatMap((a) =>
  ['', 'y', 'y2', "y'"].map((b) => parseMoves(`${a} ${b}`)),
)

export const centersOf = (s: CubeState) => FACES.map((f) => s[centerIndex(f)]).join('')

/** Turn the whole cube so it is held with yellow on top and blue in front. */
export function orientToHome(state: CubeState): CubeState {
  const home = centersOf(SOLVED)
  for (const o of ORIENTATIONS) {
    const s = applyMoves(state, o)
    if (centersOf(s) === home) return s
  }
  return state
}

export function colorAt(state: CubeState, index: number): Color {
  return state[index] as Color
}

export function centerColor(state: CubeState, face: Face): Color {
  return state[centerIndex(face)] as Color
}

/** Which face currently has the given center color. */
export function faceOfCenter(state: CubeState, color: Color): Face {
  for (const f of FACES) if (centerColor(state, f) === color) return f
  throw new Error(`No center is ${color}`)
}

export function isSolved(state: CubeState): boolean {
  for (let f = 0; f < 6; f++) {
    const c = state[f * 9 + 4]
    for (let i = 0; i < 9; i++) if (state[f * 9 + i] !== c) return false
  }
  return true
}

/** A sticker on a cubie: which way it faces and its color. */
export interface PieceSticker {
  face: Face
  color: Color
}

export interface Piece {
  pos: Vec3
  stickers: PieceSticker[]
}

export function pieceAt(state: CubeState, pos: Vec3): Piece {
  return {
    pos,
    stickers: cubieAt(pos).stickers.map((i) => ({ face: STICKERS[i].face, color: state[i] as Color })),
  }
}

/** Color on the cubie at `pos` that faces `face`. */
export function colorFacing(state: CubeState, pos: Vec3, face: Face): Color | undefined {
  const s = pieceAt(state, pos).stickers.find((st) => st.face === face)
  return s?.color
}

/** Which way the given color faces on the cubie at `pos`. */
export function faceOfColor(piece: Piece, color: Color): Face | undefined {
  return piece.stickers.find((s) => s.color === color)?.face
}

function sameColorSet(piece: Piece, colors: readonly Color[]): boolean {
  if (piece.stickers.length !== colors.length) return false
  return colors.every((c) => piece.stickers.some((s) => s.color === c))
}

/** Locate the edge or corner made of exactly these colors. */
export function findPiece(state: CubeState, colors: readonly Color[]): Piece {
  const positions = colors.length === 2 ? EDGE_POSITIONS : CORNER_POSITIONS
  for (const pos of positions) {
    const p = pieceAt(state, pos)
    if (sameColorSet(p, colors)) return p
  }
  throw new Error(`Piece ${colors.join('')} not found`)
}

export function allEdges(state: CubeState): Piece[] {
  return EDGE_POSITIONS.map((p) => pieceAt(state, p))
}

export function allCorners(state: CubeState): Piece[] {
  return CORNER_POSITIONS.map((p) => pieceAt(state, p))
}

/** A piece is solved when each of its stickers matches the center it faces. */
export function isPieceSolved(state: CubeState, piece: Piece): boolean {
  return piece.stickers.every((s) => centerColor(state, s.face) === s.color)
}

/** Face (other than U/D) that a horizontal normal points at; helper for readable code. */
export function sideFaceAt(pos: Vec3, axis: 0 | 2): Face {
  const n: [number, number, number] = [0, 0, 0]
  n[axis] = pos[axis]
  return faceFromNormal(n)
}

export { FACE_NORMALS }
