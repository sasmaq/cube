const PATHS = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  stepForward: 'M6 5v14l9-7zM16 5h2.5v14H16z',
  stepBack: 'M18 5v14l-9-7zM8 5H5.5v14H8z',
  skipForward: 'M4 5v14l7.5-7zM12 5v14l7.5-7z',
  skipBack: 'M20 5v14l-7.5-7zM12 5v14l-7.5-7z',
  restart: 'M4 12a8 8 0 1 0 8-8 8.7 8.7 0 0 0-6 2.45L4 8.5M4 4v4.5h4.5',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  camera: 'M12 4v3M12 17v3M4 12h3M17 12h3M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  tag: 'M4 4h7l9 9-7 7-9-9zM8 8h.01',
  flip: 'M8 20V4M8 4L4.5 7.5M8 4l3.5 3.5M16 4v16M16 20l-3.5-3.5M16 20l3.5-3.5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  book: 'M5 4.5h5.5a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5zM19 4.5h-5.5a1 1 0 0 0-1 1M19 4.5v13h-5.5a1 1 0 0 0-1 1',
  info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v5M12 8h.01',
  close: 'M6 6l12 12M18 6L6 18',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
  zoom: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20M10.5 8v5M8 10.5h5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  pause2: 'M9 5v14M15 5v14',
} as const

export type IconName = keyof typeof PATHS

const FILLED: IconName[] = ['play', 'pause', 'stepForward', 'stepBack', 'skipForward', 'skipBack']

export function Icon({ name, className = 'size-5', title }: { name: IconName; className?: string; title?: string }) {
  const filled = FILLED.includes(name)
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  )
}
