import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { loginWith, type AuthProvider } from '../api/auth'

/**
 * The sign-in providers, in one place (#1773). Callers: the onboarding auth card
 * (#1861) and the sign-in view the NavBar links to; the caller owns layout.
 * NO PROVIDER NAME IN FRAMING COPY (#1738): only on its own button.
 */
export default function SignInOptions({
  className = 'btn-primary',
  style,
  onChoose,
}: {
  className?: string
  style?: CSSProperties
  /**
   * Runs just before the full-page navigation to the provider. Onboarding uses
   * it to remember it was mid-flow: the callback always returns to `FRONTEND_URL`.
   */
  onChoose?: () => void
}) {
  const { t } = useTranslation('common')
  const go = (provider: AuthProvider) => () => {
    onChoose?.()
    loginWith(provider)
  }
  // Not mapped: literal keys keep the catalog greppable.
  return (
    <>
      <button
        type="button"
        onClick={go('google')}
        className={className}
        style={style}
        data-testid="sign-in-google"
      >
        {t('signIn.google')}
      </button>
      <button
        type="button"
        onClick={go('discord')}
        className={className}
        style={style}
        data-testid="sign-in-discord"
      >
        {t('signIn.discord')}
      </button>
    </>
  )
}
