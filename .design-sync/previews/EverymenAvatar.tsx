// EverymenAvatar preview cells. Hardcoded to the Everymen chrome — the plain,
// civic faction skin. Tiny 24–32px chip, so each cell packs a labeled row.
import { EverymenAvatar } from 'worldzero-frontend'
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
        <EverymenAvatar character={characterFor('everymen', { username: 'sam_okafor' })} size="sm" />
      </Chip>
      <Chip label="md">
        <EverymenAvatar character={characterFor('everymen', { username: 'sam_okafor' })} size="md" />
      </Chip>
      <Chip label="md · other">
        <EverymenAvatar character={characterFor('everymen', { username: 'nell_park' })} size="md" />
      </Chip>
    </div>
  )
}

/** The uploaded-portrait branch beside the reliable fallback. */
export function Portrait() {
  return (
    <div style={wrap}>
      <Chip label="sm · portrait">
        <EverymenAvatar character={characterFor('everymen', { avatar_url: 'media/avatars/sam.jpg' })} size="sm" />
      </Chip>
      <Chip label="md · portrait">
        <EverymenAvatar character={characterFor('everymen', { avatar_url: 'media/avatars/sam.jpg' })} size="md" />
      </Chip>
    </div>
  )
}
