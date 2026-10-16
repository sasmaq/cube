# Cube

A static React app that visualizes the **8-step beginner method** on a 3D cube built with three.js.

- **Solve** — one mixed-up cube, solved through all eight steps. The steps run along the bottom, and pieces the
  current step doesn't need yet are grayed out. Every action is explained, and you can play, pause, step move by
  move, or jump to any step.
- **Learn** — the basics, the notation, and each step's algorithms, with "Watch" buttons that play real examples on a
  demo cube.

No backend: everything runs in the browser.

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [three.js](https://threejs.org) for the cube
- Tailwind CSS 4 + [daisyUI 5](https://daisyui.com) for the UI
- [Vitest](https://vitest.dev) for unit tests, [Cypress](https://www.cypress.io) for integration and end-to-end tests
- ESLint for linting

## Scripts

```bash
npm install
npm run dev        # local dev server
npm test           # run the test suite once (vitest)
npm run test:coverage  # the same, plus a coverage report (open coverage/index.html)
npm run test:integration  # Cypress component tests: the pages on the real three.js cube
npm run test:e2e   # build, serve with vite preview, and run the Cypress end-to-end tests
npm run cypress:open  # the same server, with Cypress's interactive runner (either kind of test)
npm run lint       # eslint
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

## The method

The solver keeps yellow on top and only uses F, U, R and L, plus whole-cube turns written as `y`:

| Step | Goal | Moves |
| ---- | ---- | ----- |
| 1 The Daisy | White edges around the yellow center | `L'`, `R`, `F R`, `F' R`, `F2` (turn U to make room) |
| 2 The White Cross | Match each petal, send it down | `F2` |
| 3 The White Corners | Finish the first layer | Left Trigger `L' U' L`, Right Trigger `R U R'` (twice if white faces up) |
| 4 The Middle Layer | Insert the four middle edges | `U' L' U' L` / `U R U R'`, then re-insert the corner with a trigger |
| 5 The Yellow Cross | Dot → L → line → cross | `F R U R' U' F'` |
| 6 The Yellow Face | Orient the yellow corners | `R U R' U R U2 R'` |
| 7 The Yellow Corners | Put corners between matching centers | `L' U R U' L U R'` then `R U R' U R U2 R'` |
| 8 The Yellow Edges | Cycle the last edges | `F2 U L R' F2 L' R U F2` |

The tests check that with the matching corners held on the left, `L' U R U' L U R'` followed by the Step 6 algorithm
solves the corners and keeps the yellow face.

## Project layout

```text
src/
  cube/        cube model: geometry, moves, state, scrambles
  solver/      the 8-step solver, step descriptions, Learn page examples
  three/       CubeView — the three.js renderer and turn animations
  player/      timeline + usePlayer hook (play / pause / step / seek)
  components/  UI pieces (step bar, playback bar, step panel, move chips…)
  pages/       Solve and Learn pages
cypress/
  component/   integration tests: pages and the cube canvas mounted in a real browser
  e2e/         end-to-end tests against the production build
  support/     shared setup, including reading the cube's colors off its canvas
```

The tests (`src/**/*.test.ts`) check move notation against the standard and the method's algorithms, and run the
solver on thousands of random scrambles. Every stage has to reach its goal using only the method's moves.

The unit tests run in jsdom, where there is no WebGL, so they swap the three.js view for a stand-in. The Cypress tests
fill that gap in a real browser:

- **Integration** (`cypress/component`) mounts the Solve and Learn pages and the cube canvas with the real renderer. It
  checks what the canvas actually draws (gray tiles, the solved colors, white on top after flipping), that a turn and
  its undo leave the identical picture, real-time playback, resizing, and the message when WebGL is missing.
- **End-to-end** (`cypress/e2e`) runs the production build: page links and the back button, saved theme and
  language across reloads, the no-flash script in `index.html`, phone layouts in English and Arabic, and full
  journeys through both pages.

Both kinds fail on any `console.error`. Cypress runs them in its own Electron browser. If it fails to start with
`bad option: --no-sandbox`, your shell has `ELECTRON_RUN_AS_NODE` set (some editor extensions set it): unset it first.

The Solve page's cube comes from a fixed scramble (`EXAMPLE_SCRAMBLE` in `src/solver/examples.ts`), chosen so every
step has work to do. What stays in color at each step is set by `STAGE_PIECES` in `src/solver/method.ts`.
