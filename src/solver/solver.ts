import { SIDE_FACES, samePos, type Face, type Vec3 } from '../cube/geometry'
import { parseMoves, type Amount, type Move } from '../cube/moves'
import {
  SOLVED,
  allCorners,
  allEdges,
  applyMoves,
  centerColor,
  colorFacing,
  faceOfColor,
  findPiece,
  isPieceSolved,
  isSolved,
  pieceAt,
  type Color,
  type CubeState,
  type Piece,
} from '../cube/state'
import { group, say, type Group, type SegmentMsg } from '../i18n/locale'
import { ALGORITHMS, type AlgorithmInfo } from './method'

export type SegmentKind = 'rotate' | 'adjust' | 'algorithm'

/** One explained action in the solution: a cube rotation, a setup turn, or a named algorithm. */
export interface Segment {
  stage: number
  kind: SegmentKind
  /** What to say about it. The UI writes it out in the current language. */
  text: SegmentMsg
  moves: Move[]
  alg?: AlgorithmInfo
  /** Pieces (by their colors) to highlight while this segment plays. */
  focus?: Color[][]
  /** Groups consecutive segments that work on the same piece or case, e.g. white edge 2 of 4. */
  group?: Group
}

export interface Solution {
  start: CubeState
  segments: Segment[]
  end: CubeState
}

const TURNS = [0, 1, -1, 2] as const
type Turn = (typeof TURNS)[number]

const turn = (face: 'U' | 'y', k: Turn): Move[] => (k === 0 ? [] : [{ face, amount: k as Amount }])
const turnCost = (k: Turn) => Math.abs(k)
const alg = (a: AlgorithmInfo) => parseMoves(a.moves)

const hasColor = (p: Piece, c: Color) => p.stickers.some((s) => s.color === c)
const colorsOf = (p: Piece) => p.stickers.map((s) => s.color)
const whiteFirst = (colors: Color[]) => [...colors].sort((a, b) => (a === 'W' ? -1 : b === 'W' ? 1 : 0))

// Pieces are identified by their colors, which never change, so these lists hold for any orientation.
const WHITE_EDGES = allEdges(SOLVED).filter((p) => hasColor(p, 'W')).map((p) => whiteFirst(colorsOf(p)))
const WHITE_CORNERS = allCorners(SOLVED).filter((p) => hasColor(p, 'W')).map((p) => whiteFirst(colorsOf(p)))
const MIDDLE_EDGES = allEdges(SOLVED).filter((p) => !hasColor(p, 'W') && !hasColor(p, 'Y')).map(colorsOf)

const TOP_EDGE_POS = { B: [0, 1, -1], R: [1, 1, 0], F: [0, 1, 1], L: [-1, 1, 0] } as const satisfies Record<string, Vec3>
const TOP_CORNERS_OF: Record<Face, [Vec3, Vec3]> = {
  F: [[-1, 1, 1], [1, 1, 1]],
  R: [[1, 1, 1], [1, 1, -1]],
  B: [[1, 1, -1], [-1, 1, -1]],
  L: [[-1, 1, -1], [-1, 1, 1]],
  U: [[0, 0, 0], [0, 0, 0]],
  D: [[0, 0, 0], [0, 0, 0]],
}
const TOP_CORNER_POS: Vec3[] = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]]

class Builder {
  state: CubeState
  segments: Segment[] = []
  stage = 1
  group: Group | undefined

  constructor(start: CubeState) {
    this.state = start
  }

  emit(seg: Omit<Segment, 'stage' | 'group'>) {
    if (seg.moves.length === 0) return
    this.state = applyMoves(this.state, seg.moves)
    this.segments.push({ ...seg, stage: this.stage, group: this.group })
  }

  peek(moves: Move[]): CubeState {
    return applyMoves(this.state, moves)
  }

  /** Smallest turn of `face` that makes `test` true. */
  find(face: 'U' | 'y', test: (s: CubeState) => boolean, what: string): Turn {
    for (const k of TURNS) if (test(this.peek(turn(face, k)))) return k
    throw new Error(`Stage ${this.stage}: could not ${what}`)
  }
}

function guard(b: Builder, i: number, limit: number) {
  if (i >= limit) throw new Error(`Stage ${b.stage} did not finish within ${limit} rounds`)
}

const solvedCount = (s: CubeState, pieces: Color[][]) => pieces.filter((c) => isPieceSolved(s, findPiece(s, c))).length

