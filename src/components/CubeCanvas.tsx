import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { CubeView } from '../three/CubeView'

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
  const [failed, setFailed] = useState(false)
  const t = useI18n()

  useEffect(() => {
    if (!ref.current) return
    let view: CubeView
    try {
      view = new CubeView(ref.current)
    } catch (err) {
      console.error(err)
      // WebGL can be missing or blocked; show a message instead of a blank box.
      queueMicrotask(() => setFailed(true))
      return
    }
    onReady(view)
    return () => {
      onReady(null)
      view.dispose()
    }
  }, [onReady])

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div role="alert" className="alert alert-warning max-w-sm">
            <span>{t.cube.webglFailed}</span>
          </div>
        </div>
      )}
    </div>
  )
}
