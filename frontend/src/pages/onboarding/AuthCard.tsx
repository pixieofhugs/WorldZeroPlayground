import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import SignInOptions from '../../components/SignInOptions'
import { markOnboardingHandoff } from '../../utils/onboardingResume'
import { primaryControl } from './OnboardingCard'
import Wisp from './Wisp'
import './motion/shared.css'
import './motion/login.css'

/** The body is a factual claim on a consent surface (#2766): it names what is stored. `loginWith` navigates away, so the resume mark runs last. */
export default function AuthCard({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation('onboarding')

  return (
    <main className="ob-login">
      <section className="ob-sheet toss ob-auth" aria-labelledby="ob-auth-title">
        <span aria-hidden="true" className="boing ob-auth-mascot">
          <span className="dnA">
            <Wisp size={40} confidence={1} />
          </span>
          <svg className="keyw" viewBox="0 0 22 46" width="22" height="46">
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17 V42 M11 33 h7 M11 40 h5" stroke="var(--faction-default-on-fill)" strokeWidth="7" />
              <circle cx="11" cy="9" r="6.5" stroke="var(--faction-default-on-fill)" strokeWidth="7" />
              <path d="M11 17 V42 M11 33 h7 M11 40 h5" stroke="var(--faction-default-stop-3)" strokeWidth="3.6" />
              <circle cx="11" cy="9" r="6.5" stroke="var(--faction-default-stop-3)" strokeWidth="3.6" />
            </g>
          </svg>
        </span>
        <h1 id="ob-auth-title" className="ob-lora">
          {t('auth.title')}
        </h1>
        <p>{t('auth.body')}</p>
        <div className="ob-auth-actions">
          {/* `className=''` drops `.btn-primary`: the sheet wears na's card ink. */}
          <SignInOptions className="" style={primaryControl} onChoose={markOnboardingHandoff} />
        </div>
        <span className="ob-auth-nav">
          {onBack ? (
            <button type="button" className="ob-ghost ob-cap ob-bk ob-prev" onClick={onBack} data-testid="onboarding-back">
              {t('flow.back')}
            </button>
          ) : (
            <span />
          )}
          <Link to="/tasks" className="ob-ghost ob-cap" data-testid="onboarding-look-around">
            {t('card.lookAround')}
          </Link>
        </span>
      </section>
    </main>
  )
}
