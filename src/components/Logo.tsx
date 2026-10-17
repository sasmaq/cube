const TILES = ['#ffd500', '#c41e3a', '#0051ba', '#009e60', '#ff5800', '#ffd500', '#0051ba', '#c41e3a', '#f4f4f4']

/** A 3×3 cube face: header-sized, or `large` for the welcome screen. */
export function Logo({ large = false }: { large?: boolean }) {
  return (
    <span className={`grid grid-cols-3 bg-neutral ${large ? 'size-20 gap-1 rounded-2xl p-1.5' : 'size-7 gap-[2px] rounded-md p-[3px]'}`} aria-hidden>
      {TILES.map((color, i) => (
        <span key={i} className={large ? 'rounded-md' : 'rounded-[2px]'} style={{ background: color }} />
      ))}
    </span>
  )
}
