// CharacterBadge preview cells — the inline byline chip: a faction avatar plus the
// character's @username, linked to their profile. Small, so each cell composes a
// few badges in a stack to show the faction-avatar range and the two sizes.
import { CharacterBadge } from 'worldzero-frontend'
import { characterFor } from './_fixtures'

const col: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  alignItems: 'flex-start',
}

/** A column of default-size badges across several factions — the avatar changes
 *  skin per faction while the byline stays consistent. */
export function FactionSpread() {
  return (
    <div style={col}>
      <CharacterBadge character={characterFor('ua')} />
      <CharacterBadge character={characterFor('wow')} />
      <CharacterBadge character={characterFor('snide')} />
      <CharacterBadge character={characterFor('singularity')} />
    </div>
  )
}

/** More factions, plus the small size — the compact avatar + xs byline. */
export function SmallSize() {
  return (
    <div style={col}>
      <CharacterBadge character={characterFor('ephemerists')} size="sm" />
      <CharacterBadge character={characterFor('everymen')} size="sm" />
      <CharacterBadge character={characterFor('albescent')} size="sm" />
    </div>
  )
}
