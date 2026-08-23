import { EphemeristsFactionHero } from 'worldzero-frontend'

// The Ephemerists faction-page hero — a codex frontispiece over a lapis
// celestial field with astrolabe rings and a gold-ruled stat ledger. Hardcoded
// to Ephemerists chrome; the page hands it the name and three raw counts.

export function CodexFrontispiece() {
  return (
    <EphemeristsFactionHero
      slug="ephemerists"
      name="The Ephemerists"
      members={97}
      tasks={51}
      praxes={288}
    />
  )
}

