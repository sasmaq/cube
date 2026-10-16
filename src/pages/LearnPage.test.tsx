// @vitest-environment jsdom
import '../test/dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatMoves } from '../cube/moves'
import { SOLVED } from '../cube/state'
import { LOCALES } from '../i18n'
import { caption, groupLabel } from '../i18n/locale'
import { usePlayer } from '../player/usePlayer'
import { stageDemo } from '../solver/examples'
import { FakeCubeView } from '../test/FakeCubeView'
import { LearnPage } from './LearnPage'

vi.mock('../three/CubeView', async () => ({ CubeView: (await import('../test/FakeCubeView')).FakeCubeView }))

const { en } = LOCALES

function Learn() {
  const player = usePlayer()
  return <LearnPage player={player} />
}

function renderLearn() {
  render(<Learn />)
  return FakeCubeView.latest()
}

/** The notation button for a move, found by its label. */
const moveButton = (label: string) => screen.getByText(label).closest('button')!

describe('Learn page', () => {
  it('shows a solved demo cube until something is picked', () => {
    const view = renderLearn()
    expect(view.state).toBe(SOLVED)
    expect(screen.getByText('Demo cube')).toBeTruthy()
    expect(screen.getByText('Press any “Watch” button to see it on this cube.')).toBeTruthy()
    expect(screen.getByText('Drag to look around · scroll or pinch to zoom')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Watch this step' })).toHaveLength(8)
  })

  it('plays a move shortly after it is picked, then says it is done', async () => {
    vi.useFakeTimers()
    const view = renderLearn()
    view.holdTurns = true
    act(() => {
      fireEvent.click(moveButton('Front face clockwise'))
    })
    expect(screen.getByText('F · Front face clockwise')).toBeTruthy()
    expect(view.animated).toHaveLength(0)

    act(() => {
      vi.advanceTimersByTime(450)
    })
    expect(formatMoves(view.animated)).toBe('F')
    await act(async () => view.finishTurn())
    expect(screen.getByText('Done! Press play to watch it again, or pick something else to watch.')).toBeTruthy()
  })

  it('does not start playing by itself once the user has stepped in', async () => {
    vi.useFakeTimers()
    const view = renderLearn()
    act(() => {
      fireEvent.click(moveButton('Up face clockwise'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next move' }))
    })
    act(() => {
      vi.advanceTimersByTime(450)
    })
    expect(formatMoves(view.animated)).toBe('U')
  })

  it('walks through a whole step with its captions and groups, graying out the rest', () => {
    const view = renderLearn()
    act(() => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Watch this step' })[0])
    })
    const demo = stageDemo(1)
    const [first] = demo.segments
    expect(view.state).toBe(demo.start)
    expect(view.filter).not.toBeNull()
    expect(screen.getByText('Step 1: The Daisy')).toBeTruthy()
    expect(screen.getByText(caption(en, first.text).title)).toBeTruthy()
    expect(first.group).toBeDefined()
    expect(screen.getByText(groupLabel(en, first.group!))).toBeTruthy()
  })

  it('titles an algorithm demo with the algorithm and its step', () => {
    renderLearn()
    const row = screen.getByText('Lift from the left').closest('.min-w-0')!.parentElement!
    act(() => {
      fireEvent.click(within(row).getByRole('button', { name: 'Watch' }))
    })
    expect(screen.getByText('Lift from the left · Step 1')).toBeTruthy()
  })

  it('scrolls the demo cube into view on small screens', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderLearn()
    act(() => {
      fireEvent.click(moveButton('Right face clockwise'))
    })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
