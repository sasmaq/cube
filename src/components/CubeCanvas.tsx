import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { CubeView } from '../three/CubeView'
import { loadCubeView, loadedCubeView } from '../three/loadCubeView'

interface CubeCanvasProps {
  onReady: (view: CubeView | null) => void
  className?: string
}

/**
 * Mounts a three.js CubeView into a div and hands it to the player. The div must get its
 * size from layout (e.g. `absolute inset-0`), never from the canvas inside it.
 */
export function CubeCanvas({ onReady, className = 'relative h-full w-full' }: CubeCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Only the first cube waits for the renderer to download.
  const [loading, setLoading] = useState(() => !loadedCubeView())
  const [failed, setFailed] = useState<'download' | 'webgl' | null>(null)
  const t = useI18n()

  useEffect(() => {
    const container = ref.current
    if (!container) return
    let view: CubeView | undefined
    let gone = false
    const mount = (View: typeof CubeView) => {
      try {
        view = new View(container)
      } catch (err) {
        console.error(err)
        // WebGL can be missing or blocked; show a message instead of a blank box.
        onReady(null)
        queueMicrotask(() => setFailed('webgl'))
        return
      }
      onReady(view)
    }
    const View = loadedCubeView()
    if (View) {
      mount(View)
    } else {
      loadCubeView().then(
        (View) => {
          if (gone) return
          setLoading(false)
          mount(View)
        },
        (err) => {
          console.error(err)
          if (gone) return
          // Offline, or a new version of the app has replaced the files since this page loaded.
          onReady(null)
          setFailed('download')
        },
      )
    }
    return () => {
      gone = true
      onReady(null)
      view?.dispose()
    }
  }, [onReady])

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      {loading && !failed && <span className="loading loading-spinner loading-lg absolute inset-0 m-auto opacity-40" aria-hidden="true" />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div role="alert" className="alert alert-warning max-w-sm">
            <span>{failed === 'download' ? t.cube.downloadFailed : t.cube.webglFailed}</span>
          </div>
        </div>
      )}
    </div>
  )
}
