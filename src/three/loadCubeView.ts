import type { CubeView } from './CubeView'

let loaded: typeof CubeView | undefined
let download: Promise<typeof CubeView> | undefined

/**
 * Downloads the cube renderer and three.js. They're most of the app's code and the welcome screen
 * doesn't use them, so they come separately, the first time a cube is shown.
 */
export function loadCubeView(): Promise<typeof CubeView> {
  download ??= import('./CubeView').then(
    (m) => (loaded = m.CubeView),
    (err: unknown) => {
      // Let the next cube try again.
      download = undefined
      throw err
    },
  )
  return download
}

/** The renderer if it has been downloaded already, so later cubes can appear without waiting. */
export function loadedCubeView(): typeof CubeView | undefined {
  return loaded
}

/** Whether a cube is on its way: the renderer is downloading. */
export function cubeViewDownloading(): boolean {
  return download !== undefined && loaded === undefined
}
