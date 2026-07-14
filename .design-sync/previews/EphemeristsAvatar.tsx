// EphemeristsAvatar preview cells. Hardcoded to the Ephemerists chrome — the
// archival/cataloguing faction skin. Tiny 24–32px chip, so each cell packs a
// labeled row.
import { EphemeristsAvatar } from 'worldzero-frontend'
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
        <EphemeristsAvatar character={characterFor('ephemerists', { username: 'iris_vale' })} size="sm" />
      </Chip>
      <Chip label="md">
        <EphemeristsAvatar character={characterFor('ephemerists', { username: 'iris_vale' })} size="md" />
      </Chip>
      <Chip label="md · other">
        <EphemeristsAvatar character={characterFor('ephemerists', { username: 'orin_task' })} size="md" />
      </Chip>
    </div>
  )
}

/** The uploaded-portrait branch beside the reliable fallback. */
export function Portrait() {
  return (
    <div style={wrap}>
      <Chip label="sm · portrait">
        <EphemeristsAvatar character={characterFor('ephemerists', { avatar_url: 'media/avatars/iris.jpg' })} size="sm" />
      </Chip>
      <Chip label="md · portrait">
        <EphemeristsAvatar character={characterFor('ephemerists', { avatar_url: 'media/avatars/iris.jpg' })} size="md" />
      </Chip>
    </div>
  )
}
