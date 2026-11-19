import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearOnboardingHandoff, clearTermsAcceptance, onboardingHandoffPending } from '../utils/onboardingResume'
import { resolveHandoffDestination } from '../utils/onboardingHandoff'
import OnboardingFlow from './onboarding/OnboardingFlow'
import { watchStageFit } from './onboarding/fitStage'

/** `/start`: the QR code's arc (`docs/spec/SPEC-onboarding.md`), unguarded. The flow is `OnboardingFlow`; this page owns the hand-off and the one resume, the OAuth round trip (`utils/onboardingResume`), consumed on mount. */
export default function Onboarding() {
  const navigate = useNavigate()

  // Read once (not in render, which StrictMode double-invokes); cleared in the effect.
  const [resumed] = useState(onboardingHandoffPending)

  useEffect(() => {
    clearOnboardingHandoff()
    // A cold open runs the full flow; a stale held click must not skip the contract.
    if (!resumed) clearTermsAcceptance()
  }, [resumed])

  useEffect(watchStageFit, [])

  return (
    <OnboardingFlow
      resumed={resumed}
      onAccepted={() => {
        // A player with a character; one without creates it inside the flow.
        // Reads `task.start_here`, the mark's own predicate; none marked → `/`.
        void resolveHandoffDestination('/').then(navigate)
      }}
    />
  )
}
