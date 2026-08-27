import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import SignInOptions from '../../components/SignInOptions'
import { markOnboardingHandoff } from '../../utils/onboardingResume'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * Stop 2 — somewhere to keep a score.
 *
 * BOTH PROVIDERS, NEITHER PRIVILEGED. Google and Discord are both live server
 * side; this is the app's first surface to offer a Discord control at all. They
 * come from `components/SignInOptions`, the one component that knows which
 * providers exist — so they share a style object, a size and a row, and neither
 * is styled as the recommended one. No provider is named in the framing copy
 * either (#1738): a provider is named on the button that goes to it and
 * nowhere else.
 *
 * THE ROUND TRIP. `loginWith` is a full document navigation and the backend
 * callback redirects to a constant, so `markOnboardingHandoff` is the last
 * thing this tab does before it leaves — see `utils/onboardingResume` for the
 * whole of how the flow gets back to the terms card.
 *
 * SKIPPED ENTIRELY WHEN A SESSION EXISTS — the flow's one asymmetry, and it is
 * `Onboarding.tsx` that applies it, not this card.
 *
 * EVERY STRING HERE IS A PLACEHOLDER except the two button labels, which are
 * the shipped `common:signIn.*` copy this card reuses.
 */

const prose: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.55,
  color: 'var(--faction-default-card-text)',
  margin: 0,
}

export default function AuthCard() {
  const { t } = useTranslation('onboarding')

  return (
    <OnboardingCard
      step={2}
      title={t('auth.title')}
      // `className=''` drops `.btn-primary`: on this sheet the primary control
      // is na's card ink, and the app-wide button skin would put a second
      // identity on the card.
      actions={<SignInOptions className="" style={primaryControl} onChoose={markOnboardingHandoff} />}
    >
      <p style={prose}>{t('auth.body')}</p>
    </OnboardingCard>
  )
}
