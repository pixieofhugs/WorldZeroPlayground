import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearOnboardingHandoff, clearTermsAcceptance, onboardingHandoffPending } from '../utils/onboardingResume'
import { resolveHandoffDestination } from '../utils/onboardingHandoff'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import OnboardingFlow from './onboarding/OnboardingFlow'

/** `/start`: the QR code's arc (`docs/spec/SPEC-onboarding.md`), unguarded. The flow is `OnboardingFlow`; this page owns the hand-off and the one resume, the OAuth round trip (`utils/onboardingResume`), consumed on mount. */
export default function Onboarding() {
  const navigate = useNavigate()
  const { t } = useTranslation('onboarding')
  useDocumentTitle(t('flow.welcome'))

  // Read once (not in render, which StrictMode double-invokes); cleared in the effect.
  const [resumed] = useState(onboardingHandoffPending)
  // `?login` (the NavBar, or the backend's `?login=<code>` bounce) opens on the sign-in view.
  const signIn = useSearchParams()[0].has('login')

  useEffect(() => {
    clearOnboardingHandoff()
    // A cold open runs the full flow; a stale held click must not skip the contract.
    if (!resumed) clearTermsAcceptance()
  }, [resumed])

  return (
    <OnboardingFlow
      resumed={resumed}
      signIn={signIn}
      onAccepted={() => {
        // A player with a character; one without creates it inside the flow.
        // Reads `task.start_here`, the mark's own predicate; none marked → `/`.
        void resolveHandoffDestination('/').then(navigate)
      }}
    />
  )
}
