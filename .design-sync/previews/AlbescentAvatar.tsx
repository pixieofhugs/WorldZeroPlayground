// AlbescentAvatar preview cells. Hardcoded to the Albescent chrome — a white
// cotton-paper disc with a hairline ink ring and the surveyor's-crosshair mark
// badge. No hue, no crest. Tiny 24–32px chip, so each cell packs a labeled row.
import { AlbescentAvatar } from 'worldzero-frontend'
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

/** Initial-letter fallback at both sizes, plus a second member for a different
 *  initial. */
export function Fallback() {
  return (
    <div style={wrap}>
      <Chip label="sm">
        <AlbescentAvatar character={characterFor('albescent', { username: 'quiet_hand' })} size="sm" />
      </Chip>
      <Chip label="md">
        <AlbescentAvatar character={characterFor('albescent', { username: 'quiet_hand' })} size="md" />
      </Chip>
      <Chip label="md · other">
        <AlbescentAvatar character={characterFor('albescent', { username: 'pale_witness' })} size="md" />
      </Chip>
    </div>
  )
}

/** The uploaded-portrait branch beside the reliable fallback. */
export function Portrait() {
  return (
    <div style={wrap}>
      <Chip label="sm · portrait">
        <AlbescentAvatar character={characterFor('albescent', { avatar_url: 'media/avatars/hand.jpg' })} size="sm" />
      </Chip>
      <Chip label="md · portrait">
        <AlbescentAvatar character={characterFor('albescent', { avatar_url: 'media/avatars/hand.jpg' })} size="md" />
      </Chip>
    </div>
  )
}