// ---------------------------------------------------------------------------
// Step 1: The Daisy
// ---------------------------------------------------------------------------

type DaisyCase = 'left' | 'right' | 'top' | 'bottom' | 'down'

function classifyDaisy(p: Piece): DaisyCase | null {
  const white = faceOfColor(p, 'W')
  const [x, y, z] = p.pos
  if (white === 'F') {
    if (y === 0) return x === -1 ? 'left' : 'right'
    return y === 1 ? 'top' : 'bottom'
  }
  if (white === 'D' && z === 1 && x === 0) return 'down'
  return null
}

const isPetal = (s: CubeState, colors: Color[]) => faceOfColor(findPiece(s, colors), 'W') === 'U'
const petalCount = (s: CubeState) => WHITE_EDGES.filter((c) => isPetal(s, c)).length

function makeRoom(b: Builder, slot: Vec3, focus: Color[][]) {
  const k = b.find('U', (s) => faceOfColor(pieceAt(s, slot), 'W') !== 'U', 'make room on top')
  b.emit({ kind: 'adjust', text: say('makeRoom'), moves: turn('U', k), focus })
}

function stageDaisy(b: Builder) {
  b.stage = 1
  for (let i = 0; petalCount(b.state) < 4; i++) {
    guard(b, i, 12)
    let best: { colors: Color[]; k: Turn; kind: DaisyCase; cost: number } | undefined
    for (const colors of WHITE_EDGES) {
      if (isPetal(b.state, colors)) continue
      for (const k of TURNS) {
        const kind = classifyDaisy(findPiece(b.peek(turn('y', k)), colors))
        if (!kind) continue
        const cost = turnCost(k) + (kind === 'top' || kind === 'bottom' ? 2 : 1)
        if (!best || cost < best.cost) best = { colors, k, kind, cost }
      }
    }
    if (!best) throw new Error('Stage 1: no white edge found to lift')
    const { colors, k, kind } = best
    const focus = [colors]
    b.group = group('whiteEdge', petalCount(b.state) + 1)
    b.emit({ kind: 'rotate', text: say('faceWhiteEdge', colors[1], kind === 'down'), moves: turn('y', k), focus })
    switch (kind) {
      case 'left':
        makeRoom(b, [-1, 1, 0], focus)
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyLeft, text: say('liftLeft'), moves: alg(ALGORITHMS.daisyLeft), focus })
        break
      case 'right':
        makeRoom(b, [1, 1, 0], focus)
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyRight, text: say('liftRight'), moves: alg(ALGORITHMS.daisyRight), focus })
        break
      case 'down':
        makeRoom(b, [0, 1, 1], focus)
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyDown, text: say('liftFromBottom'), moves: alg(ALGORITHMS.daisyDown), focus })
        break
      case 'top':
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyTop, text: say('turnSidewaysFromTop'), moves: parseMoves('F'), focus })
        makeRoom(b, [1, 1, 0], focus)
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyTop, text: say('liftAfterTurn'), moves: parseMoves('R'), focus })
        break
      case 'bottom':
        makeRoom(b, [0, 1, 1], focus)
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyBottom, text: say('turnSidewaysFromBottom'), moves: parseMoves("F'"), focus })
        makeRoom(b, [1, 1, 0], focus)
        b.emit({ kind: 'algorithm', alg: ALGORITHMS.daisyBottom, text: say('liftAfterTurn'), moves: parseMoves('R'), focus })
        break
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2: The White Cross
// ---------------------------------------------------------------------------

function stageCross(b: Builder) {
  b.stage = 2
  for (let i = 0; solvedCount(b.state, WHITE_EDGES) < 4; i++) {
    guard(b, i, 8)
    let choice: { k: Turn; colors: Color[]; side: Color } | undefined
    search: for (const k of TURNS) {
      const s = b.peek(turn('U', k))
      for (const colors of WHITE_EDGES) {
        const p = findPiece(s, colors)
        if (faceOfColor(p, 'W') !== 'U') continue
        const side = p.stickers.find((st) => st.color !== 'W')!
        if (centerColor(s, side.face) === side.color) {
          choice = { k, colors, side: side.color }
          break search
        }
      }
    }
    if (!choice) throw new Error('Stage 2: no petal can be matched')
    const { k, colors, side } = choice
    const focus = [colors]
    b.group = group('whiteEdge', solvedCount(b.state, WHITE_EDGES) + 1)
    b.emit({ kind: 'adjust', text: say('matchPetal', side), moves: turn('U', k), focus })
    const m = b.find('y', (s) => centerColor(s, 'F') === side, 'face the matched center')
    b.emit({ kind: 'rotate', text: say('faceSide', side), moves: turn('y', m), focus })
    b.emit({ kind: 'algorithm', alg: ALGORITHMS.crossDrop, text: say('dropPetal', side), moves: alg(ALGORITHMS.crossDrop), focus })
  }
}

