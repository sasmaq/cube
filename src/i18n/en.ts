import type { MoveFace } from '../cube/moves'
import type { Color } from '../cube/state'
import { ALGORITHMS, type AlgId } from '../solver/method'
import type { AlgText, Locale } from './locale'

const COLORS: Record<Color, string> = { Y: 'Yellow', W: 'White', B: 'Blue', G: 'Green', R: 'Red', O: 'Orange' }
const color = (c: Color) => COLORS[c].toLowerCase()
const pieceName = (colors: readonly Color[]) => colors.map(color).join('–')
const pretty = (moves: string) => moves.replace(/'/g, '′')

const ALGS: Record<AlgId, AlgText> = {
  'left-trigger': { name: 'Left Trigger', when: 'The tile matching the front center is on the top-left of the front face.' },
  'right-trigger': { name: 'Right Trigger', when: 'The tile matching the front center is on the top-right of the front face.' },
  'right-trigger-x2': { name: 'Right Trigger ×2', when: 'A white corner sits in the top layer with its white tile facing up.' },
  'daisy-left': { name: 'Lift from the left', when: 'White tile on the middle-left of the front face.' },
  'daisy-right': { name: 'Lift from the right', when: 'White tile on the middle-right of the front face.' },
  'daisy-top': { name: 'Flip from the top', when: 'White tile on the top-middle of the front face.' },
  'daisy-bottom': { name: 'Flip from the bottom', when: 'White tile on the bottom-middle of the front face.' },
  'daisy-down': { name: 'Up from underneath', when: 'White tile on the bottom face, at the front.' },
  'cross-drop': { name: 'Drop it down', when: 'A petal is lined up with its matching center.' },
  'middle-left': { name: 'Move left', when: 'The edge needs to go down to the left of the front center.' },
  'middle-right': { name: 'Move right', when: 'The edge needs to go down to the right of the front center.' },
  'yellow-cross': { name: 'Yellow Cross algorithm', when: 'Repeat until the yellow cross appears.' },
  'yellow-face': { name: 'Yellow Face algorithm', when: 'Repeat, setting up the front-left corner each time, until the top is all yellow.' },
  'yellow-corners': { name: 'Yellow Corners algorithm', when: 'Matching corners on the left face (or none anywhere), then follow with the Yellow Face algorithm.' },
  'yellow-edges': { name: 'Yellow Edges algorithm', when: 'Solved face at the back. Repeat until the cube is solved.' },
}

const trigger = (side: 'left' | 'right') => (side === 'left' ? ALGORITHMS.leftTrigger : ALGORITHMS.rightTrigger)

const MOVES: Locale['moves'] = {
  F: 'Front face clockwise',
  "F'": 'Front face counter-clockwise',
  U: 'Up face clockwise',
  "U'": 'Up face counter-clockwise',
  R: 'Right face clockwise',
  "R'": 'Right face counter-clockwise',
  L: 'Left face clockwise',
  "L'": 'Left face counter-clockwise',
  F2: 'Front face half turn',
  y: 'Whole cube turn',
}

const FACE_NAMES: Record<MoveFace, string> = {
  U: 'Up face',
  D: 'Down face',
  R: 'Right face',
  L: 'Left face',
  F: 'Front face',
  B: 'Back face',
  M: 'Middle slice',
  E: 'Equator slice',
  S: 'Standing slice',
  x: 'Whole cube (like R)',
  y: 'Whole cube (like U)',
  z: 'Whole cube (like F)',
}

export const en: Locale = {
  lang: 'en',
  dir: 'ltr',
  colors: COLORS,
  algorithms: ALGS,
  moves: MOVES,

  stages: [
    {
      name: 'The Daisy',
      short: 'Daisy',
      goal: 'Gather all four white edge pieces around the yellow center so they look like petals around a flower.',
      how: [
        'Keep the yellow center on top for the whole solve.',
        'Find a white edge and turn the whole cube until its white tile faces you (or sits under the front edge on the bottom).',
        'Use the move for its position to bring it up next to the yellow center: L′, R, F then R, F′ then R, or F2.',
        'Before lifting a piece up, turn the top layer so you don’t knock off a petal you already placed.',
      ],
      tip: 'Turning the top layer to make space is always safe here. The petals only need to be on top, not in a particular spot.',
    },
    {
      name: 'The White Cross',
      short: 'White Cross',
      goal: 'Send each white petal down to the white center, matching its other color to the side centers.',
      how: [
        'Turn the top layer until a petal’s side color sits directly above the center of the same color.',
        'Turn the cube so that face is in front, then turn the front face twice (F2).',
        'Repeat for all four petals to build a white cross on the bottom.',
      ],
    },
    {
      name: 'The White Corners',
      short: 'White Corners',
      goal: 'Put the four white corners into the bottom layer so the whole first layer is solved.',
      how: [
        'Find a white corner in the top layer with its white tile facing outward.',
        'Turn the top layer so the corner’s other side color (not the one facing up) matches the center beneath it, and make that face the front.',
        'If that matching tile is on the top-left, do a Left Trigger. If it’s on the top-right, do a Right Trigger.',
        'White tile facing up? Move the corner above its slot and do the Right Trigger twice, and now it faces outward.',
        'White corner stuck in the bottom layer? Hold it at the front-right and do one Right Trigger to bring it to the top.',
      ],
      tip: 'Triggers are the building block for the rest of the solve, so it’s worth practicing them until they’re smooth.',
    },
    {
      name: 'The Middle Layer',
      short: 'Middle Layer',
      goal: 'Place the four edges that have no yellow on them between the matching side centers.',
      how: [
        'Find an edge on top with no yellow. Turn the top layer until its front tile matches the center below it.',
        'Look at its top tile: if it matches the left center the edge moves left (U′ + Left Trigger); if it matches the right center it moves right (U + Right Trigger).',
        'That pulls a white corner up. Turn the cube to face it, line it up like in Step 3 and trigger it back down. The edge drops in alongside it.',
        'No yellow-free edges on top but the layer isn’t done? Use the same moves with a yellow edge to kick the stuck piece out.',
      ],
    },
    {
      name: 'The Yellow Cross',
      short: 'Yellow Cross',
      goal: 'Flip the yellow edges so a yellow cross appears on top. They don’t have to match the sides yet.',
      how: [
        'Look at the top: a dot, an L shape or a line.',
        'L shape: hold it so it points to the back and the left. Line: hold it horizontally. Dot: any side can face you.',
        'Do the algorithm and check again. A dot becomes an L, an L becomes a line, and a line becomes the cross.',
      ],
    },
    {
      name: 'The Yellow Face',
      short: 'Yellow Face',
      goal: 'Twist the yellow corners until the whole top face is yellow.',
      how: [
        'Count the corners that already show yellow on top.',
        '0 → turn the top so the front-left corner’s yellow faces left. 1 → put that yellow corner at the front-left. 2 → turn the top so the front-left corner’s yellow faces you.',
        'Do the algorithm, then look again. Repeat until the top is fully yellow. You may see the same pattern more than once.',
      ],
      tip: 'Every case is set up around the front-left corner of the top face.',
    },
    {
      name: 'The Yellow Corners',
      short: 'Yellow Corners',
      goal: 'Move the yellow corners so each one sits between its matching side centers.',
      how: [
        'Look for a side where both top corners show the same color.',
        'Found one: turn the top layer so that pair matches its center, then hold that face on the left.',
        'Do the Yellow Corners algorithm. The yellow face breaks up, which is expected. Then do the Yellow Face algorithm to restore it.',
        'No matching pair anywhere? Do both algorithms from any side; you’ll then have a matching pair to work with.',
      ],
    },
    {
      name: 'The Yellow Edges',
      short: 'Yellow Edges',
      goal: 'Cycle the last yellow edges into place and finish the cube.',
      how: [
        'If one side is completely solved, hold it at the back. If none is, any side can go at the back.',
        'Do the algorithm. The back edge stays still while the other three rotate around.',
        'Check again and repeat, at most three times in total.',
      ],
    },
  ],

  segments: {
    holdYellowOnTop: () => ({
      title: 'Hold the cube with yellow on top',
      detail: 'Every step keeps the yellow center on top, so start by turning the cube over.',
    }),
    makeRoom: () => ({
      title: 'Make room on top',
      detail: 'Turn the top layer so the spot this edge is heading for isn’t already holding a white petal.',
    }),
    faceWhiteEdge: (other, onBottom) => ({
      title: 'Turn the cube to face it',
      detail: onBottom
        ? `Turn the whole cube so the white–${color(other)} edge is on the bottom, right under the front face.`
        : `Turn the whole cube so the white tile of the white–${color(other)} edge is on the front face.`,
    }),
    liftLeft: () => ({
      title: 'Lift it up with L′',
      detail: 'The white tile is on the middle-left of the front face. L′ carries it straight up next to the yellow center.',
    }),
    liftRight: () => ({
      title: 'Lift it up with R',
      detail: 'The white tile is on the middle-right of the front face. R carries it straight up next to the yellow center.',
    }),
    liftFromBottom: () => ({
      title: 'Bring it up with F2',
      detail: 'The white tile faces down at the front of the bottom layer. Two turns of the front face flip it up to the top.',
    }),
    turnSidewaysFromTop: () => ({
      title: 'Turn it sideways with F',
      detail: 'The white tile is on the top-middle of the front face, pointing the wrong way. F swings it to the right side of the front face.',
    }),
    turnSidewaysFromBottom: () => ({
      title: 'Turn it sideways with F′',
      detail: 'The white tile is on the bottom-middle of the front face. F′ swings it to the right side of the front face.',
    }),
    liftAfterTurn: () => ({
      title: 'Lift it up with R',
      detail: 'Now R carries the white tile up beside the yellow center.',
    }),
    matchPetal: (side) => ({
      title: `Match the ${color(side)} tile to its center`,
      detail: `Turn the top layer until the ${color(side)} tile of the white–${color(side)} petal sits right above the ${color(side)} center.`,
    }),
    faceSide: (side) => ({
      title: `Face the ${color(side)} side`,
      detail: `Turn the whole cube so the ${color(side)} center is in front of you.`,
    }),
    dropPetal: (side) => ({
      title: 'Drop it down with F2',
      detail: `Turn the front face twice. The petal swings down to join the white center, with ${color(side)} matching the side.`,
    }),
    lineUpCornerTile: (match) => ({
      title: `Line up the ${color(match)} tile`,
      detail: `Turn the top layer until the corner’s ${color(match)} tile (the side color that isn’t facing up) sits above the ${color(match)} center.`,
    }),
    cornerTrigger: (match, side) => {
      const info = trigger(side)
      const name = ALGS[info.id].name
      return {
        title: name,
        detail: `The ${color(match)} tile is on the top-${side} of the front face, so a ${name} (${pretty(info.moves)}) tucks the corner into the bottom layer with white facing down.`,
      }
    },
    cornerAboveSlot: (a, b) => ({
      title: 'Move it above its slot',
      detail: `This corner’s white tile faces up. Turn the top layer so it sits above the gap between the ${color(a)} and ${color(b)} centers.`,
    }),
    holdCornerFrontRight: () => ({
      title: 'Hold it at the front-right',
      detail: 'Turn the whole cube so this corner is at the top-right of the front face.',
    }),
    rightTriggerTwice: () => ({
      title: ALGS['right-trigger-x2'].name,
      detail: 'Do the Right Trigger twice. The white tile ends up facing outward, so the corner can be placed with a single trigger.',
    }),
    holdStuckCorner: (corner) => ({
      title: 'Hold it at the front-right',
      detail: `The ${pieceName(corner)} corner is in the bottom layer but in the wrong spot or twisted. Turn the cube so it’s at the bottom-right of the front face.`,
    }),
    popOutCorner: () => ({
      title: 'Pop it out with a Right Trigger',
      detail: 'One Right Trigger lifts the corner into the top layer, where it can be placed properly.',
    }),
    lineUpLiftedCorner: (match) => ({
      title: `Line the corner up with ${color(match)}`,
      detail: `That lifted a white corner into the top layer. Turn the top until its ${color(match)} tile sits above the ${color(match)} center. The edge travels with it.`,
    }),
    faceSideChanged: (side) => ({
      title: `Face the ${color(side)} side`,
      detail: `Turn the whole cube so the ${color(side)} center is in front. The front face changes here!`,
    }),
    reinsertCorner: (side) => {
      const name = ALGS[trigger(side).id].name
      return { title: name, detail: `A ${name} puts the white corner back, and the edge drops into the middle layer with it.` }
    },
    lineUpEdgeTile: (edge, side) => ({
      title: `Line up the ${color(side)} tile`,
      detail: `Turn the top layer until the ${pieceName(edge)} edge’s ${color(side)} tile sits above the ${color(side)} center.`,
    }),
    moveEdge: (top, dir) => ({
      title: dir === 'left' ? 'Move left: U′ + Left Trigger' : 'Move right: U + Right Trigger',
      detail: `The top tile is ${color(top)}, matching the ${dir} center, so the edge goes down to the ${dir}. ${
        dir === 'left' ? 'Turn the top away (U′), then do a Left Trigger.' : 'Turn the top away (U), then do a Right Trigger.'
      }`,
    }),
    holdStuckEdge: (edge) => ({
      title: 'Hold the stuck edge at the front-right',
      detail: `The ${pieceName(edge)} edge is in the middle layer but in the wrong spot or flipped. Turn the cube so it’s on the right side of the front face.`,
    }),
    kickOutEdge: () => ({
      title: 'Kick it out: U + Right Trigger',
      detail: 'No yellow-free edges are on top, so use a yellow edge instead. The move-right sequence swaps it in and pushes the stuck edge up to the top layer.',
    }),
    holdLineSideways: () => ({
      title: 'Hold the line sideways',
      detail: 'Two yellow edges make a line. Turn the whole cube so the line runs from left to right.',
    }),
    holdLShape: () => ({
      title: 'Hold the L at the back-left',
      detail: 'Two yellow edges make an L. Turn the whole cube so the L points to the back and to the left.',
    }),
    yellowCross: (shape) => ({
      title: ALGS['yellow-cross'].name,
      detail:
        shape === 'dot'
          ? 'Only the yellow center is showing. Do the algorithm from any side and an L or a line appears.'
          : shape === 'L'
            ? 'With the L at the back-left, the algorithm turns it into a line.'
            : 'With the line held sideways, the algorithm completes the yellow cross.',
    }),
    setUpYellowCorner: (n) => ({
      title: n === 0 ? 'Yellow facing left at the front-left' : n === 1 ? 'Yellow corner to the front-left' : 'Yellow facing you at the front-left',
      detail:
        n === 0
          ? 'No corners show yellow on top. Turn the top layer so the front-left corner’s yellow tile faces left.'
          : n === 1
            ? 'One corner shows yellow on top. Turn the top layer to put it at the front-left.'
            : 'Two corners show yellow on top. Turn the top layer so the front-left corner’s yellow tile faces you.',
    }),
    yellowFace: (n) => ({
      title: ALGS['yellow-face'].name,
      detail:
        n === 0
          ? 'The front-left corner’s yellow faces left, so do the algorithm: a Right Trigger, then U R U2 R′. Then count the yellow corners again.'
          : n === 1
            ? 'The yellow corner is at the front-left, so do the algorithm: a Right Trigger, then U R U2 R′. Then check the top again.'
            : 'The front-left corner’s yellow faces you, so do the algorithm: a Right Trigger, then U R U2 R′. Then check the top again.',
    }),
    lineUpMatchingCorners: (pair) => ({
      title: 'Line up the matching corners',
      detail: `Both top corners on one side show ${color(pair)}. Turn the top layer until they sit above the ${color(pair)} center.`,
    }),
    matchingSideLeft: (pair) => ({
      title: 'Matching side on the left',
      detail: `Turn the whole cube so the ${color(pair)} side, with its matching corners, is on your left.`,
    }),
    yellowCorners: (pairFound) => ({
      title: ALGS['yellow-corners'].name,
      detail: pairFound
        ? 'Do the Yellow Corners algorithm. The yellow face will break up, which is expected.'
        : 'No side has two matching corners yet, so any side can face you. Do the Yellow Corners algorithm. The yellow face will break up for now.',
    }),
    yellowFaceAgain: (pairFound) => ({
      title: `${ALGS['yellow-face'].name} (from Step 6)`,
      detail: pairFound
        ? 'Just like in Step 6, this brings the yellow face back, and now every corner matches its neighbours.'
        : 'Restore the yellow face. Now one side has a matching pair of corners to work with.',
    }),
    alignCorners: () => ({
      title: 'Line the corners up with their centers',
      detail: 'Every side now has matching corners. Turn the top layer so they line up with the centers below.',
    }),
    solvedSideToBack: (side) => ({
      title: 'Solved side to the back',
      detail: `The ${color(side)} side is complete. Turn the whole cube so it faces away from you.`,
    }),
    yellowEdges: (solvedSide) => ({
      title: ALGS['yellow-edges'].name,
      detail: solvedSide
        ? 'With the solved side at the back, its edge stays still while the other three top edges rotate. Check if the cube is solved.'
        : 'No side is complete yet, so any side can go at the back. Afterwards one side will be solved.',
    }),
    moveDemo: (move) => ({ title: MOVES[move], detail: `Watch the ${MOVES[move].toLowerCase()}.` }),
  },

  groups: {
    whiteEdge: (n) => `White edge ${n} of 4`,
    whiteCorner: (n) => `White corner ${n} of 4`,
    middleEdge: (n) => `Middle edge ${n} of 4`,
    line: () => 'Line',
    lShape: () => 'L shape',
    dot: () => 'Dot',
    yellowCornersUp: (n) => `${n} yellow corner${n === 1 ? '' : 's'} on top`,
    matchingPair: () => 'Matching pair',
    noMatchingPair: () => 'No matching corners',
    allCornersMatching: () => 'All corners matching',
    round: (n) => `Round ${n}`,
  },

  describeMove: (m) => {
    if (m.face === 'y') {
      if (m.amount === 2) return 'Turn the whole cube half way around'
      return m.amount === 1 ? 'Turn the whole cube so the right face comes to the front' : 'Turn the whole cube so the left face comes to the front'
    }
    const turn = m.amount === 2 ? 'half turn (180°)' : m.amount === 1 ? 'clockwise quarter turn' : 'counter-clockwise quarter turn'
    return `${FACE_NAMES[m.face]}, ${turn}`
  },

  app: {
    name: 'Cube',
    solve: 'Solve',
    learn: 'Learn',
    darkMode: 'Dark mode',
    toggleDarkMode: 'Toggle dark mode',
    otherLanguage: { lang: 'ar', label: 'ع', title: 'العربية' },
  },

  common: {
    step: (n) => `Step ${n}`,
    stepName: (n, name) => `Step ${n}: ${name}`,
    stepOf: (n) => `Step ${n} of 8`,
  },

  cube: {
    solvedCube: 'Solved cube',
    solved: 'Solved',
    demo: 'Demo',
    upsideDown: 'Upside down: move letters still assume yellow on top',
    flipBack: 'Turn back: yellow on top',
    flipOver: 'Turn the cube over: white on top',
    whiteOnTop: 'White on top',
    hideLetters: 'Hide face letters',
    showLetters: 'Show face letters (U, F, R…)',
    toggleLetters: 'Toggle face letters',
    resetView: 'Reset the view',
    turning: 'Turning',
    nextMove: 'Next move',
    dragHint: 'Drag to look around · scroll or pinch to zoom',
    srNextMove: (move) => `Next move ${move}`,
    srSolved: 'Cube solved',
    webglFailed: 'Your browser couldn’t start WebGL, so the 3D cube can’t be shown. Try another browser or enable hardware acceleration.',
    downloadFailed: 'The 3D cube couldn’t be downloaded. Check your connection and reload the page.',
  },

  playback: {
    progress: 'Solution progress',
    prevStep: 'Previous step',
    prevStepTitle: 'Previous step (Shift+↑)',
    prevMove: 'Previous move',
    prevMoveTitle: 'Previous move (←)',
    play: 'Play',
    pause: 'Pause',
    playPauseTitle: 'Play / pause (Space)',
    nextMove: 'Next move',
    nextMoveTitle: 'Next move (→)',
    nextStep: 'Next step',
    nextStepTitle: 'Next step (Shift+↓)',
    speed: 'Speed',
    playbackSpeed: 'Playback speed',
    speeds: ['Very slow', 'Slow', 'Normal', 'Fast', 'Very fast'],
    turnsTitle: 'Face turns (whole-cube turns are not counted)',
    turns: (done, total) => `${done} / ${total} turns`,
    pauseAfterStep: 'Pause after each step',
  },

  panel: {
    solvedTitle: 'Solved!',
    solvedBody: (turns) => `That took ${turns} face turns across all eight steps. Tap any step below to watch it again.`,
    watchAgain: 'Watch again',
    grayTiles: 'Gray tiles don’t matter yet. The colored ones are already solved or are what this step works on.',
    wholeCubeTurn: 'Whole-cube turn',
    playPart: 'Play this part',
    howItWorks: 'How this step works',
    everythingInStep: 'Everything in this step',
    steps: 'Steps',
    alreadyDone: (stepName) => `${stepName} (already done for this cube)`,
  },

  learn: {
    demoCube: 'Demo cube',
    done: 'Done! Press play to watch it again, or pick something else to watch.',
    pressWatch: 'Press any “Watch” button to see it on this cube.',
    basics: 'The basics',
    basicsTitle: 'Get to know your cube',
    basicsIntro:
      'Think of the cube as pieces that turn around the centers rather than as 54 loose stickers. Every piece has exactly one home, and it’s home when each of its tiles matches the center beside it.',
    centers: 'Centers',
    centersText: 'One tile. Centers never move, so they decide the color of each side.',
    edges: 'Edges',
    edgesText: 'Two tiles that always travel together.',
    corners: 'Corners',
    cornersText: 'Three tiles that always travel together.',
    oppositeColors: 'Opposite colors',
    opposite: 'opposite',
    holdTitle: 'Hold it the same way',
    holdBody: [
      'For every step, keep the ',
      'yellow center on top',
      '. The “front face” is whichever side is facing you. You’ll often turn the whole cube so a particular color is in front.',
    ],
    notation: 'Notation',
    notationTitle: 'The moves',
    notationIntro:
      'Each letter names a face. A letter on its own means a clockwise quarter turn, as if you were looking straight at that face. A prime (′) means counter-clockwise, and a 2 means a half turn. Tap any move to see it.',
    notationNote: ['The eight steps only need F, U, R and L. This app also writes ', ' when the solver turns the whole cube to bring a new face to the front.'],
    watchStep: 'Watch this step',
    watch: 'Watch',
    tutorial: 'Start tutorial',
  },

  welcome: {
    title: 'Learn to solve the cube',
    lead: 'Follow a mixed-up cube as it’s solved with the 8-step beginner method, one move at a time, on a 3D cube you can turn and zoom.',
    solve: 'Watch one cube go through all eight steps. Play, pause, or go move by move.',
    learn: 'The basics, the moves, and each step’s algorithms, with a demo for every one.',
    start: 'Start',
    startHint: 'First, a quick tutorial on using the cube.',
  },

  tutorial: {
    progress: (n, total) => `Tutorial · ${n} of ${total}`,
    skip: 'Skip tutorial',
    back: 'Back',
    next: 'Next',
    finish: 'Let’s go',
    cube: 'Practice cube',
    tryIt: 'Try it on the cube.',
    didIt: 'Nice, that’s it!',
    steps: {
      drag: {
        title: 'Look around',
        detail: 'Drag the cube with your mouse or finger to see it from any side. This only moves your view, never the pieces.',
      },
      zoom: {
        title: 'Zoom in and out',
        detail: 'Scroll with the mouse wheel, or pinch with two fingers, to bring the cube closer or push it back.',
      },
      flip: {
        title: 'White on top',
        detail: 'Every step holds the cube with yellow on top. To check the white side underneath, press White on top to turn the cube over, then press it again to turn it back.',
      },
      labels: {
        title: 'Face letters',
        detail: 'Moves are named after the faces: U for up, F for front, R for right and L for left. Press the letters button to label each face.',
      },
      camera: {
        title: 'Reset the view',
        detail: 'Lost your angle? The reset button turns your view back to where it started.',
      },
    },
  },

  notFound: {
    pageTitle: 'Page not found · Cube',
    title: 'Page not found',
    lead: 'There’s nothing at this address. The link may be mistyped, or the page may have moved.',
    home: 'Back to the cube',
  },
}
