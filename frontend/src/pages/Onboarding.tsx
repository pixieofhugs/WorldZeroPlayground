import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { clearOnboardingHandoff, onboardingHandoffPending } from '../utils/onboardingResume'
import { resolveHandoffDestination } from '../utils/onboardingHandoff'
import IntroCard from './onboarding/IntroCard'
import AuthCard from './onboarding/AuthCard'
import TermsCard from './onboarding/TermsCard'

/**
 * `/start` — the QR code's arc to character creation, shared with Home's
 * logged-out CTA (`docs/spec/SPEC-onboarding.md`). No `ProtectedRoute`.
 *
 * State is one boolean ("past the intro?"); whether auth is owed is read from
 * the session each render, so a sign-in elsewhere is never re-asked:
 *
 *     intro → (session? no: auth) → terms → hand off
 *
 * A scan always re-runs from the top (terms show again; the consent log takes
 * another row). The one resume is the OAuth round trip (`utils/onboardingResume`),
 * consumed on mount so it fires at most once.
 */
export default function Onboarding() {
  const { user, loading } = useAuth()
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  // Read once to pick the opening card; cleared in the effect (not in render,
  // which StrictMode double-invokes).
  const [pastIntro, setPastIntro] = useState(onboardingHandoffPending)

  useEffect(() => {
    clearOnboardingHandoff()
  }, [])

  if (!pastIntro) return <IntroCard onContinue={() => setPastIntro(true)} />

  // `user` is null in flight too; don't show a returner the auth card.
  if (loading) return <div className="page font-body text-muted">{t('loading')}</div>

  if (!user) return <AuthCard />

  return (
    <TermsCard
      onAccepted={() => {
        // The hand-off. Where creation lands is `CreateCharacter`'s call.
        if (!user.character) return navigate('/characters/create')
        // Reads `task.start_here`, the mark's own predicate; none marked → `/`.
        void resolveHandoffDestination('/').then(navigate)
      }}
    />
  )
}
