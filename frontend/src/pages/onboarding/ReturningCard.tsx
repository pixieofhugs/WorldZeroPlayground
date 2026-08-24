import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { getReturningPlayer, startFresh } from '../../api/auth'
import { extractError } from '../../utils/errors'
import i18n from '../../i18n'
import OnboardingCard, { primaryControl } from './OnboardingCard'

/**
 * `/start/again` — the consent gate a returning deleted player meets (#2162).
 *
 * NOT A LOCKED DOOR AND NOT A SILENT NEW ACCOUNT. They signed in with the same
 * Google or Discord identity they deleted, inside the ninety days the tombstone
 * is kept (ADR-0081), so the backend recognises them and stops *before* minting
 * anything. This card is the stop.
 *
 * ONE BUTTON, AND IT IS NOT AN OFFER OF THE OLD ACCOUNT (owner ruling
 * 2026-08-17). There is nothing to offer: `delete_account` blanked the
 * characters, the praxis, the comments, and unlinked the media in place. So the
 * sentence names what is gone and the control consents to starting over —
 * naming a restore that cannot happen would be the one genuinely cruel version
 * of this screen.
 *
 * THE ARC CONTINUES FROM HERE. Confirming lands in a fresh account with no
 * character, and `/start` is what walks that account to one — the same stranger
 * path everybody else takes, entered at the same door. Nothing about this card
 * is a second onboarding flow, which is also why it wears `OnboardingCard`'s
 * sheet rather than a look of its own.
 *
 * THE ESCAPE IS THE SHELL'S. Declining is "let me just look around", which
 * `OnboardingCard` renders on every stop — a returning player who does not want
 * a new account simply never presses the button, and no account is created.
 * There is deliberately no "no thanks" control that *does* something: the only
 * thing it could do is what closing the tab already does.
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
  // The app's error INK (index.css §"the danger / warning FILL family"), themed
  // in both cascades and already measured against the na sheet — the same token
  // `TermsCard` uses for the same job.
  color: 'var(--color-danger)',
}

/**
 * `2026-03-03` as *3 March*, in the reader's locale.
 *
 * Split on the hyphens rather than handed to `new Date(string)`: an ISO
 * date-only string is parsed as UTC midnight, so `toLocaleDateString` west of
 * Greenwich renders THE DAY BEFORE. The date is the one fact this card states,
 * and stating it a day out is worse than not stating it.
 *
 * Day and month only, no year — the window is ninety days, so a year would be
 * noise on every single rendering of this sentence.
 */
export function formatDeletedOn(deletedOn: string, locale?: string): string {
  const [year, month, day] = deletedOn.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
  })
}

/**
 * The confirm wiring, extracted so it is reachable from the DOM-less harness —
 * the same move `TermsCard.runTermsAccept` makes, and for the same reason:
 * `renderToStaticMarkup` runs no effects and dispatches no events, so a handler
 * closed over inside the component can never be exercised.
 */
export function runStartFresh(
  consent: () => Promise<unknown>,
  refetch: () => Promise<unknown>,
  onDone: () => void,
  onFailure: (message: string) => void,
): () => Promise<void> {
  return async () => {
    try {
      await consent()
      // The cookie is set, but nothing in this tab knows who it belongs to yet
      // — `/auth/me` is the only thing that answers that.
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
    // A gate with no interrupted sign-in behind it is not an error to report,
    // it is a visitor in the wrong place — so they go to the front of the arc
    // rather than reading about a 404. `replace` so Back does not bounce them
    // straight back into a page that will do this again.
    getReturningPlayer()
      .then((gate) => setDeletedOn(gate.deleted_on))
      .catch(() => navigate('/start', { replace: true }))
  }, [navigate])

  const confirm = runStartFresh(
    startFresh,
    refetch,
    // No character yet, by definition — this account is seconds old. `/start`
    // picks the arc up from there, exactly as it does for any other session
    // without a life on it.
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
      note={t('returning.note')}
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
