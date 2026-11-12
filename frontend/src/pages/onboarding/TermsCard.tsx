import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { acceptTerms } from '../../api/terms'
import { extractError } from '../../utils/errors'
import i18n from '../../i18n'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * Stop 3: the agreement.
 *
 * The frame points at the document rather than summarising it (#2766); the
 * body's acknowledgement and the flippant control were both owner-ruled, and
 * move together. The document is the Disclaimer verbatim (`common:disclaimer.*`,
 * shared with `pages/Disclaimer.tsx`; wording from #2789).
 *
 * No version shown: `CURRENT_TERMS_VERSION` is server-side only. Reached only
 * with a session (consent binds to an account). No in-flight guard: the log is
 * append-only, so a double tap is two true rows.
 */

const prose: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.55,
  color: 'var(--faction-default-card-text)',
  margin: 0,
}

const documentBlock: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
  marginTop: 'var(--space-lg)',
  padding: 'var(--space-lg)',
  border: '1px solid var(--faction-default-border)',
  borderRadius: 9,
}

const lastUpdated: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.04em',
  color: 'var(--faction-default-card-muted)',
  margin: 0,
}

const failure: CSSProperties = {
  ...prose,
  marginTop: 'var(--space-md)',
  // Error ink, measured on the na sheet.
  color: 'var(--color-danger)',
}

/** Extracted so the DOM-less harness can exercise it (cf. `runSignOut`). */
export function runTermsAccept(
  record: () => Promise<unknown>,
  onAccepted: () => void,
  onFailure: (message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      await record()
      onAccepted()
    } catch (err) {
      onFailure(extractError(err, i18n.t('onboarding:terms.error')))
    }
  }
}

export default function TermsCard({ onAccepted }: { onAccepted: () => void }) {
  const { t } = useTranslation('onboarding')
  const { t: tCommon } = useTranslation('common')
  const [failed, setFailed] = useState<string | null>(null)

  const accept = runTermsAccept(acceptTerms, onAccepted, setFailed)

  return (
    <OnboardingCard
      step={3}
      title={t('terms.title')}
      actions={
        <button type="button" onClick={accept} style={primaryControl} data-testid="onboarding-accept-terms">
          {t('terms.accept')}
        </button>
      }
    >
      <p style={prose}>{t('terms.body')}</p>

      {/* Same keys `pages/Disclaimer.tsx` reads. */}
      <div style={documentBlock} data-testid="onboarding-terms-document">
        <p style={prose}>{tCommon('disclaimer.p1')}</p>
        <p style={prose}>{tCommon('disclaimer.p2')}</p>
        <p style={prose}>{tCommon('disclaimer.p3')}</p>
        <p style={lastUpdated}>{tCommon('disclaimer.lastUpdated')}</p>
      </div>

      {failed && <p style={failure}>{failed}</p>}
    </OnboardingCard>
  )
}
