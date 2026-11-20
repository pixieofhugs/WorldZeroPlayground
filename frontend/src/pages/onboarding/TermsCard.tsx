import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { acceptTerms } from '../../api/terms'
import { extractError } from '../../utils/errors'
import i18n from '../../i18n'
import OnboardingCard, { primaryControl } from './OnboardingCard'
import Quill from './Quill'

/**
 * The contract, before sign-in. `record` is the request, so a guest can defer it
 * (hold the click; the flow writes the row once the account exists).
 *
 * The frame points at the document rather than summarising it (#2766); the
 * body's acknowledgement and the flippant control were both owner-ruled, and
 * move together. The document is the Disclaimer verbatim (`common:disclaimer.*`,
 * shared with `pages/Disclaimer.tsx`; wording from #2789).
 *
 * No version shown: `CURRENT_TERMS_VERSION` is server-side only. Reached only
 * a session only when the caller's `record` is the API call. No in-flight guard: the log is
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

const SIGN_MS = 900
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export default function TermsCard({
  onAccepted,
  onBack,
  onDecline,
  record = acceptTerms,
}: {
  onAccepted: () => void
  onBack?: () => void
  onDecline?: () => void
  record?: () => Promise<unknown>
}) {
  const { t } = useTranslation('onboarding')
  const { t: tCommon } = useTranslation('common')
  const [failed, setFailed] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  // The quill signs for 0.9s, then the flow moves on; reduced motion skips straight through.
  const signThenGo = () => {
    if (reducedMotion()) return onAccepted()
    setSigning(true)
    timer.current = setTimeout(onAccepted, SIGN_MS)
  }
  const accept = runTermsAccept(record, signThenGo, setFailed)

  return (
    <div className={`ob-contract ${signing ? 'ob-signing' : ''}`}>
      <OnboardingCard
        step={3}
        title={t('terms.title')}
        onBack={onBack}
        onLookAround={onDecline}
        actions={
          <button type="button" onClick={accept} disabled={signing} style={primaryControl} data-testid="onboarding-accept-terms">
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
          <p style={prose}>{tCommon('disclaimer.p4')}</p>
          <p style={lastUpdated}>{tCommon('disclaimer.lastUpdated')}</p>
        </div>

        {failed && <p style={failure}>{failed}</p>}
      </OnboardingCard>

      <div aria-hidden="true" className="ob-sheet ob-sigstrip" data-testid="onboarding-signature">
        <span className="ob-lora ob-sigx">{'x'}</span>
        <span className="ob-sigline" />
        <svg className="ob-sig" viewBox="0 0 200 40" width="200" height="40">
          <path d="M4 30 C 10 4, 22 4, 18 26 C 16 36, 30 12, 34 22 C 36 30, 42 14, 48 22 C 52 30, 58 6, 64 20 C 68 32, 80 30, 76 20 C 72 10, 88 12, 96 24 C 102 32, 112 14, 120 22 C 128 30, 140 18, 196 26" />
        </svg>
        <span className="ob-quill">
          <Quill />
        </span>
      </div>
    </div>
  )
}
