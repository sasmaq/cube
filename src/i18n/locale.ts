import type { Move } from '../cube/moves'
import type { Color } from '../cube/state'
import type { DemoMove } from '../solver/examples'
import type { AlgId } from '../solver/method'

export type Lang = 'en' | 'ar'

/** A segment's heading and explanation. */
export interface Caption {
  title: string
  detail: string
}

export interface StageText {
  name: string
  /** A few words for compact UI such as the stepper. */
  short: string
  goal: string
  how: string[]
  tip?: string
}

export interface AlgText {
  name: string
  /** When to use it, in one line. */
  when: string
}

type Side = 'left' | 'right'

/**
 * Everything the solver can say about a segment. Colors arrive as codes rather than names so
 * each language can phrase them its own way.
 */
export interface SegmentText {
  holdYellowOnTop: () => Caption
  makeRoom: () => Caption
  faceWhiteEdge: (other: Color, onBottom: boolean) => Caption
  liftLeft: () => Caption
  liftRight: () => Caption
  liftFromBottom: () => Caption
  turnSidewaysFromTop: () => Caption
  turnSidewaysFromBottom: () => Caption
  liftAfterTurn: () => Caption
  matchPetal: (side: Color) => Caption
  faceSide: (side: Color) => Caption
  dropPetal: (side: Color) => Caption
  lineUpCornerTile: (match: Color) => Caption
  cornerTrigger: (match: Color, trigger: Side) => Caption
  cornerAboveSlot: (a: Color, b: Color) => Caption
  holdCornerFrontRight: () => Caption
  rightTriggerTwice: () => Caption
  holdStuckCorner: (corner: Color[]) => Caption
  popOutCorner: () => Caption
  lineUpLiftedCorner: (match: Color) => Caption
  faceSideChanged: (side: Color) => Caption
  reinsertCorner: (trigger: Side) => Caption
  lineUpEdgeTile: (edge: Color[], side: Color) => Caption
  moveEdge: (top: Color, dir: Side) => Caption
  holdStuckEdge: (edge: Color[]) => Caption
  kickOutEdge: () => Caption
  holdLineSideways: () => Caption
  holdLShape: () => Caption
  yellowCross: (shape: 'dot' | 'L' | 'line') => Caption
  /** `yellowUp` is how many corners already show yellow on top: 0, 1 or 2. */
  setUpYellowCorner: (yellowUp: number) => Caption
  yellowFace: (yellowUp: number) => Caption
  lineUpMatchingCorners: (pair: Color) => Caption
  matchingSideLeft: (pair: Color) => Caption
  yellowCorners: (pairFound: boolean) => Caption
  yellowFaceAgain: (pairFound: boolean) => Caption
  alignCorners: () => Caption
  solvedSideToBack: (side: Color) => Caption
  yellowEdges: (solvedSide: boolean) => Caption
  moveDemo: (move: DemoMove) => Caption
}

/** A segment's message: which caption to show and what to fill it with. */
export type SegmentMsg = { [K in keyof SegmentText]: { id: K; args: Parameters<SegmentText[K]> } }[keyof SegmentText]

export type GroupId =
  | 'whiteEdge'
  | 'whiteCorner'
  | 'middleEdge'
  | 'line'
  | 'lShape'
  | 'dot'
  | 'yellowCornersUp'
  | 'matchingPair'
  | 'noMatchingPair'
  | 'allCornersMatching'
  | 'round'

/** The piece or case a run of segments works on, e.g. white edge 2 of 4. */
export interface Group {
  id: GroupId
  n: number
}

/** The tutorial's steps, in order: looking around, zooming, then each of the cube's view buttons. */
export type TutorialStep = 'drag' | 'zoom' | 'flip' | 'labels' | 'camera'

type Eight<T> = [T, T, T, T, T, T, T, T]

export interface Locale {
  lang: Lang
  dir: 'ltr' | 'rtl'
  /** Color names as labels, e.g. in the opposite colors list. */
  colors: Record<Color, string>
  /** Steps 1 to 8, in order. */
  stages: Eight<StageText>
  algorithms: Record<AlgId, AlgText>
  segments: SegmentText
  groups: Record<GroupId, (n: number) => string>
  /** Labels for the Learn page's move demos. */
  moves: Record<DemoMove, string>
  /** Plain-language description of a move for tooltips and captions. */
  describeMove: (m: Move) => string
  app: {
    name: string
    solve: string
    learn: string
    darkMode: string
    toggleDarkMode: string
    /** The button that switches to the other language, labeled in that language. */
    otherLanguage: { lang: Lang; label: string; title: string }
  }
  common: {
    step: (n: number) => string
    stepName: (n: number, name: string) => string
    stepOf: (n: number) => string
  }
  cube: {
    solvedCube: string
    solved: string
    demo: string
    upsideDown: string
    flipBack: string
    flipOver: string
    whiteOnTop: string
    hideLetters: string
    showLetters: string
    toggleLetters: string
    resetView: string
    turning: string
    nextMove: string
    dragHint: string
    srNextMove: (move: string) => string
    srSolved: string
    webglFailed: string
  }
  playback: {
    progress: string
    prevStep: string
    prevStepTitle: string
    prevMove: string
    prevMoveTitle: string
    play: string
    pause: string
    playPauseTitle: string
    nextMove: string
    nextMoveTitle: string
    nextStep: string
    nextStepTitle: string
    speed: string
    playbackSpeed: string
    speeds: [string, string, string, string, string]
    turnsTitle: string
    turns: (done: number, total: number) => string
    pauseAfterStep: string
  }
  panel: {
    solvedTitle: string
    solvedBody: (turns: number) => string
    watchAgain: string
    grayTiles: string
    wholeCubeTurn: string
    playPart: string
    howItWorks: string
    everythingInStep: string
    steps: string
    alreadyDone: (stepName: string) => string
  }
  learn: {
    demoCube: string
    done: string
    pressWatch: string
    basics: string
    basicsTitle: string
    basicsIntro: string
    centers: string
    centersText: string
    edges: string
    edgesText: string
    corners: string
    cornersText: string
    oppositeColors: string
    opposite: string
    holdTitle: string
    /** Before, bold and after parts of one paragraph. */
    holdBody: [string, string, string]
    notation: string
    notationTitle: string
    notationIntro: string
    /** Text before and after a y move chip. */
    notationNote: [string, string]
    watchStep: string
    watch: string
    /** Opens the tutorial again. */
    tutorial: string
  }
  /** The screen first-time visitors see before the tutorial. */
  welcome: {
    title: string
    lead: string
    /** What the Solve and Learn pages are for, in a line each. */
    solve: string
    learn: string
    start: string
    startHint: string
  }
  tutorial: {
    progress: (n: number, total: number) => string
    skip: string
    back: string
    next: string
    finish: string
    /** The badge on the tutorial's cube. */
    cube: string
    tryIt: string
    didIt: string
    steps: Record<TutorialStep, Caption>
  }
}

/** Build a segment message, checking its arguments against the caption it names. */
export function say<K extends keyof SegmentText>(id: K, ...args: Parameters<SegmentText[K]>): SegmentMsg {
  return { id, args } as SegmentMsg
}

export function caption(t: Locale, msg: SegmentMsg): Caption {
  const write = t.segments[msg.id] as (...args: SegmentMsg['args']) => Caption
  return write(...msg.args)
}

export const group = (id: GroupId, n = 0): Group => ({ id, n })

export const sameGroup = (a: Group | undefined, b: Group | undefined) => a === b || (!!a && !!b && a.id === b.id && a.n === b.n)

export const groupLabel = (t: Locale, g: Group) => t.groups[g.id](g.n)
