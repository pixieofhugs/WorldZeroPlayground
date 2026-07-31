// EverymenSigil preview cells — the faction's mark on its own. Tiny by nature, so
// each cell is a size run: the sizes it actually appears at across the site.
import { EverymenSigil } from 'worldzero-frontend'

const row: React.CSSProperties = { padding: 28, display: 'flex', alignItems: 'flex-end', gap: 28 }

/** The mark at the three sizes the site uses: chip, card, and hero. */
export function SizeRun() {
  return (
    <div style={row}>
      <EverymenSigil size={24} />
      <EverymenSigil size={48} />
      <EverymenSigil size={96} />
    </div>
  )
}

/** Tinted — the mark paints in whatever color it is handed. */
export function Tinted() {
  return (
    <div style={row}>
      <EverymenSigil size={64} color="var(--color-text-primary)" />
      <EverymenSigil size={64} color="var(--color-accent-primary)" />
    </div>
  )
}