// ---------------------------------------------------------------------------
// Step 3: The White Corners
// ---------------------------------------------------------------------------

interface CornerPlan {
  colors: Color[]
  k: Turn
  m: Turn
  match: Color
  trigger: 'left' | 'right'
  cost: number
}

/** Plan for a white corner in the top layer whose white tile faces outward. */
function planSideCorner(state: CubeState, colors: Color[]): CornerPlan | null {
  const p0 = findPiece(state, colors)
  if (p0.pos[1] !== 1 || faceOfColor(p0, 'W') === 'U') return null
  for (const k of TURNS) {
    const s1 = applyMoves(state, turn('U', k))
    const p = findPiece(s1, colors)
    const x = p.stickers.find((st) => st.color !== 'W' && st.face !== 'U')!
    if (centerColor(s1, x.face) !== x.color) continue
    for (const m of TURNS) {
      const s2 = applyMoves(s1, turn('y', m))
      if (centerColor(s2, 'F') !== x.color) continue
      const trigger = findPiece(s2, colors).pos[0] === -1 ? 'left' : 'right'
      return { colors, k, m, match: x.color, trigger, cost: turnCost(k) + turnCost(m) }
    }
  }
  return null
}

function insertSideCorner(b: Builder, plan: CornerPlan, extraFocus: Color[][] = []) {
  const focus = [plan.colors, ...extraFocus]
  b.emit({ kind: 'adjust', text: say('lineUpCornerTile', plan.match), moves: turn('U', plan.k), focus })
  b.emit({ kind: 'rotate', text: say('faceSide', plan.match), moves: turn('y', plan.m), focus })
  const info = plan.trigger === 'left' ? ALGORITHMS.leftTrigger : ALGORITHMS.rightTrigger
  b.emit({ kind: 'algorithm', alg: info, text: say('cornerTrigger', plan.match, plan.trigger), moves: alg(info), focus })
}

function stageCorners(b: Builder) {
  b.stage = 3
  for (let i = 0; solvedCount(b.state, WHITE_CORNERS) < 4; i++) {
    guard(b, i, 16)
    b.group = group('whiteCorner', solvedCount(b.state, WHITE_CORNERS) + 1)

    const plans = WHITE_CORNERS.map((c) => planSideCorner(b.state, c)).filter((p): p is CornerPlan => p !== null)
    if (plans.length > 0) {
      insertSideCorner(b, plans.reduce((a, p) => (p.cost < a.cost ? p : a)))
      continue
    }

    const whiteUp = WHITE_CORNERS.find((c) => {
      const p = findPiece(b.state, c)
      return p.pos[1] === 1 && faceOfColor(p, 'W') === 'U'
    })
    if (whiteUp) {
      const [, c1, c2] = whiteUp
      const focus = [whiteUp]
      const k = b.find(
        'U',
        (s) => {
          const p = findPiece(s, whiteUp)
          const sides = p.stickers.filter((st) => st.face !== 'U').map((st) => centerColor(s, st.face))
          return sides.includes(c1) && sides.includes(c2)
        },
        'move the corner above its slot',
      )
      b.emit({ kind: 'adjust', text: say('cornerAboveSlot', c1, c2), moves: turn('U', k), focus })
      const m = b.find('y', (s) => samePos(findPiece(s, whiteUp).pos, [1, 1, 1]), 'hold the corner at the front-right')
      b.emit({ kind: 'rotate', text: say('holdCornerFrontRight'), moves: turn('y', m), focus })
      b.emit({ kind: 'algorithm', alg: ALGORITHMS.rightTriggerTwice, text: say('rightTriggerTwice'), moves: alg(ALGORITHMS.rightTriggerTwice), focus })
      continue
    }

    const stuck = WHITE_CORNERS.find((c) => !isPieceSolved(b.state, findPiece(b.state, c)))!
    const focus = [stuck]
    const m = b.find('y', (s) => samePos(findPiece(s, stuck).pos, [1, -1, 1]), 'hold the stuck corner at the front-right')
    b.emit({ kind: 'rotate', text: say('holdStuckCorner', stuck), moves: turn('y', m), focus })
    b.emit({ kind: 'algorithm', alg: ALGORITHMS.rightTrigger, text: say('popOutCorner'), moves: alg(ALGORITHMS.rightTrigger), focus })
  }
}

