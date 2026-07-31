// SingularitySigil preview cells — the terminal mark. Both props are required
// here (no defaults), so every cell states its size and color explicitly.
import { SingularitySigil } from 'worldzero-frontend'

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
      <SingularitySigil size={24} color="var(--faction-singularity)" />
      <SingularitySigil size={48} color="var(--faction-singularity)" />
      <SingularitySigil size={96} color="var(--faction-singularity)" />
    </div>
  )
}

/** On the dark terminal sheet the faction actually wears. */
export function OnTerminalSheet() {
  return (
    <div
      style={{
        ...row,
        background: 'var(--faction-singularity-card-bg)',
        borderRadius: 8,
        margin: 20,
      }}
    >
      <SingularitySigil size={72} color="var(--faction-singularity-card-accent)" />
    </div>
  )
}
