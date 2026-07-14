import { SingularityFactionHero } from 'worldzero-frontend'

// Singularity faction-page hero — a terminal boot-sequence frontispiece on a
// phosphor-green/blue printout, with a slow-spinning sigil and a side "system
// readout" stat panel. Always dark; hardcoded to Singularity chrome. The page
// hands it the name, blurb, and three raw counts.

export function BootSequence() {
  return (
    <SingularityFactionHero
      name="Singularity"
      description="Optimization is the only virtue. Log the metric, tighten the variance, submit the proof. The signal rises where the noise is measured, and nothing that cannot be counted is kept."
      members={126}
      tasks={40}
      praxes={608}
    />
  )
}

// Fallback path: the terminal prints its own status line when no blurb is passed.
export function ReadoutFallback() {
  return <SingularityFactionHero name="Singularity" description={null} members={8} tasks={3} praxes={19} />
}
