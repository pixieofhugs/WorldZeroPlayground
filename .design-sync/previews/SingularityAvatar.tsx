// SingularityAvatar preview cells. Hardcoded to the Singularity chrome — a
// terminal-black disc in faction monospace with a prompt/cursor sigil badge.
// Always-dark tokens. Tiny 24–32px chip, so each cell packs a labeled row.
import { SingularityAvatar } from 'worldzero-frontend'
import { characterFor } from './_fixtures'

const wrap: React.CSSProperties = { padding: 20, display: 'flex', flexWrap: 'wrap', gap: 24 }
const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  color: 'var(--text-secondary, #6b7280)',
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={chip}>
      {children}
      <span>{label}</span>
    </span>
  )
}

/** Initial-letter fallback at both sizes, plus a second node for a different
 *  monospace initial. */
export function Fallback() {
  return (
    <div style={wrap}>
      <Chip label="sm">
        <SingularityAvatar character={characterFor('singularity', { username: 'node_44' })} size="sm" />
      </Chip>
      <Chip label="md">
        <SingularityAvatar character={characterFor('singularity', { username: 'node_44' })} size="md" />
      </Chip>
      <Chip label="md · other">
        <SingularityAvatar character={characterFor('singularity', { username: 'daemon_7' })} size="md" />
      </Chip>
    </div>
  )
}

/** The uploaded-portrait branch beside the reliable fallback. */
export function Portrait() {
  return (
    <div style={wrap}>
      <Chip label="sm · portrait">
        <SingularityAvatar character={characterFor('singularity', { avatar_url: 'media/avatars/node.jpg' })} size="sm" />
      </Chip>
      <Chip label="md · portrait">
        <SingularityAvatar character={characterFor('singularity', { avatar_url: 'media/avatars/node.jpg' })} size="md" />
      </Chip>
    </div>
  )
}
