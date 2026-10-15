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
- [Vitest](https://vitest.dev) for tests, ESLint for linting

## Scripts

```bash
npm install
npm run dev        # local dev server
npm test           # run the test suite once (vitest)
npm run lint       # eslint
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
npm run deploy     # build and deploy to Cloudflare Pages with wrangler
```

## Deploying to Cloudflare Pages

The build output is a plain static site in `dist/`.

**Git integration (recommended):** create a Pages project from the repository with

| Setting          | Value                     |
| ---------------- | ------------------------- |
| Build command    | `npm run build`           |
| Output directory | `dist`                    |
| Node version     | 22 (from `.node-version`) |

**Direct upload:** `npm run deploy` builds and runs `wrangler pages deploy dist` (you'll be asked to log in the first
time). Project settings live in `wrangler.toml`.

`public/_headers` gives hashed assets a long cache lifetime. Navigation uses the URL hash (`#learn`), so no SPA
redirect rules are needed.

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
```

The tests (`src/**/*.test.ts`) check move notation against the standard and the method's algorithms, and run the
solver on thousands of random scrambles. Every stage has to reach its goal using only the method's moves.

The Solve page's cube comes from a fixed scramble (`EXAMPLE_SCRAMBLE` in `src/solver/examples.ts`), chosen so every
step has work to do. What stays in color at each step is set by `STAGE_PIECES` in `src/solver/method.ts`.
