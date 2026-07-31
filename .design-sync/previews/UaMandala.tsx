// UaMandala preview cells — the UA ornament. It is a parameterised generator
// (rings, petals, rotation, strength), so the cells sweep the knobs that change
// what it draws rather than just its size. `spin` is left off: a captured cell
// cannot show animation, and a still of a spinning mandala is the same still.
import { UaMandala } from 'worldzero-frontend'

const row: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 32,
}

/** The three strengths — full, texture, absent — at one size. */
export function StrengthRun() {
  return (
    <div style={row}>
      <UaMandala size={120} strength="full" />
      <UaMandala size={120} strength="texture" />
      <UaMandala size={120} strength="absent" />
    </div>
  )
}

/** Denser and sparser geometry: rings and petals-per-ring. */
export function GeometryRun() {
  return (
    <div style={row}>
      <UaMandala size={120} rings={2} petalsPerRing={8} />
      <UaMandala size={120} rings={4} petalsPerRing={12} />
      <UaMandala size={120} rings={6} petalsPerRing={18} />
    </div>
  )
}

/** On the UA card sheet, tinted and turned — how it actually sits behind content. */
export function OnCardSheet() {
  return (
    <div
      style={{
        ...row,
        background: 'var(--faction-ua-card-bg)',
        borderRadius: 8,
        margin: 20,
      }}
    >
      <UaMandala size={160} rotation={18} opacity={0.5} color="var(--faction-ua-card-accent)" />
    </div>
  )
}
