// SnideSigil preview cells — the faction's mark on its own. Tiny by nature, so
// each cell is a size run: the sizes it actually appears at across the site.
import { SnideSigil } from 'worldzero-frontend'

const row: React.CSSProperties = { padding: 28, display: 'flex', alignItems: 'flex-end', gap: 28 }

/** The mark at the three sizes the site uses: chip, card, and hero. */
export function SizeRun() {
  return (
    <div style={row}>
      <SnideSigil size={24} />
      <SnideSigil size={48} />
      <SnideSigil size={96} />
    </div>
  )
}

/** Tinted — the mark paints in whatever color it is handed. */
export function Tinted() {
  return (
    <div style={row}>
      <SnideSigil size={64} color="var(--color-text-primary)" />
      <SnideSigil size={64} color="var(--color-accent-primary)" />
    </div>
  )
}
