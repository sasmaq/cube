/** The eight-step beginner method: each step's move sequences and which pieces it shows. Its words are in src/i18n. */

import type { Color } from '../cube/state'

/** Move sequences by name. Each language names and describes them by id. */
export const ALGORITHMS = {
  leftTrigger: { id: 'left-trigger', moves: "L' U' L" },
  rightTrigger: { id: 'right-trigger', moves: "R U R'" },
  rightTriggerTwice: { id: 'right-trigger-x2', moves: "R U R' R U R'" },
  daisyLeft: { id: 'daisy-left', moves: "L'" },
  daisyRight: { id: 'daisy-right', moves: 'R' },
  daisyTop: { id: 'daisy-top', moves: 'F R' },
  daisyBottom: { id: 'daisy-bottom', moves: "F' R" },
  daisyDown: { id: 'daisy-down', moves: 'F2' },
  crossDrop: { id: 'cross-drop', moves: 'F2' },
  middleLeft: { id: 'middle-left', moves: "U' L' U' L" },
  middleRight: { id: 'middle-right', moves: "U R U R'" },
  yellowCross: { id: 'yellow-cross', moves: "F R U R' U' F'" },
  yellowFace: { id: 'yellow-face', moves: "R U R' U R U2 R'" },
  yellowCorners: { id: 'yellow-corners', moves: "L' U R U' L U R'" },
  yellowEdges: { id: 'yellow-edges', moves: "F2 U L R' F2 L' R U F2" },
} as const

export type AlgorithmInfo = (typeof ALGORITHMS)[keyof typeof ALGORITHMS]
export type AlgId = AlgorithmInfo['id']

export interface StageInfo {
  id: number
  algorithms: AlgorithmInfo[]
}

export const STAGES: StageInfo[] = [
  { id: 1, algorithms: [ALGORITHMS.daisyLeft, ALGORITHMS.daisyRight, ALGORITHMS.daisyTop, ALGORITHMS.daisyBottom, ALGORITHMS.daisyDown] },
  { id: 2, algorithms: [ALGORITHMS.crossDrop] },
  { id: 3, algorithms: [ALGORITHMS.leftTrigger, ALGORITHMS.rightTrigger, ALGORITHMS.rightTriggerTwice] },
  { id: 4, algorithms: [ALGORITHMS.middleLeft, ALGORITHMS.middleRight, ALGORITHMS.leftTrigger, ALGORITHMS.rightTrigger] },
  { id: 5, algorithms: [ALGORITHMS.yellowCross] },
  { id: 6, algorithms: [ALGORITHMS.yellowFace] },
  { id: 7, algorithms: [ALGORITHMS.yellowCorners, ALGORITHMS.yellowFace] },
  { id: 8, algorithms: [ALGORITHMS.yellowEdges] },
]

type PieceKind = 'whiteEdge' | 'whiteCorner' | 'middleEdge' | 'yellowEdge' | 'yellowCorner'

/** 'all' shows the whole piece; 'yellow' only its yellow tile, for steps that just turn yellow to face up. */
type Shown = 'all' | 'yellow'

/**
 * The pieces each step cares about: the ones earlier steps finished plus the ones it works on.
 * Everything else is grayed out on the cube. Centers are always shown, and Step 8 shows it all.
 */
const STAGE_PIECES: Record<number, Partial<Record<PieceKind, Shown>>> = {
  1: { whiteEdge: 'all' },
  2: { whiteEdge: 'all' },
  3: { whiteEdge: 'all', whiteCorner: 'all' },
  4: { whiteEdge: 'all', whiteCorner: 'all', middleEdge: 'all' },
  5: { whiteEdge: 'all', whiteCorner: 'all', middleEdge: 'all', yellowEdge: 'yellow' },
  6: { whiteEdge: 'all', whiteCorner: 'all', middleEdge: 'all', yellowEdge: 'yellow', yellowCorner: 'yellow' },
  7: { whiteEdge: 'all', whiteCorner: 'all', middleEdge: 'all', yellowEdge: 'yellow', yellowCorner: 'all' },
}

function pieceKind(piece: readonly Color[]): PieceKind | null {
  if (piece.length < 2) return null
  const edge = piece.length === 2
  if (piece.includes('W')) return edge ? 'whiteEdge' : 'whiteCorner'
  if (piece.includes('Y')) return edge ? 'yellowEdge' : 'yellowCorner'
  return 'middleEdge'
}

/** Whether a tile keeps its color during `stage`. The piece is given by its colors. */
export function tileShown(stage: number, piece: readonly Color[], tile: Color): boolean {
  const pieces = STAGE_PIECES[stage]
  const kind = pieceKind(piece)
  if (!pieces || !kind) return true
  const shown = pieces[kind]
  return shown === 'all' || (shown === 'yellow' && tile === 'Y')
}
