import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { clearOnboardingHandoff, onboardingHandoffPending } from '../utils/onboardingResume'
import { resolveHandoffDestination } from '../utils/onboardingHandoff'
import OnboardingFlow from './onboarding/OnboardingFlow'

/** `/start`: the QR code's arc (`docs/spec/SPEC-onboarding.md`), unguarded. The flow is `OnboardingFlow`; this page owns the hand-off and the one resume, the OAuth round trip (`utils/onboardingResume`), consumed on mount. */
export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Read once (not in render, which StrictMode double-invokes); cleared in the effect.
  const [resumed] = useState(onboardingHandoffPending)

  useEffect(() => {
    clearOnboardingHandoff()
  }, [])

  return (
    <OnboardingFlow
      resumed={resumed}
      onAccepted={() => {
        // The hand-off. Where creation lands is `CreateCharacter`'s call.
        if (!user?.character) return navigate('/characters/create')
        // Reads `task.start_here`, the mark's own predicate; none marked → `/`.
        void resolveHandoffDestination('/').then(navigate)
      }}
    />
  )
}
