import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { clearOnboardingHandoff, onboardingHandoffPending } from '../utils/onboardingResume'
import { resolveHandoffDestination } from '../utils/onboardingHandoff'
import OnboardingFlow from './onboarding/OnboardingFlow'

/**
 * `/start` — the QR code's arc to character creation, shared with Home's
 * logged-out CTA (`docs/spec/SPEC-onboarding.md`). No `ProtectedRoute`.
 *
 *     title → beats 1 to 7 → (session? no: auth) → terms → hand off
 *
 * The flow itself is `onboarding/OnboardingFlow`; this page owns the hand-off.
 * A scan always re-runs from the top (the consent log takes another row). The
 * one resume is the OAuth round trip (`utils/onboardingResume`), which lands on
 * the contract step, consumed on mount so it fires at most once.
 */
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
