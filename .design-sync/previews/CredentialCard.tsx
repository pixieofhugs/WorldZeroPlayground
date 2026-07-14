// CredentialCard preview cells — the skinnable faction "passport" card (#271):
// one structure re-skinned per faction via the --faction-<slug>-card-* tokens.
// Portrait ring, name, clamped bio, faction pill, level + score. Cells sweep a
// couple of faction skins plus the neutral (unaffiliated) treatment.
import { CredentialCard } from 'worldzero-frontend'
import { mockCredential } from './_fixtures'

const wrap: React.CSSProperties = { padding: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }

/** The UA skin — gilt-salon credential straight from the fixture. */
export function UASkin() {
  return (
    <div style={wrap}>
      <CredentialCard {...mockCredential} />
    </div>
  )
}

/** Two more faction skins — the Singularity terminal card and the Wow scrap card. */
export function FactionSkins() {
  return (
    <div style={wrap}>
      <CredentialCard
        displayName="node_44"
        handle="node_44"
        bio="Instruments the self. Publishes the raw series, not the story."
        factionSlug="singularity"
        level={6}
        score={512}
        avatarUrl={null}
      />
      <CredentialCard
        displayName="Pip Marigold"
        handle="pip_marigold"
        bio="Chalk on every sidewalk. Believes joy is a public work."
        factionSlug="wow"
        level={3}
        score={140}
        avatarUrl={null}
      />
    </div>
  )
}

/** Unaffiliated — the neutral field treatment: no faction pill, blank-passport bio. */
export function Unaffiliated() {
  return (
    <div style={wrap}>
      <CredentialCard
        displayName="New Recruit"
        handle="new_recruit"
        bio={null}
        factionSlug={null}
        level={0}
        score={0}
        avatarUrl={null}
      />
    </div>
  )
}
