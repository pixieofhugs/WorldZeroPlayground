// UaSigil preview cells — the UA heraldic mark. It sizes on explicit
// width/height rather than a single `size`, so the cells show the proportions it
// is actually drawn at.
import { UaSigil } from 'worldzero-frontend'

const row: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  alignItems: 'flex-end',
  gap: 32,
  color: 'var(--faction-ua)',
}

/** The size run: chip, card, and hero. */
export function SizeRun() {
  return (
    <div style={row}>
      <UaSigil width={28} height={28} />
      <UaSigil width={56} height={56} />
      <UaSigil width={112} height={112} />
    </div>
  )
}

/** On the faction's own card sheet, which is where it normally sits. */
export function OnCardSheet() {
  return (
    <div
      style={{
        ...row,
        background: 'var(--faction-ua-card-bg)',
        color: 'var(--faction-ua-card-accent)',
        borderRadius: 8,
        margin: 20,
      }}
    >
      <UaSigil width={72} height={72} />
    </div>
  )
}
