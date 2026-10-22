/**
 * Sticker geometry shared by the cube logic and the three.js renderer.
 *
 * Coordinates match three.js: +x is right, +y is up, +z points at the viewer
 * (the front face). Every cubie sits on an integer grid position in {-1,0,1}^3
 * and every sticker has an outward normal along one axis.
 *
 * Facelet indices follow the common URFDLB layout: face index * 9 + (row * 3 + col),
 * where rows/cols are read while looking straight at that face (U is viewed with
 * F at the bottom, D with F at the top).
 */

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
export type Vec3 = readonly [number, number, number]
export type Axis = 'x' | 'y' | 'z'

export const FACES: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

export const FACE_NORMALS: Record<Face, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

/** The four faces around the vertical axis, in the order a U turn carries stickers (F → L → B → R). */
export const SIDE_FACES: readonly Face[] = ['F', 'R', 'B', 'L']

function localIndex(face: Face, [x, y, z]: Vec3): number {
  switch (face) {
    case 'U':
      return (z + 1) * 3 + (x + 1)
    case 'D':
      return (1 - z) * 3 + (x + 1)
    case 'F':
      return (1 - y) * 3 + (x + 1)
    case 'B':
      return (1 - y) * 3 + (1 - x)
    case 'R':
      return (1 - y) * 3 + (1 - z)
    case 'L':
      return (1 - y) * 3 + (z + 1)
  }
}

export interface Sticker {
  index: number
  face: Face
  pos: Vec3
  normal: Vec3
}

const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`
const stickerKey = (p: Vec3, n: Vec3) => `${key(p)}|${key(n)}`

function buildStickers(): Sticker[] {
  const list: Sticker[] = new Array(54)
  FACES.forEach((face, fi) => {
    const n = FACE_NORMALS[face]
    const axis = n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const p = [0, 0, 0]
        p[axis] = n[axis]
        const others = [0, 1, 2].filter((i) => i !== axis)
        p[others[0]] = a
        p[others[1]] = b
        const pos = p as unknown as Vec3
        const index = fi * 9 + localIndex(face, pos)
        list[index] = { index, face, pos, normal: n }
      }
    }
  })
  return list
}

export const STICKERS: readonly Sticker[] = buildStickers()

const STICKER_LOOKUP = new Map<string, number>(STICKERS.map((s) => [stickerKey(s.pos, s.normal), s.index]))

export function stickerIndex(pos: Vec3, normal: Vec3): number {
  const i = STICKER_LOOKUP.get(stickerKey(pos, normal))
  if (i === undefined) throw new Error(`No sticker at ${key(pos)} facing ${key(normal)}`)
  return i
}

export function faceStickerIndex(pos: Vec3, face: Face): number {
  return stickerIndex(pos, FACE_NORMALS[face])
}

/** Rotate an integer vector by q quarter turns about an axis (right-hand rule, q may be negative). */
export function rotateVec(v: Vec3, axis: Axis, q: number): Vec3 {
  let [x, y, z] = v
  const turns = ((q % 4) + 4) % 4
  for (let i = 0; i < turns; i++) {
    if (axis === 'x') [y, z] = [-z, y]
    else if (axis === 'y') [x, z] = [z, -x]
    else [x, y] = [-y, x]
  }
  return [x + 0, y + 0, z + 0]
}

/** Every cubie position that has stickers, with the sticker indices it carries. */
export interface Cubie {
  pos: Vec3
  stickers: number[]
}

function buildCubies(): Cubie[] {
  const byPos = new Map<string, Cubie>()
  for (const s of STICKERS) {
    const k = key(s.pos)
    let c = byPos.get(k)
    if (!c) {
      c = { pos: s.pos, stickers: [] }
      byPos.set(k, c)
    }
    c.stickers.push(s.index)
  }
  return [...byPos.values()]
}

export const CUBIES: readonly Cubie[] = buildCubies()
export const EDGE_POSITIONS: readonly Vec3[] = CUBIES.filter((c) => c.stickers.length === 2).map((c) => c.pos)
export const CORNER_POSITIONS: readonly Vec3[] = CUBIES.filter((c) => c.stickers.length === 3).map((c) => c.pos)

const CUBIE_LOOKUP = new Map<string, Cubie>(CUBIES.map((c) => [key(c.pos), c]))

export function cubieAt(pos: Vec3): Cubie {
  const c = CUBIE_LOOKUP.get(key(pos))
  if (!c) throw new Error(`No cubie at ${key(pos)}`)
  return c
}

export function samePos(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function centerIndex(face: Face): number {
  return FACES.indexOf(face) * 9 + 4
}
