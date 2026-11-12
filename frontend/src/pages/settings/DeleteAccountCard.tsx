import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { deleteMyAccount, getMyCharacters } from '../../api/me'
import { extractError } from '../../utils/errors'
import { factionCssVar } from '../../utils/factions'
import ConfirmDialog from '../../components/confirm/ConfirmDialog'
import SettingsCard from './SettingsCard'
import { emailAuthorises, livesEnding, runDeleteAccount } from './deleteAccount'
import { importAccountDeleted } from '../accountDeletedLoader'

/**
 * The danger zone (#2161): a second card in the Account section, id
 * `sec-account-danger` (two cards cannot share an id; the rail lists neither
 * separately). Design corrections live in `deleteAccount.ts`.
 *
 * `settings.danger.lead` ("points you awarded stay") is true only because
 * `services/account_deletion.py` tombstones rather than hard-deletes (ADR-0081).
 * Change that and this copy must change too.
 */

/** Outline, quieter than the dialog's filled confirm. Ink is `-card-alarm`, not
 *  `--color-danger` (~4.35:1 on the danger veil in light vs ~7.3/8.1:1). `null`
 *  slug = neutral `default` family (#2539). */
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
  /** Roster, null while loading. Fetched on OPEN; `/auth/me` has one life only. */
  const [lives, setLives] = useState<readonly string[] | null>(null)

  /** A ref: a second press must be refused before any re-render. */
  const deleting = useRef(false)

  const email = user?.email ?? ''

  useEffect(() => {
    if (!open) return
    // Warm the farewell chunk now; the sequence awaits it after the account is
    // gone. A failed warm is the sequence's to handle.
    void importAccountDeleted().catch(() => {})
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

  // No email (no OAuth row) = unarmable, so hidden.
  // ponytail: such an account cannot self-delete; upgrade is the provider handle
  // as a second key, which needs a new wire field.
  if (!email) return null

  const close = () => {
    setOpen(false)
    setTyped('')
    setFailure('')
  }

  const ending = livesEnding(lives ?? [])
  // Also held until the roster loads: the dialog must say what ends.
  const armed = lives !== null && emailAuthorises(typed, email)

  const confirm = runDeleteAccount(
    deleteMyAccount,
    signOut,
    importAccountDeleted,
    () => navigate('/goodbye', { replace: true }),
    setFailure,
    extractError,
    deleting,
    close,
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
            {/* Named, not just counted: the lives a player has forgotten. */}
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
            // Autofill would remove the friction; autocorrect makes invisible misses.
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
