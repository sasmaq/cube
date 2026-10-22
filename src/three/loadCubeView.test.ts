import { describe, expect, it, vi } from 'vitest'

const download = vi.hoisted(() => ({ fails: false }))

// A stand-in for the renderer's module, so these tests see only the loader.
vi.mock('./CubeView', () => {
  if (download.fails) throw new Error('Failed to fetch dynamically imported module')
  return { CubeView: class {} }
})

// Each test starts from a page that hasn't downloaded the renderer yet.
async function freshLoader() {
  vi.resetModules()
  return import('./loadCubeView')
}

// Vitest keeps the stand-in once it has loaded, so the failed download has to come first.
describe('loadCubeView', () => {
  it('lets the next cube try again after a failed download', async () => {
    const { loadCubeView, loadedCubeView, cubeViewDownloading } = await freshLoader()
    download.fails = true
    await expect(loadCubeView()).rejects.toThrow()
    expect(cubeViewDownloading()).toBe(false)
    expect(loadedCubeView()).toBeUndefined()

    download.fails = false
    const View = await loadCubeView()
    expect(loadedCubeView()).toBe(View)
  })

  it('downloads the renderer once, however many cubes ask for it', async () => {
    const { loadCubeView, loadedCubeView, cubeViewDownloading } = await freshLoader()
    expect(cubeViewDownloading()).toBe(false)
    expect(loadedCubeView()).toBeUndefined()

    const first = loadCubeView()
    expect(loadCubeView()).toBe(first)
    expect(cubeViewDownloading()).toBe(true)

    const View = await first
    expect(loadedCubeView()).toBe(View)
    expect(cubeViewDownloading()).toBe(false)
    expect(loadCubeView()).toBe(first)
  })
})
