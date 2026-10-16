/**
 * Setup shared by the end-to-end and component tests: reading the cube off its WebGL canvas,
 * failing on console errors, and setting range inputs.
 */

type Tile = 'yellow' | 'white' | 'blue' | 'green' | 'red' | 'orange' | 'gray'

export interface CubePixels {
  /** Share of the canvas the cube covers. */
  drawn: number
  /** Share of the cube's pixels in each tile color; the rest is the black plastic between tiles. */
  colors: Record<Tile, number>
  /** Whether the cube touches the canvas edge, i.e. is cut off. */
  clipped: boolean
  /** A fingerprint of the exact picture, to tell whether two frames are identical. */
  hash: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** What the cube's canvas shows right now. Retries with `.should()` until the picture matches. */
      cubePixels(): Chainable<CubePixels>
      /** Moves a range input to `value` the way dragging it would, firing React's onChange. */
      setSlider(value: number): Chainable<JQuery<HTMLElement>>
    }
  }
}

/**
 * Prepares a window the app runs in. three.js lets the browser clear the canvas once a frame is on
 * screen, which leaves nothing to read back; keeping the drawing buffer makes the last frame
 * readable without changing what is drawn. Any console error fails the test.
 */
export function prepareWindow(win: Cypress.AUTWindow) {
  const proto = win.HTMLCanvasElement.prototype
  const getContext = proto.getContext
  proto.getContext = function (this: HTMLCanvasElement, type: string, options?: Record<string, unknown>) {
    return getContext.call(this, type, type.startsWith('webgl') ? { ...options, preserveDrawingBuffer: true } : options)
  } as typeof getContext

  const error = win.console.error
  win.console.error = function (...args: unknown[]) {
    error.apply(this, args)
    // Thrown from a task of its own, so the app carries on while Cypress fails the test.
    win.setTimeout(() => {
      throw new Error(`console.error: ${args.map(String).join(' ')}`)
    })
  }
}

/** Sorts a lit pixel into a tile color by hue, or null for the dark plastic. */
function tileOf(r: number, g: number, b: number): Tile | null {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max < 48) return null
  if (max - min < 32) return max > 176 ? 'white' : 'gray'
  const d = max - min
  const h = ((max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360
  if (h < 12 || h >= 330) return 'red'
  if (h < 36) return 'orange'
  if (h < 75) return 'yellow'
  if (h < 180) return 'green'
  return 'blue'
}

function readCube(canvas: HTMLCanvasElement): CubePixels {
  const { width, height } = canvas
  const copy = canvas.ownerDocument.createElement('canvas')
  copy.width = width
  copy.height = height
  const ctx = copy.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(canvas, 0, 0)
  const { data } = ctx.getImageData(0, 0, width, height)

  const counts: Record<Tile, number> = { yellow: 0, white: 0, blue: 0, green: 0, red: 0, orange: 0, gray: 0 }
  let cube = 0
  let clipped = false
  // FNV-1a over every byte.
  let hash = 0x811c9dc5
  for (let i = 0; i < data.length; i += 4) {
    for (let k = 0; k < 4; k++) hash = Math.imul(hash ^ data[i + k], 0x01000193)
    // The background is transparent; only the cube is opaque.
    if (data[i + 3] < 250) continue
    cube++
    const p = i / 4
    const x = p % width
    const y = (p - x) / width
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) clipped = true
    const tile = tileOf(data[i], data[i + 1], data[i + 2])
    if (tile) counts[tile]++
  }

  const colors = { ...counts }
  for (const tile of Object.keys(colors) as Tile[]) colors[tile] = cube ? counts[tile] / cube : 0
  return { drawn: cube / (width * height), colors, clipped, hash: (hash >>> 0).toString(16) }
}

Cypress.Commands.addQuery('cubePixels', function () {
  return () => {
    // The face-letter canvases are never added to the page, so the only one there is the cube's.
    const canvas = cy.$$('canvas').get(0) as HTMLCanvasElement | undefined
    if (!canvas) throw new Error('No cube canvas on the page')
    return readCube(canvas)
  }
})

Cypress.Commands.add('setSlider', { prevSubject: 'element' }, (subject, value) => {
  const input = subject.get(0) as HTMLInputElement
  // React tracks the value it last saw, so set it through the prototype for the change to register.
  const setValue = Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView!.HTMLInputElement.prototype, 'value')!.set!
  setValue.call(input, String(value))
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return cy.wrap(subject, { log: false })
})