// ---------------------------------------------------------------------------
// Step 4: The Middle Layer
// ---------------------------------------------------------------------------

function reinsertCorner(b: Builder, corner: Color[], edge: Color[]) {
  const plan = planSideCorner(b.state, corner)
  if (!plan) throw new Error('Stage 4: expected the white corner in the top layer facing outward')
  const info = plan.trigger === 'left' ? ALGORITHMS.leftTrigger : ALGORITHMS.rightTrigger
  const focus = [corner, edge]
  b.emit({ kind: 'adjust', text: say('lineUpLiftedCorner', plan.match), moves: turn('U', plan.k), focus })
  b.emit({ kind: 'rotate', text: say('faceSideChanged', plan.match), moves: turn('y', plan.m), focus })
  b.emit({ kind: 'algorithm', alg: info, text: say('reinsertCorner', plan.trigger), moves: alg(info), focus })
}

function stageMiddle(b: Builder) {
  b.stage = 4
  for (let i = 0; solvedCount(b.state, MIDDLE_EDGES) < 4; i++) {
    guard(b, i, 12)
    b.group = group('middleEdge', solvedCount(b.state, MIDDLE_EDGES) + 1)

    let best: { colors: Color[]; k: Turn; m: Turn; side: Color; top: Color; dir: 'left' | 'right'; cost: number } | undefined
    for (const colors of MIDDLE_EDGES) {
      if (findPiece(b.state, colors).pos[1] !== 1) continue
      for (const k of TURNS) {
        const s1 = b.peek(turn('U', k))
        const p = findPiece(s1, colors)
        const side = p.stickers.find((st) => st.face !== 'U')!
        if (centerColor(s1, side.face) !== side.color) continue
        for (const m of TURNS) {
          const s2 = applyMoves(s1, turn('y', m))
          if (centerColor(s2, 'F') !== side.color) continue
          const top = p.stickers.find((st) => st.face === 'U')!.color
          const dir = top === centerColor(s2, 'L') ? 'left' : 'right'
          const cost = turnCost(k) + turnCost(m)
          if (!best || cost < best.cost) best = { colors, k, m, side: side.color, top, dir, cost }
        }
      }
    }

    if (best) {
      const { colors, k, m, side, top, dir } = best
      const focus = [colors]
      b.emit({ kind: 'adjust', text: say('lineUpEdgeTile', colors, side), moves: turn('U', k), focus })
      b.emit({ kind: 'rotate', text: say('faceSide', side), moves: turn('y', m), focus })
      const info = dir === 'left' ? ALGORITHMS.middleLeft : ALGORITHMS.middleRight
      b.emit({ kind: 'algorithm', alg: info, text: say('moveEdge', top, dir), moves: alg(info), focus })
      const corner = ['W', centerColor(b.state, 'F'), centerColor(b.state, dir === 'left' ? 'L' : 'R')] as Color[]
      reinsertCorner(b, corner, colors)
      continue
    }

    // No usable edge on top: push a stuck middle edge out with a yellow edge.
    const stuck = MIDDLE_EDGES.find((c) => !isPieceSolved(b.state, findPiece(b.state, c)))!
    const focus = [stuck]
    const m = b.find('y', (s) => samePos(findPiece(s, stuck).pos, [1, 0, 1]), 'hold the stuck edge at the front-right')
    b.emit({ kind: 'rotate', text: say('holdStuckEdge', stuck), moves: turn('y', m), focus })
    b.emit({ kind: 'algorithm', alg: ALGORITHMS.middleRight, text: say('kickOutEdge'), moves: alg(ALGORITHMS.middleRight), focus })
    const corner = ['W', centerColor(b.state, 'F'), centerColor(b.state, 'R')] as Color[]
    reinsertCorner(b, corner, stuck)
  }
}

// ---------------------------------------------------------------------------
// Step 5: The Yellow Cross
// ---------------------------------------------------------------------------

const yellowUp = (s: CubeState, pos: Vec3) => colorFacing(s, pos, 'U') === 'Y'

