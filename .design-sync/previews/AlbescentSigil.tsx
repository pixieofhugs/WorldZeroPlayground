// AlbescentSigil preview cells — the labyrinth (Sigil Studies v2). The mark
// carries no palette of its own: it is cut out of the unaffiliated conic, so
// what the cells below are actually showing is how much of the spectrum a given
// SIZE lets through. The three sizes are the study's own — 84, 34 and 15 — and
// the study says the last is the one that decides it.
import { AlbescentSigil } from 'worldzero-frontend'

const row: React.CSSProperties = {
  padding: 28,
  display: 'flex',
  alignItems: 'center',
  gap: 32,
}

/** The study's size run. 15px is the size that decides it. */
export function SizeRun() {
  return (
    <div style={row}>
      <AlbescentSigil size={84} />
      <AlbescentSigil size={34} />
      <AlbescentSigil size={15} />
    </div>
  )
}

/** The mount sizes the app actually asks for: chip, activity rail, roster,
 *  faction-select tile, invitation letter. */
export function MountRun() {
  return (
    <div style={row}>
      <AlbescentSigil size={14} />
      <AlbescentSigil size={18} />
      <AlbescentSigil size={22} />
      <AlbescentSigil size={26} />
      <AlbescentSigil size={44} />
    </div>
  )
}

/** The `color` override — any `background`, not just a colour, which is what
 *  lets the sidebar's rail sample a window of the ramp per row. */
export function Painted() {
  return (
    <div style={row}>
      <AlbescentSigil size={64} />
      <AlbescentSigil size={64} color="var(--faction-default-rainbow) 0% 0 / 600% 100%" />
      <AlbescentSigil size={64} color="var(--color-text-tertiary)" />
    </div>
  )
}
