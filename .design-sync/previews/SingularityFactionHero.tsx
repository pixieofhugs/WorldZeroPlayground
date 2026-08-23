import { SingularityFactionHero } from 'worldzero-frontend'

// Singularity faction-page hero — a terminal boot-sequence frontispiece on a
// phosphor-green/blue printout, with a slow-spinning sigil and a side "system
// readout" stat panel. Always dark; hardcoded to Singularity chrome. The page
// hands it the name and three raw counts.

export function BootSequence() {
  return (
    <SingularityFactionHero
      slug="singularity"
      name="Singularity"
      members={126}
      tasks={40}
      praxes={608}
    />
  )
}

