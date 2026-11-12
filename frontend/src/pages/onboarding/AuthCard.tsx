import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import SignInOptions from '../../components/SignInOptions'
import { markOnboardingHandoff } from '../../utils/onboardingResume'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * Stop 2: somewhere to keep a score.
 *
 * Both providers come from `SignInOptions`, neither privileged; no provider is
 * named in the framing copy (#1738). `loginWith` is a full navigation, so
 * `markOnboardingHandoff` runs last (see `utils/onboardingResume`). Skipped when a
 * session exists (`Onboarding.tsx` decides).
 *
 * The body is a factual claim on a consent surface (#2766): it names what is
 * stored. `OAuthProvider.provider_user_id` is a known gap recorded there.
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
      // `className=''` drops `.btn-primary`: the sheet wears na's card ink.
      actions={<SignInOptions className="" style={primaryControl} onChoose={markOnboardingHandoff} />}
    >
      <p style={prose}>{t('auth.body')}</p>
    </OnboardingCard>
  )
}
