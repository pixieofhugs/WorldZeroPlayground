// LevelPill preview cells. The dark level-requirement pill shared by every
// faction card. Simple canary: a few levels, plus one faction-colored variant.
import { LevelPill } from 'worldzero-frontend'

const row: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: 16,
}

/** Default ink pill at a spread of levels. */
export function Levels() {
  return (
    <div style={row}>
      <LevelPill level={1} />
      <LevelPill level={3} />
      <LevelPill level={5} />
      <LevelPill level={8} />
    </div>
  )
}

/** Faction-colored pill — pass a slug and it adopts that faction's card accent. */
export function FactionColored() {
  return (
    <div style={row}>
      <LevelPill level={4} factionSlug="ua" />
    </div>
  )
}

/** The full faction spread at one level, to compare accents side by side. */
export function AllFactions() {
  const slugs = ['ua', 'wow', 'snide', 'ephemerists', 'singularity', 'everymen', 'albescent']
  return (
    <div style={row}>
      {slugs.map((slug) => (
        <LevelPill key={slug} level={3} factionSlug={slug} />
      ))}
    </div>
  )
}
