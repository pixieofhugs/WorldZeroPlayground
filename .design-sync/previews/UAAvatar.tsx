// UAAvatar preview cells. Hardcoded to the UA (salon) chrome: a gilt-ringed
// parchment disc with a regal italic monogram, badged with the heraldic UA
// crest. Tiny 24–32px chip, so each cell packs a labeled row.
import { UAAvatar } from 'worldzero-frontend'
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

/** Initial-letter fallback (the reliable offline render) at both sizes, plus a
 *  second member so a different monogram letter shows. */
export function Fallback() {
  return (
    <div style={wrap}>
      <Chip label="sm">
        <UAAvatar character={characterFor('ua', { username: 'ada_reed' })} size="sm" />
      </Chip>
      <Chip label="md">
        <UAAvatar character={characterFor('ua', { username: 'ada_reed' })} size="md" />
      </Chip>
      <Chip label="md · other">
        <UAAvatar character={characterFor('ua', { username: 'lev_moreau' })} size="md" />
      </Chip>
    </div>
  )
}

/** The uploaded-portrait branch (avatar_url set; no real file offline, so the
 *  gilt ring + crest chrome shows around a blank portrait) beside the fallback. */
export function Portrait() {
  return (
    <div style={wrap}>
      <Chip label="sm · portrait">
        <UAAvatar character={characterFor('ua', { avatar_url: 'media/avatars/ada.jpg' })} size="sm" />
      </Chip>
      <Chip label="md · portrait">
        <UAAvatar character={characterFor('ua', { avatar_url: 'media/avatars/ada.jpg' })} size="md" />
      </Chip>
    </div>
  )
}
