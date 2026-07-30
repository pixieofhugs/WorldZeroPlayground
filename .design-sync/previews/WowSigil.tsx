// WowSigil preview cells — the faction's mark on its own. Tiny by nature, so
// each cell is a size run: the sizes it actually appears at across the site.
import { WowSigil } from 'worldzero-frontend'

const row: React.CSSProperties = { padding: 28, display: 'flex', alignItems: 'flex-end', gap: 28 }

/** The mark at the three sizes the site uses: chip, card, and hero. */
export function SizeRun() {
  return (
    <div style={row}>
      <WowSigil size={24} />
      <WowSigil size={48} />
      <WowSigil size={96} />
    </div>
  )
}

/** On the WOW card sheet — the seal's own gold is baked in, so it takes no
 *  tint; what changes with context is the ground it sits on. */
export function OnCardSheet() {
  return (
    <div
      style={{
        ...row,
        background: 'var(--faction-wow-card-bg)',
        borderRadius: 8,
        margin: 20,
      }}
    >
      <WowSigil size={72} />
    </div>
  )
}
