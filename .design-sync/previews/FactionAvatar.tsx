// FactionAvatar preview cells. FactionAvatar is the DISPATCHER: it reads
// character.faction_slug and renders that faction's bespoke avatar, defaulting
// to the neutral `na` skin (spectrum ring + seven-segment sigil) when the slug
// is unaffiliated/unknown. These are tiny 24–32px chips, so each cell packs a
// labeled row of several avatars to read well.
import { FactionAvatar } from 'worldzero-frontend'
import type { CharacterOut } from '../../frontend/src/api/auth'
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
const sizeRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 }

// Faction-appropriate handles so the fallback initial differs per faction.
const HANDLE: Record<string, string> = {
  ua: 'ada_reed',
  wow: 'pip_marigold',
  snide: 'rax_vandal',
  ephemerists: 'iris_vale',
  singularity: 'node_44',
  everymen: 'sam_okafor',
  albescent: 'quiet_hand',
  na: 'newcomer',
}

function person(slug: string, overrides: Partial<CharacterOut> = {}): CharacterOut {
  return characterFor(slug, { username: HANDLE[slug] ?? 'newcomer', ...overrides })
}

/** Label a single avatar with the size that produced it. */
function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={chip}>
      {children}
      <span>{label}</span>
    </span>
  )
}

/** Every faction's avatar side by side (md, initial-letter fallback) — the axis
 *  that actually varies: each faction gets its own ring, disc, and sigil badge. */
export function AcrossFactions() {
  const slugs = ['ua', 'wow', 'snide', 'ephemerists', 'singularity', 'everymen', 'albescent']
  return (
    <div style={wrap}>
      {slugs.map((slug) => (
        <Chip key={slug} label={slug}>
          <FactionAvatar character={person(slug)} size="md" />
        </Chip>
      ))}
    </div>
  )
}

/** The neutral `na` default skin (unaffiliated): thin spectrum ring + the
 *  seven-segment sigil corner mark, at both sizes. */
export function DefaultSkin() {
  return (
    <div style={wrap}>
      <Chip label="na · sm">
        <FactionAvatar character={person('na')} size="sm" />
      </Chip>
      <Chip label="na · md">
        <FactionAvatar character={person('na')} size="md" />
      </Chip>
      <Chip label="unknown slug → na">
        <FactionAvatar character={person('mystery', { faction_slug: 'not_a_faction' })} size="md" />
      </Chip>
    </div>
  )
}

/** sm vs md for a few factions, so the two size steps read side by side. */
export function Sizes() {
  const slugs = ['ua', 'singularity', 'albescent']
  return (
    <div style={wrap}>
      {slugs.map((slug) => (
        <Chip key={slug} label={slug}>
          <span style={sizeRow}>
            <FactionAvatar character={person(slug)} size="sm" />
            <FactionAvatar character={person(slug)} size="md" />
          </span>
        </Chip>
      ))}
    </div>
  )
}

/** The image-path branch: an uploaded avatar_url (no real file offline, so the
 *  ring/badge chrome shows around a blank portrait) beside the reliable
 *  initial-letter fallback. */
export function WithPortrait() {
  return (
    <div style={wrap}>
      <Chip label="ua · portrait">
        <FactionAvatar
          character={person('ua', { avatar_url: 'media/avatars/ada.jpg' })}
          size="md"
        />
      </Chip>
      <Chip label="ua · fallback">
        <FactionAvatar character={person('ua')} size="md" />
      </Chip>
      <Chip label="wow · portrait">
        <FactionAvatar
          character={person('wow', { avatar_url: 'media/avatars/pip.jpg' })}
          size="md"
        />
      </Chip>
      <Chip label="wow · fallback">
        <FactionAvatar character={person('wow')} size="md" />
      </Chip>
    </div>
  )
}
