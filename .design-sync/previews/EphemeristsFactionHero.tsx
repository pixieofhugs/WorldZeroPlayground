import { EphemeristsFactionHero } from 'worldzero-frontend'

// The Ephemerists faction-page hero — a codex frontispiece over a lapis
// celestial field with astrolabe rings and a gold-ruled stat ledger. Hardcoded
// to Ephemerists chrome; the page hands it the name, blurb, and three raw counts.

export function CodexFrontispiece() {
  return (
    <EphemeristsFactionHero
      name="The Ephemerists"
      description="We catalogue what is passing before it goes. Every bench, every tide table, every name carved into wet cement — logged, dated, and kept against forgetting."
      members={97}
      tasks={51}
      praxes={288}
    />
  )
}

// Fallback path: the codex supplies its own gloss when the page hands no blurb.
export function LedgerFallback() {
  return <EphemeristsFactionHero name="The Ephemerists" description={null} members={14} tasks={7} praxes={33} />
}
