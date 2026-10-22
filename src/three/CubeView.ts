import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CUBIES, FACES, FACE_NORMALS, stickerIndex, type Face, type Vec3 } from '../cube/geometry'
import { MOVE_DEFS, inLayer, quarterTurns, type Move } from '../cube/moves'
import { COLOR_HEX, GRAY_HEX, SOLVED, applyMove, type Color, type CubeState } from '../cube/state'

const CUBIE_SIZE = 0.995
const STICKER_SIZE = 0.86
const STICKER_RADIUS = 0.13
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.004
const DEFAULT_CAMERA = new THREE.Vector3(6.3, 5.6, 9.0)
// Aim a little below the center so the cube sits clear of the caption overlay at the bottom.
const TARGET = new THREE.Vector3(0, -0.35, 0)
const FLIP_MS = 600

/** Decides which tiles keep their color; the rest are drawn gray. The piece is given by its colors. */
export type TileFilter = (piece: readonly Color[], tile: Color) => boolean

interface StickerMesh {
  mesh: THREE.Mesh
  index: number
}

interface CubieObject {
  home: Vec3
  group: THREE.Group
  stickers: StickerMesh[]
}

interface Animation {
  move: Move
  duration: number
  resolve: () => void
  pivot?: THREE.Object3D
  members?: CubieObject[]
  start?: number
}

function roundedSquare(size: number, radius: number): THREE.ShapeGeometry {
  const s = size / 2
  const r = radius
  const shape = new THREE.Shape()
  shape.moveTo(-s + r, -s)
  shape.lineTo(s - r, -s)
  shape.quadraticCurveTo(s, -s, s, -s + r)
  shape.lineTo(s, s - r)
  shape.quadraticCurveTo(s, s, s - r, s)
  shape.lineTo(-s + r, s)
  shape.quadraticCurveTo(-s, s, -s, s - r)
  shape.lineTo(-s, -s + r)
  shape.quadraticCurveTo(-s, -s, -s + r, -s)
  return new THREE.ShapeGeometry(shape, 6)
}

function labelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(20, 20, 20, 0.78)'
  ctx.beginPath()
  ctx.arc(64, 64, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 70px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 68)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Imperative three.js renderer for the cube. After every turn the cubies snap
 * back to their home transforms and are recolored from the logical state, so
 * floating-point drift can never build up.
 */
