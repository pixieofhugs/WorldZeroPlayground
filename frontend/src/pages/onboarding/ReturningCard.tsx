import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { getReturningPlayer, startFresh } from '../../api/auth'
import { extractError } from '../../utils/errors'
import i18n from '../../i18n'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * `/start/again`: the consent gate for a returning deleted player (#2162), inside
 * the 90-day tombstone window (ADR-0081). The backend stops before minting.
 *
 * One button, consenting to start over; it never offers the old account, which
 * `delete_account` already blanked (owner ruling). Confirming continues the
 * normal `/start` arc. Declining is the shell's look-around escape.
 */

const prose: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.55,
  color: 'var(--faction-default-card-text)',
  margin: 0,
}

const failure: CSSProperties = {
  ...prose,
  marginTop: 'var(--space-md)',
  // Error ink, measured on the na sheet (same as `TermsCard`).
  color: 'var(--color-danger)',
}

/**
 * `2026-03-03` as *3 March*, in the reader's locale. Split by hand: `new Date()`
 * parses date-only ISO as UTC, so west of Greenwich it shows the day before.
 * No year: the window is ninety days.
 */
export function formatDeletedOn(deletedOn: string, locale?: string): string {
  const [year, month, day] = deletedOn.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
  })
}

/** Extracted so the DOM-less harness can exercise it (cf. `runTermsAccept`). */
export function runStartFresh(
  consent: () => Promise<unknown>,
  refetch: () => Promise<unknown>,
  onDone: () => void,
  onFailure: (message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      await consent()
      // Cookie set; only `/auth/me` says whose it is.
      await refetch()
      onDone()
    } catch (err) {
      onFailure(extractError(err, i18n.t('onboarding:returning.error')))
    }
  }
}

export default function ReturningCard() {
  const { t } = useTranslation('onboarding')
  const { t: tCommon } = useTranslation('common')
  const { refetch } = useAuth()
  const navigate = useNavigate()
  const [deletedOn, setDeletedOn] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    // No gate behind this visit: send them to the arc's start, not a 404.
    // `replace` so Back does not loop.
    getReturningPlayer()
      .then((gate) => setDeletedOn(gate.deleted_on))
      .catch(() => navigate('/start', { replace: true }))
  }, [navigate])

  const confirm = runStartFresh(
    startFresh,
    refetch,
    // A seconds-old account has no life; `/start` picks it up.
    () => navigate('/start', { replace: true }),
    setFailed,
  )

  if (deletedOn === null) {
    return <div className="page font-body text-muted">{tCommon('loading')}</div>
  }

  return (
    <OnboardingCard
      step={1}
      title={t('returning.title')}
      actions={
        <button
          type="button"
          onClick={confirm}
          style={primaryControl}
          data-testid="returning-start-fresh"
        >
          {t('returning.confirm')}
        </button>
      }
    >
      <p style={prose} data-testid="returning-body">
        {t('returning.body', { date: formatDeletedOn(deletedOn, i18n.language) })}
      </p>

      {failed && <p style={failure}>{failed}</p>}
    </OnboardingCard>
  )
}