function stageYellowCross(b: Builder) {
  b.stage = 5
  for (let i = 0; ; i++) {
    guard(b, i, 6)
    const up = (s: CubeState) => ({
      B: yellowUp(s, TOP_EDGE_POS.B),
      R: yellowUp(s, TOP_EDGE_POS.R),
      F: yellowUp(s, TOP_EDGE_POS.F),
      L: yellowUp(s, TOP_EDGE_POS.L),
    })
    const now = up(b.state)
    const count = Object.values(now).filter(Boolean).length
    if (count === 4) break
    let shape: 'dot' | 'L' | 'line'
    if (count === 0) {
      shape = 'dot'
    } else if (count === 2 && ((now.L && now.R) || (now.F && now.B))) {
      shape = 'line'
      const m = b.find('y', (s) => up(s).L && up(s).R, 'hold the line sideways')
      b.group = group('line')
      b.emit({ kind: 'rotate', text: say('holdLineSideways'), moves: turn('y', m) })
    } else if (count === 2) {
      shape = 'L'
      const m = b.find('y', (s) => up(s).B && up(s).L, 'hold the L at the back-left')
      b.group = group('lShape')
      b.emit({ kind: 'rotate', text: say('holdLShape'), moves: turn('y', m) })
    } else {
      throw new Error(`Stage 5: impossible yellow edge count ${count}`)
    }
    b.group = group(shape === 'dot' ? 'dot' : shape === 'L' ? 'lShape' : 'line')
    b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowCross, text: say('yellowCross', shape), moves: alg(ALGORITHMS.yellowCross) })
  }
}

// ---------------------------------------------------------------------------
// Step 6: The Yellow Face
// ---------------------------------------------------------------------------

function stageYellowFace(b: Builder) {
  b.stage = 6
  for (let i = 0; ; i++) {
    guard(b, i, 8)
    const n = TOP_CORNER_POS.filter((p) => yellowUp(b.state, p)).length
    if (n === 4) break
    if (n === 3) throw new Error('Stage 6: three corners oriented is impossible')
    const want: Face = n === 0 ? 'L' : n === 1 ? 'U' : 'F'
    const k = b.find('U', (s) => colorFacing(s, [-1, 1, 1], want) === 'Y', 'set up the front-left corner')
    b.group = group('yellowCornersUp', n)
    const corner = colorsOf(pieceAt(b.peek(turn('U', k)), [-1, 1, 1]))
    const focus = [corner]
    b.emit({ kind: 'adjust', text: say('setUpYellowCorner', n), moves: turn('U', k), focus })
    b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowFace, text: say('yellowFace', n), moves: alg(ALGORITHMS.yellowFace), focus })
  }
}

// ---------------------------------------------------------------------------
// Step 7: The Yellow Corners
// ---------------------------------------------------------------------------

function topCornerColors(s: CubeState, face: Face): [Color | undefined, Color | undefined] {
  const [a, c] = TOP_CORNERS_OF[face]
  return [colorFacing(s, a, face), colorFacing(s, c, face)]
}

function matchingFaces(s: CubeState): Face[] {
  return SIDE_FACES.filter((f) => {
    const [a, c] = topCornerColors(s, f)
    return a === c
  })
}

function cornersAligned(s: CubeState): boolean {
  return SIDE_FACES.every((f) => topCornerColors(s, f).every((c) => c === centerColor(s, f)))
}

function stageYellowCorners(b: Builder) {
  b.stage = 7
  for (let i = 0; ; i++) {
    guard(b, i, 4)
    const faces = matchingFaces(b.state)
    if (faces.length === 4) break
    if (faces.length === 1) {
      b.group = group('matchingPair')
      const k = b.find(
        'U',
        (s) => {
          const f = matchingFaces(s)[0]
          return topCornerColors(s, f)[0] === centerColor(s, f)
        },
        'line up the matching corners',
      )
      const pairColor = (() => {
        const s = b.peek(turn('U', k))
        return topCornerColors(s, matchingFaces(s)[0])[0]!
      })()
      b.emit({ kind: 'adjust', text: say('lineUpMatchingCorners', pairColor), moves: turn('U', k) })
      const m = b.find('y', (s) => matchingFaces(s)[0] === 'L', 'hold the matching side on the left')
      b.emit({ kind: 'rotate', text: say('matchingSideLeft', pairColor), moves: turn('y', m) })
      b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowCorners, text: say('yellowCorners', true), moves: alg(ALGORITHMS.yellowCorners) })
      b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowFace, text: say('yellowFaceAgain', true), moves: alg(ALGORITHMS.yellowFace) })
    } else if (faces.length === 0) {
      b.group = group('noMatchingPair')
      b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowCorners, text: say('yellowCorners', false), moves: alg(ALGORITHMS.yellowCorners) })
      b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowFace, text: say('yellowFaceAgain', false), moves: alg(ALGORITHMS.yellowFace) })
    } else {
      throw new Error(`Stage 7: unexpected ${faces.length} matching faces`)
    }
  }
  b.group = group('allCornersMatching')
  const k = b.find('U', cornersAligned, 'line the corners up with their centers')
  b.emit({ kind: 'adjust', text: say('alignCorners'), moves: turn('U', k) })
}

