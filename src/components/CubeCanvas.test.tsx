// @vitest-environment jsdom
import '../test/dom'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LOCALES } from '../i18n'
import { FakeCubeView } from '../test/FakeCubeView'
import { loadCubeView } from '../three/loadCubeView'
import { CubeCanvas } from './CubeCanvas'

const download = vi.hoisted(() => ({ fails: false }))

vi.mock('../three/CubeView', async () => {
  if (download.fails) throw new Error('Failed to fetch dynamically imported module')
  return { CubeView: (await import('../test/FakeCubeView')).FakeCubeView }
})

const { en } = LOCALES
const spinner = (container: HTMLElement) => container.querySelector('.loading')

// The renderer stays downloaded for the rest of this file, so the order of these tests matters.
describe('Cube canvas', () => {
  it('says so when the renderer can’t be downloaded', async () => {
    download.fails = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReady = vi.fn()
    const { container } = render(<CubeCanvas onReady={onReady} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.cube.downloadFailed)
    expect(spinner(container)).toBeNull()
    expect(FakeCubeView.instances).toHaveLength(0)
    // So a play waiting for the cube gives up.
    expect(onReady).toHaveBeenCalledWith(null)
    download.fails = false
  })

  it('stays quiet when the download fails after the canvas is gone', async () => {
    download.fails = true
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReady = vi.fn()
    render(<CubeCanvas onReady={onReady} />).unmount()
    await expect(loadCubeView()).rejects.toThrow()
    expect(error).toHaveBeenCalled()
    // Just the null from unmounting, not a second one for the failure.
    expect(onReady).toHaveBeenCalledTimes(1)
    download.fails = false
  })

  it('shows a spinner while the renderer downloads, then the cube, if the canvas is still there', async () => {
    const onReady = vi.fn()
    const { container } = render(<CubeCanvas onReady={onReady} />)
    const goneReady = vi.fn()
    render(<CubeCanvas onReady={goneReady} />).unmount()
    expect(spinner(container)).not.toBeNull()
    expect(onReady).not.toHaveBeenCalled()
    await waitFor(() => expect(onReady).toHaveBeenCalledWith(FakeCubeView.latest()))
    expect(spinner(container)).toBeNull()
    expect(container.querySelector('canvas')).toBe(FakeCubeView.latest().canvas)
    // The canvas removed during the download gets no cube.
    expect(FakeCubeView.instances).toHaveLength(1)
    expect(goneReady).toHaveBeenCalledTimes(1)
  })

  it('shows later cubes at once, without downloading again', () => {
    const onReady = vi.fn()
    const { container, unmount } = render(<CubeCanvas onReady={onReady} />)
    const view = FakeCubeView.latest()
    expect(onReady).toHaveBeenCalledWith(view)
    expect(spinner(container)).toBeNull()
    unmount()
    expect(onReady).toHaveBeenLastCalledWith(null)
    expect(view.disposed).toBe(true)
  })
})
