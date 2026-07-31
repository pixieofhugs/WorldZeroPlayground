// AlbescentSigil preview cells — the hushed mark. Albescent carries no palette
// of its own (it resolves to the neutral default), so the interest here is the
// opacity range: it is a mark that is meant to be almost not there.
import { AlbescentSigil } from 'worldzero-frontend'

const row: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  alignItems: 'flex-end',
  gap: 32,
}

/** The size run: chip, card, hero. */
export function SizeRun() {
  return (
    <div style={row}>
      <AlbescentSigil size={24} />
      <AlbescentSigil size={48} />
      <AlbescentSigil size={96} />
    </div>
  )
}

/** The drift: the same mark fading out, which is the whole Albescent idea. */
export function OpacityRun() {
  return (
    <div style={row}>
      <AlbescentSigil size={64} opacity={1} />
      <AlbescentSigil size={64} opacity={0.6} />
      <AlbescentSigil size={64} opacity={0.25} />
    </div>
  )
}

/** Tinted against the neutral text token. */
export function Tinted() {
  return (
    <div style={row}>
      <AlbescentSigil size={64} color="var(--color-text-primary)" />
      <AlbescentSigil size={64} color="var(--color-text-tertiary)" />
    </div>
  )
}
