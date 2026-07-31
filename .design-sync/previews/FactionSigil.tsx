// FactionSigil preview cells — the dispatcher. Hand it a slug and it draws that
// faction's own mark; every cell here is the same call with a different slug, so
// the sweep IS the set of marks the site can show.
import { FactionSigil } from 'worldzero-frontend'
import { FACTION_SLUGS } from './_fixtures'

const grid: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
}
const cell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  minWidth: 96,
}
const label: React.CSSProperties = {
  font: 'var(--text-xs, 12px)/1.2 var(--font-body, system-ui)',
  color: 'var(--color-text-tertiary)',
}

/** Every live faction's mark, dispatched by slug. */
export function EveryFaction() {
  return (
    <div style={grid}>
      {FACTION_SLUGS.map((slug) => (
        <div key={slug} style={cell}>
          <FactionSigil slug={slug} size={56} />
          <span style={label}>{slug}</span>
        </div>
      ))}
    </div>
  )
}

/** An unaffiliated player, and a slug the registry has never heard of — both
 *  land on the neutral default mark rather than impersonating a faction. */
export function UnaffiliatedAndUnknown() {
  return (
    <div style={grid}>
      <div style={cell}>
        <FactionSigil slug="na" size={56} />
        <span style={label}>na</span>
      </div>
      <div style={cell}>
        <FactionSigil slug="not_a_faction" size={56} />
        <span style={label}>unknown</span>
      </div>
    </div>
  )
}

/** The size run the site actually uses: chip, card, hero. */
export function SizeRun() {
  return (
    <div style={{ ...grid, alignItems: 'flex-end' }}>
      <FactionSigil slug="ua" size={24} />
      <FactionSigil slug="ua" size={48} />
      <FactionSigil slug="ua" size={96} />
    </div>
  )
}
