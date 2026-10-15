import { useEffect } from 'react'
import type { Player } from '../player/usePlayer'
import { CubeStage } from '../components/CubeStage'
import { PlaybackBar } from '../components/PlaybackBar'
import { StagePanel } from '../components/StagePanel'
import { StageStepper } from '../components/StageStepper'
import { useI18n } from '../i18n'

/** Walks one mixed-up cube through all eight steps, with the steps along the bottom. */
export function SolvePage({ player }: { player: Player }) {
  const { timeline } = player
  const { dir } = useI18n()

  // Keyboard: Space play/pause, ←/→ moves, Shift+←/→ parts, Shift+↑/↓ steps.
  // Right-to-left, the arrows swap so "forward" still points the way the page reads.
  useEffect(() => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest('input, textarea, select, dialog[open]')) return
      if (target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return
      if (e.key === ' ') player.toggle()
      else if (e.key === forward) (e.shiftKey ? player.nextSegment : player.stepForward)()
      else if (e.key === back) (e.shiftKey ? player.prevSegment : player.stepBack)()
      else if (e.key === 'ArrowDown' && e.shiftKey) player.nextStage()
      else if (e.key === 'ArrowUp' && e.shiftKey) player.prevStage()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, dir])

  if (!timeline) return null

  // On large screens the page fills the window below the header (4rem + border, plus main's
  // padding), so the steps sit at the bottom without covering anything.
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-6rem-1px)] lg:min-h-[640px]">
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="card min-w-0 border border-base-300 bg-base-100 shadow-sm lg:min-h-0">
          <div className="card-body gap-3 p-3 sm:p-4 lg:min-h-0">
            <CubeStage player={player} className="h-[46vh] min-h-[300px] sm:h-[52vh] lg:h-auto lg:min-h-0 lg:flex-1" />
            <PlaybackBar player={player} />
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <div className="card border border-base-300 bg-base-100 shadow-sm lg:min-h-0 lg:flex-1">
            <div className="card-body p-4 lg:min-h-0 lg:overflow-y-auto">
              <StagePanel player={player} timeline={timeline} />
            </div>
          </div>
        </aside>
      </div>

      <StageStepper timeline={timeline} pos={player.pos} onSelect={player.seekStage} />
    </div>
  )
}
