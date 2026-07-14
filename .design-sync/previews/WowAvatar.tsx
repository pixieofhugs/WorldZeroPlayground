// WowAvatar preview cells. Hardcoded to the Wide World (Wow) chrome — the
// bright, playful faction skin. Tiny 24–32px chip, so each cell packs a
// labeled row.
import { WowAvatar } from 'worldzero-frontend'
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
        <WowAvatar character={characterFor('wow', { username: 'pip_marigold' })} size="sm" />
      </Chip>
      <Chip label="md">
        <WowAvatar character={characterFor('wow', { username: 'pip_marigold' })} size="md" />
      </Chip>
      <Chip label="md · other">
        <WowAvatar character={characterFor('wow', { username: 'juno_bell' })} size="md" />
      </Chip>
    </div>
  )
}

/** The uploaded-portrait branch beside the reliable fallback. */
export function Portrait() {
  return (
    <div style={wrap}>
      <Chip label="sm · portrait">
        <WowAvatar character={characterFor('wow', { avatar_url: 'media/avatars/pip.jpg' })} size="sm" />
      </Chip>
      <Chip label="md · portrait">
        <WowAvatar character={characterFor('wow', { avatar_url: 'media/avatars/pip.jpg' })} size="md" />
      </Chip>
    </div>
  )
}
