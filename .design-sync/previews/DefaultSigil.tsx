// DefaultSigil preview cells. DefaultSigil is the unaffiliated (`na`) mark — a
// seven-segment spectrum ring (one arc per faction = every path still open),
// built on the --faction-default-ring conic token so it flips to the brightened
// spectrum in dark automatically. Props { size, hole }. It's small, so each
// cell packs several sigils in a labeled row.
import { DefaultSigil } from 'worldzero-frontend'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 32,
  alignItems: 'flex-end',
}
const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  color: 'var(--color-text-secondary, #6b7280)',
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={chip}>
      {children}
      <span>{label}</span>
    </span>
  )
}

/** The spectrum ring at the sizes it appears live: an avatar corner badge, a
 *  card mark, and the large default-surface emblem. */
export function Sizes() {
  return (
    <div style={wrap}>
      <Chip label="20 · badge">
        <DefaultSigil size={20} />
      </Chip>
      <Chip label="32 · card mark">
        <DefaultSigil size={32} />
      </Chip>
      <Chip label="64 · surface">
        <DefaultSigil size={64} />
      </Chip>
      <Chip label="96 · hero">
        <DefaultSigil size={96} />
      </Chip>
    </div>
  )
}

/** The hole axis — a thin ring, the default, and a near-solid disc — all at one
 *  size so the cut-out fraction reads directly. */
export function HoleSizes() {
  return (
    <div style={wrap}>
      <Chip label="hole 0.7 · thin ring">
        <DefaultSigil size={72} hole={0.7} />
      </Chip>
      <Chip label="hole 0.4 · default">
        <DefaultSigil size={72} hole={0.4} />
      </Chip>
      <Chip label="hole 0.15 · near-solid">
        <DefaultSigil size={72} hole={0.15} />
      </Chip>
    </div>
  )
}