// ---------------------------------------------------------------------------
// Step 8: The Yellow Edges
// ---------------------------------------------------------------------------

function faceSolved(s: CubeState, f: Face): boolean {
  const i = 'URFDLB'.indexOf(f) * 9
  for (let j = 0; j < 9; j++) if (s[i + j] !== s[i + 4]) return false
  return true
}

function stageYellowEdges(b: Builder) {
  b.stage = 8
  for (let i = 0; !isSolved(b.state); i++) {
    guard(b, i, 4)
    const solvedFace = SIDE_FACES.find((f) => faceSolved(b.state, f))
    b.group = group('round', i + 1)
    if (solvedFace) {
      const color = centerColor(b.state, solvedFace)
      const m = b.find('y', (s) => faceSolved(s, 'B'), 'move the solved side to the back')
      b.emit({ kind: 'rotate', text: say('solvedSideToBack', color), moves: turn('y', m) })
    }
    b.emit({ kind: 'algorithm', alg: ALGORITHMS.yellowEdges, text: say('yellowEdges', !!solvedFace), moves: alg(ALGORITHMS.yellowEdges) })
  }
}

// ---------------------------------------------------------------------------

function holdYellowOnTop(b: Builder) {
  if (centerColor(b.state, 'U') === 'Y') return
  for (const alt of ['x', "x'", 'x2', 'z', "z'"]) {
    const moves = parseMoves(alt)
    if (centerColor(b.peek(moves), 'U') === 'Y') {
      b.emit({ kind: 'rotate', text: say('holdYellowOnTop'), moves })
      return
    }
  }
}

export const STAGE_FUNCTIONS = [stageDaisy, stageCross, stageCorners, stageMiddle, stageYellowCross, stageYellowFace, stageYellowCorners, stageYellowEdges]

/** Solve a cube with the eight-step beginner method, returning explained segments. */
export function solve(start: CubeState): Solution {
  const b = new Builder(start)
  holdYellowOnTop(b)
  // The daisy is only a stepping stone to the cross, so skip it when the cross is already there.
  const crossDone = STAGE_GOALS[1](b.state)
  STAGE_FUNCTIONS.forEach((stage, i) => {
    if (i === 0 && crossDone) return
    b.group = undefined
    stage(b)
  })
  if (!isSolved(b.state)) throw new Error('Solver finished without solving the cube')
  return { start, segments: b.segments, end: b.state }
}

const crossGoal = (s: CubeState) => solvedCount(s, WHITE_EDGES) === 4
const firstLayerGoal = (s: CubeState) => crossGoal(s) && solvedCount(s, WHITE_CORNERS) === 4
const twoLayersGoal = (s: CubeState) => firstLayerGoal(s) && solvedCount(s, MIDDLE_EDGES) === 4
const yellowCrossGoal = (s: CubeState) => twoLayersGoal(s) && (Object.values(TOP_EDGE_POS) as Vec3[]).every((p) => yellowUp(s, p))
const yellowFaceGoal = (s: CubeState) => yellowCrossGoal(s) && TOP_CORNER_POS.every((p) => yellowUp(s, p))

/**
 * What each stage achieves (index 0 = Step 1). From Step 2 on each goal includes the
 * earlier ones; the daisy is a temporary state that the cross replaces.
 */
export const STAGE_GOALS: ((s: CubeState) => boolean)[] = [
  (s) => petalCount(s) === 4,
  crossGoal,
  firstLayerGoal,
  twoLayersGoal,
  yellowCrossGoal,
  yellowFaceGoal,
  (s) => yellowFaceGoal(s) && cornersAligned(s),
  isSolved,
]