export class CubeView {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private root = new THREE.Group()
  private cubies: CubieObject[] = []
  private labels: THREE.Sprite[] = []
  private materials = new Map<string, THREE.MeshStandardMaterial>()
  private queue: Animation[] = []
  private current: Animation | null = null
  private filter: TileFilter | null = null
  /** Turning the whole cube upside down for display, rotating `root` about the front–back axis. */
  private flip: { from: number; to: number; start?: number } | null = null
  private state: CubeState = SOLVED
  private resizeObserver: ResizeObserver
  private disposed = false
  /** Set whenever something visible changes, so idle frames can skip rendering. */
  private dirty = true
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'none'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    this.camera.position.copy(DEFAULT_CAMERA)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.target.copy(TARGET)
    this.controls.minDistance = 7
    this.controls.maxDistance = 20
    this.controls.rotateSpeed = 0.8
    // The controls also move the camera straight from wheel and touch events, between frames.
    this.controls.addEventListener('change', () => (this.dirty = true))

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(4, 8, 6)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.6)
    fill.position.set(-6, -2, -4)
    this.scene.add(fill)

    this.scene.add(this.root)
    this.buildCubies()
    this.buildLabels()
    this.recolor()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.renderer.setAnimationLoop((t) => this.tick(t))
  }

  /** A tile material; `null` is the gray used for tiles that are filtered out. */
  private material(color: Color | null): THREE.MeshStandardMaterial {
    const key = color ?? 'gray'
    let m = this.materials.get(key)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: color ? COLOR_HEX[color] : GRAY_HEX, roughness: 0.38, metalness: 0.0 })
      this.materials.set(key, m)
    }
    return m
  }

  private buildCubies() {
    const body = new RoundedBoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE, 3, 0.06)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.55, metalness: 0.1 })
    const sticker = roundedSquare(STICKER_SIZE, STICKER_RADIUS)

    for (const c of CUBIES) {
      const group = new THREE.Group()
      group.add(new THREE.Mesh(body, bodyMaterial))
      const stickers: StickerMesh[] = []
      for (const face of FACES) {
        const n = FACE_NORMALS[face]
        const touches = (n[0] !== 0 && c.pos[0] === n[0]) || (n[1] !== 0 && c.pos[1] === n[1]) || (n[2] !== 0 && c.pos[2] === n[2])
        if (!touches) continue
        const mesh = new THREE.Mesh(sticker, this.material('W'))
        const normal = new THREE.Vector3(...n)
        mesh.position.copy(normal).multiplyScalar(STICKER_OFFSET)
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
        group.add(mesh)
        stickers.push({ mesh, index: stickerIndex(c.pos, n) })
      }
      const obj: CubieObject = { home: c.pos, group, stickers }
      this.placeHome(obj)
      this.root.add(group)
      this.cubies.push(obj)
    }
  }

  private buildLabels() {
    const names: Record<Face, string> = { U: 'U', D: 'D', F: 'F', B: 'B', R: 'R', L: 'L' }
    for (const face of FACES) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(names[face]), transparent: true }))
      sprite.position.set(...FACE_NORMALS[face]).multiplyScalar(2.25)
      sprite.scale.setScalar(0.5)
      sprite.visible = false
      this.labels.push(sprite)
      // Labels ride along with the cube so they still name the faces when it's flipped.
      this.root.add(sprite)
    }
  }

  private placeHome(c: CubieObject) {
    c.group.position.set(c.home[0], c.home[1], c.home[2])
    c.group.quaternion.identity()
  }

  private recolor() {
    for (const c of this.cubies) {
      const colors = c.stickers.map((s) => this.state[s.index] as Color)
      c.stickers.forEach((s, i) => {
        const shown = !this.filter || this.filter(colors, colors[i])
        s.mesh.material = this.material(shown ? colors[i] : null)
      })
    }
    this.dirty = true
  }

  private resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = `${w}px`
    this.renderer.domElement.style.height = `${h}px`
    this.camera.aspect = w / h
    // Zoom out on tall, narrow screens so the whole cube stays in view.
    this.camera.zoom = Math.min(1, w / h / 1.1)
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  private tick(time: number) {
    if (this.disposed) return
    // Runs the damping; any move it makes marks the view dirty.
    this.controls.update()
    const animating = this.current !== null || this.queue.length > 0 || this.flip !== null
    this.step(time)
    this.stepFlip(time)
    if (animating || this.dirty) {
      this.renderer.render(this.scene, this.camera)
      this.dirty = false
    }
  }

  private stepFlip(time: number) {
    const f = this.flip
    if (!f) return
    f.start ??= time
    const t = Math.min(1, (time - f.start) / FLIP_MS)
    this.root.rotation.z = f.from + (f.to - f.from) * ease(t)
    if (t >= 1) this.flip = null
  }

  private step(time: number) {
    if (!this.current && this.queue.length) this.begin(this.queue.shift()!, time)
    const a = this.current
    if (!a || !a.pivot || a.start === undefined) return
    const t = a.duration <= 0 ? 1 : Math.min(1, (time - a.start) / a.duration)
    const def = MOVE_DEFS[a.move.face]
    a.pivot.rotation[def.axis] = ease(t) * quarterTurns(a.move) * (Math.PI / 2)
    if (t >= 1) this.finish(a)
  }

  private begin(a: Animation, time: number) {
    const pivot = new THREE.Object3D()
    this.root.add(pivot)
    const members = this.cubies.filter((c) => inLayer(a.move, c.home))
    for (const c of members) pivot.add(c.group)
    a.pivot = pivot
    a.members = members
    a.start = time
    this.current = a
  }

  private finish(a: Animation) {
    for (const c of a.members ?? []) {
      this.root.add(c.group)
      this.placeHome(c)
    }
    if (a.pivot) this.root.remove(a.pivot)
    this.state = applyMove(this.state, a.move)
    this.current = null
    this.recolor()
    a.resolve()
  }

  /** Animate one move. Resolves when it has finished (or was cancelled by setState). */
  animate(move: Move, duration: number): Promise<void> {
    return new Promise((resolve) => this.queue.push({ move, duration, resolve }))
  }

  isBusy(): boolean {
    return this.current !== null || this.queue.length > 0
  }

  /** Jump to a state immediately, dropping any queued or running animation. */
  setState(state: CubeState) {
    const pending = [...this.queue]
    this.queue = []
    if (this.current) {
      const a = this.current
      for (const c of a.members ?? []) this.root.add(c.group)
      if (a.pivot) this.root.remove(a.pivot)
      this.current = null
      pending.unshift(a)
    }
    for (const c of this.cubies) this.placeHome(c)
    this.state = state
    this.recolor()
    for (const a of pending) a.resolve()
  }

  getState(): CubeState {
    return this.state
  }

  /** Gray out the tiles `filter` rejects, or show every color with `null`. */
  setFilter(filter: TileFilter | null) {
    this.filter = filter
    this.recolor()
  }

  setLabels(visible: boolean) {
    for (const l of this.labels) l.visible = visible
    this.dirty = true
  }

  /**
   * Show the cube upside down (white on top) or the right way up. This only changes the view:
   * moves keep their names from the yellow-on-top hold.
   */
  setFlipped(flipped: boolean, animate = true) {
    const to = flipped ? Math.PI : 0
    if (animate && this.root.rotation.z !== to) {
      this.flip = { from: this.root.rotation.z, to }
    } else {
      this.flip = null
      this.root.rotation.z = to
    }
    this.dirty = true
  }

  resetCamera() {
    // A drag leaves the view coasting, which would carry it on past the reset. One update without
    // damping spends what's left of that spin first.
    this.controls.enableDamping = false
    this.controls.update()
    this.controls.enableDamping = true
    this.camera.position.copy(DEFAULT_CAMERA)
    this.controls.target.copy(TARGET)
    this.controls.update()
  }

  dispose() {
    this.disposed = true
    this.setState(this.state)
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose()
      if (o instanceof THREE.Sprite) {
        o.material.map?.dispose()
        o.material.dispose()
      }
    })
    for (const m of this.materials.values()) m.dispose()
    this.renderer.dispose()
    // dispose() leaves the WebGL context alive until garbage collection, and browsers only allow a
    // handful at once. Every page switch makes a new view, so give this one up now.
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
