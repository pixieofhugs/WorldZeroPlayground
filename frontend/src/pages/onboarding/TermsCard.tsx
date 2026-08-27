import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { acceptTerms } from '../../api/terms'
import { extractError } from '../../utils/errors'
import i18n from '../../i18n'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * Stop 3 — the agreement, and the only card on this route whose document is
 * real copy rather than a placeholder.
 *
 * THE DOCUMENT IS THE DISCLAIMER, VERBATIM (`common:disclaimer.*`) — the same
 * three paragraphs `pages/Disclaimer.tsx` renders, read from the same keys so
 * the two can never drift. `main` auto-deploys, so a placeholder here would
 * ship placeholder legal text to production; the owner's revised wording landed
 * on #2789 (four paragraphs became three) and is what both surfaces now show
 * (`docs/spec/SPEC-onboarding.md` § Terms, § Before this can ship).
 *
 * NO VERSION IS DISPLAYED. `CURRENT_TERMS_VERSION` is the server's constant and
 * the route writes it into the log without being told; printing "v1" here would
 * be a second copy of it on the client. The revised document carries no version
 * identifier of its own, and whether the constant bumps now that the wording has
 * changed is a backend question #2789 does not answer — the note that says it
 * does is on `backend/models/terms_acceptance.py`.
 *
 * ACCEPTED AFTER AUTH, and this card is only ever reached with a session — the
 * endpoint is `Depends(get_current_account)` and consent binds to an account,
 * not to a browser.
 *
 * NO IN-FLIGHT GUARD, deliberately. A double tap writes two rows and both are
 * the truth: the log is append-only precisely because a scan re-runs this card,
 * so there is no duplicate to collapse and nothing to protect against.
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
  // The app's error INK (index.css §"the danger / warning FILL family"), themed
  // in both cascades and already measured against the na sheet.
  color: 'var(--color-danger)',
}

/**
 * The accept wiring, extracted so it is reachable from the DOM-less harness —
 * the same move `auth/AuthContext.runSignOut` makes, and for the same reason:
 * `renderToStaticMarkup` runs no effects and dispatches no events, so a handler
 * closed over inside the component can never be exercised.
 */
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

      {/* The real document. Three paragraphs and a date, from the keys
          `pages/Disclaimer.tsx` reads — not a second copy of them. */}
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
