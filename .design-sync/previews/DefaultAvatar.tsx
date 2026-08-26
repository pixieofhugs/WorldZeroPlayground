// DefaultAvatar preview cells — the Unaffiliated disc, and the skin every
// unclaimed slug falls through to. `default ≡ na ≡ Unaffiliated` is ONE identity
// (ADR-0039 / 0046 / 0048): this is not a placeholder standing in for a design.
//
// A spectrum conic ring around a monogram disc, with the DefaultSigil corner
// badge clipped to the lower-right. The `ornament` slot is deliberately NOT on
// FactionAvatarProps — it is this component's internal seam, the one
// AlbescentAvatar feeds its inert ring layer through.
import { DefaultAvatar } from 'worldzero-frontend'
import { characterFor } from './_fixtures'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)',
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 28,
  alignItems: 'flex-end',
}
const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  color: 'var(--color-text-secondary, #6b7280)',
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={chip}>
      {children}
      <span>{label}</span>
    </span>
  )
}

const newcomer = characterFor('na', { username: 'newcomer' })

/** The size steps the app mounts, from a comment leaf up to the roster lead. */
export function Sizes() {
  return (
    <div style={wrap}>
      <Chip label="sm · 24">
        <DefaultAvatar character={newcomer} size="sm" />
      </Chip>
      <Chip label="md · 32">
        <DefaultAvatar character={newcomer} size="md" />
      </Chip>
      <Chip label="42 — roster row">
        <DefaultAvatar character={newcomer} size={42} />
      </Chip>
      <Chip label="54 — roster lead">
        <DefaultAvatar character={newcomer} size={54} />
      </Chip>
    </div>
  )
}

/** The badge is a later sibling clipped to the disc's lower-right; `badge={false}`
 *  drops it for surfaces that draw their own mark. */
export function WithAndWithoutBadge() {
  return (
    <div style={wrap}>
      <Chip label="badged (default)">
        <DefaultAvatar character={newcomer} size={54} />
      </Chip>
      <Chip label="badge={false}">
        <DefaultAvatar character={newcomer} size={54} badge={false} />
      </Chip>
    </div>
  )
}

/** Different monograms, and the uploaded-portrait branch (no real file offline,
 *  so the ring and badge chrome show around a blank portrait). */
export function MonogramsAndPortrait() {
  return (
    <div style={wrap}>
      <Chip label="n">
        <DefaultAvatar character={newcomer} size={42} />
      </Chip>
      <Chip label="s">
        <DefaultAvatar character={characterFor('na', { username: 'sam_okafor' })} size={42} />
      </Chip>
      <Chip label="portrait">
        <DefaultAvatar
          character={characterFor('na', { avatar_url: 'media/avatars/sam.jpg' })}
          size={42}
        />
      </Chip>
    </div>
  )
}
