import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { deleteMyAccount, getMyCharacters } from '../../api/me'
import { extractError } from '../../utils/errors'
import { factionCssVar } from '../../utils/factions'
import ConfirmDialog from '../../components/confirm/ConfirmDialog'
import SettingsCard from './SettingsCard'
import { emailAuthorises, livesEnding, runDeleteAccount } from './deleteAccount'

/**
 * The danger zone (#2161) — the design's `#sec-account`, which is only ever
 * this card.
 *
 * IT IS A SECOND CARD IN THE SAME SECTION, NOT A SECOND SECTION. `sec-account`
 * is already the Account card's anchor and already has a rail item; two
 * `SettingsCard`s cannot share an id, and `SETTINGS_SECTIONS` is not the place
 * to register a card the rail should not list separately. So this takes
 * `sec-account-danger` and rides below the Account card, which is where the
 * design puts it.
 *
 * TWO CORRECTIONS TO THE DRAWN SHEET, both in `deleteAccount.ts` with their
 * reasons: the confirm string is the EMAIL rather than a character name, and
 * the dialog enumerates the lives that end.
 *
 * "POINTS YOU AWARDED TO OTHER PLAYERS STAY WITH THEM" (`settings.danger.lead`)
 * IS TRUE ONLY UNDER THE TOMBSTONE. `services/account_deletion.py` blanks rows
 * in place and leaves the votes cast, which is why that sentence can be said at
 * all (ADR-0081) — the Cookies card says the same thing longhand at
 * `settings.cookies.deletion.body`. If the backend is ever changed to a hard
 * delete, this sentence changes with it or the page starts lying.
 *
 * THE CONFIRM DIALOG IS THE REPO'S, NOT A SECOND ONE. `components/confirm/
 * ConfirmDialog` already owns the overlay, the portal, `role="dialog"`, the
 * Escape listener, the focus trap and the `[dismiss] … [confirm]` footer order.
 * It gained a `children` slot and `confirmDisabled` for this card; the field and
 * the list below are what goes in the slot.
 */

/** The design's `dangerBtnStyle`: an outline, deliberately quieter than the
 *  filled confirm behind it — the loud button is the one inside the dialog.
 *
 *  THE INK IS `-card-alarm`, NOT `--color-danger`. Measured on the ground this
 *  actually composites on (the danger veil over the settings card): the global
 *  danger ink is ~4.35:1 there in LIGHT — the pre-existing global-ink debt
 *  recorded at `--color-danger-veil` — while `--faction-default-card-alarm` is
 *  #991b1b light / #fca5a5 dark and reads ~7.3:1 and ~8.1:1 on the same two
 *  grounds. Settings is not a faction-dispatched surface (#2539), so `null`
 *  resolves the neutral `default` family and nothing here wears a faction. */
const TRIGGER: CSSProperties = {
  marginTop: 'var(--space-lg)',
  padding: 'var(--space-sm) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  border: `1px solid ${factionCssVar(null, 'card-alarm')}`,
  background: 'transparent',
  color: factionCssVar(null, 'card-alarm'),
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

/** The design's `inputStyle`, with the typed value at the content floor — it is
 *  a thing a reader has to proof-read against the sentence above it. */
const FIELD: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-bg-surface-alt)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
}

const LIVES: CSSProperties = {
  margin: 0,
  paddingLeft: 'var(--space-lg)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  color: 'var(--color-text-primary)',
}

export default function DeleteAccountCard({ sectionId }: { readonly sectionId: string }) {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [failure, setFailure] = useState('')
  /** The account's whole roster, or null while it is still being read. Fetched
   *  when the dialog OPENS, not when the card mounts: most readers of this page
   *  never press the button, and `/auth/me` only carries the carried life. */
  const [lives, setLives] = useState<readonly string[] | null>(null)

  const email = user?.email ?? ''

  useEffect(() => {
    if (!open) return
    let live = true
    getMyCharacters()
      .then((roster) => {
        if (live) setLives(roster.map((character) => character.display_name))
      })
      .catch((error: unknown) => {
        if (live) setFailure(extractError(error))
      })
    return () => {
      live = false
    }
  }, [open])

  // A control nobody could ever arm is worse than no control: the confirm
  // string is the email, and `CurrentUser.email` is "" for an account holding
  // no OAuth row. Hidden rather than rendered disabled, per the repo rule.
  // ponytail: such an account currently has no way to delete itself from the
  // UI. The upgrade is a second key for it — the provider handle — and it needs
  // a wire field that does not exist yet.
  if (!email) return null

  const close = () => {
    setOpen(false)
    setTyped('')
    setFailure('')
  }

  const ending = livesEnding(lives ?? [])
  // Held until the roster has answered as well as until the email matches: the
  // dialog's whole job is to say what ends, and it cannot say that yet.
  const armed = lives !== null && emailAuthorises(typed, email)

  const confirm = runDeleteAccount(
    deleteMyAccount,
    signOut,
    () => navigate('/goodbye', { replace: true }),
    setFailure,
    extractError,
  )

  return (
    <SettingsCard
      sectionId={sectionId}
      tone="danger"
      title={t('settings.danger.title')}
      lead={t('settings.danger.lead')}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={TRIGGER}
        data-testid="settings-delete-account"
      >
        {t('settings.danger.action')}
      </button>

      {open && (
        <ConfirmDialog
          request={{
            kind: 'delete-account',
            title: t('settings.danger.dialogTitle'),
            body: t('settings.danger.dialogBody', { email }),
            confirmLabel: t('settings.danger.confirm'),
            danger: true,
          }}
          factionSlug={null}
          confirmDisabled={!armed}
          onConfirm={confirm}
          onDismiss={close}
        >
          <div
            className="flex flex-col"
            style={{ gap: 'var(--space-sm)' }}
            data-testid="settings-delete-lives"
          >
            <p className="font-body content-text" style={{ color: 'var(--color-text-primary)' }}>
              {lives === null
                ? t('settings.danger.livesLoading')
                : ending.kind === 'none'
                  ? t('settings.danger.livesNone')
                  : ending.kind === 'only'
                    ? t('settings.danger.livesOnly', { name: ending.name })
                    : t('settings.danger.livesMore', {
                        name: ending.name,
                        count: ending.others.length,
                      })}
            </p>
            {/* The sentence counts them; this names them. An account's other
                lives are exactly the thing a player has not thought about in
                months, so they are spelled out rather than totalled. */}
            {ending.kind === 'more' && (
              <ul aria-label={t('settings.danger.livesAlso')} style={LIVES}>
                {ending.others.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label={t('settings.danger.fieldLabel')}
            placeholder={email}
            // Off on all four: an autofilled address would hand back the
            // friction this field exists to charge, and a spell-checked,
            // auto-capitalised email is a near miss the reader cannot see.
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={FIELD}
            data-testid="settings-delete-confirm-field"
          />

          {failure && (
            <p
              className="font-body content-text"
              style={{ color: factionCssVar(null, 'card-alarm') }}
              role="alert"
              data-testid="settings-delete-error"
            >
              {failure}
            </p>
          )}
        </ConfirmDialog>
      )}
    </SettingsCard>
  )
}
