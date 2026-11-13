import { useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../auth/AuthContext'
import { apiPost } from '../../../api/client'
import { extractError } from '../../../utils/errors'
import type { CurrentUser } from '../../../api/auth'
import type { components } from '../../../api/generated/schema'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'

/**
 * Language and region (#2157). One locale exists (`i18n.ts`), so the language is
 * a statement, not a picker.
 *
 * Requests go to `POST /contact` and are read in the Moderation inbox; owner
 * ruling: no `language_requests` table. Free text, not a dropdown, capped by
 * {@link LANGUAGE_REQUEST_MAX}. "Request sent" is transient: a `ContactMessage`
 * leaves no per-account record, so persisting it would lie after a reload.
 */

type ContactMessageIn = components['schemas']['ContactMessageIn']

/** Room for "Portuguese (Brazil)". Enforced by `maxLength` AND the builder. */
export const LANGUAGE_REQUEST_MAX = 60

/** Inbox marker for moderators; deliberately not in the catalog, always English. */
const MESSAGE_PREFIX = 'Language request: '

/**
 * The `POST /contact` body, or `null` when one cannot be built. Also decides
 * whether the row shows: `name`/`email` are `min_length=1` server-side
 * (`backend/schemas/contact.py`), and a control that can only 422 is hidden.
 */
export function languageRequestBody(
  user: CurrentUser | null,
  language: string,
): ContactMessageIn | null {
  // `?.` despite the schema: runs on every mount, and a throw white-screens it.
  const name = user?.character?.display_name?.trim() ?? ''
  const email = user?.email?.trim() ?? ''
  const wanted = language.trim().slice(0, LANGUAGE_REQUEST_MAX)
  if (!name || !email || !wanted) return null
  return { name, email, message: `${MESSAGE_PREFIX}${wanted}` }
}

/** The design's value pill in tokens. ponytail: duplicated in `AccountSection`;
 *  hoist one shared constant into `settings/`. */
const VALUE_PILL: CSSProperties = {
  minWidth: 0,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 999,
  border: '1px solid var(--color-border)',
  background: 'var(--switch-well)',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)',
}

const REQUEST_FORM: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  minWidth: 0,
}

/** Flexible so the button keeps its line before wrapping. */
const FIELD: CSSProperties = {
  flex: '1 1 14ch',
  minWidth: 0,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-bg-surface-alt)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--text-content)',
}

const STATUS_LINE: CSSProperties = {
  flexBasis: '100%',
  margin: 0,
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  color: 'var(--color-text-secondary)',
}

export default function LanguageSection({ sectionId }: { readonly sectionId: string }) {
  const { t } = useTranslation('common')
  const { user } = useAuth()

  const [language, setLanguage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ask the builder itself, so the condition cannot drift.
  const canRequest = languageRequestBody(user, 'probe') !== null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const body = languageRequestBody(user, language)
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      await apiPost('/contact', { body })
      setLanguage('')
      setSent(true)
    } catch (err) {
      setError(extractError(err, t('settings.language.requestError')))
    } finally {
      setSending(false)
    }
  }

  return (
    <SettingsCard
      sectionId={sectionId}
      title={t('settings.language.eyebrow')}
      lead={t('settings.language.lead')}
    >
      <SettingsRow
        last={!canRequest}
        title={t('settings.language.current')}
        help={t('settings.language.currentHelp')}
      >
        <div style={VALUE_PILL} data-testid="settings-language-current">
          {t('settings.language.currentValue')}
        </div>
      </SettingsRow>

      {canRequest && (
        <SettingsRow
          last
          title={t('settings.language.request')}
          help={t('settings.language.requestHelp')}
        >
          <form onSubmit={submit} style={REQUEST_FORM}>
            <input
              type="text"
              required
              maxLength={LANGUAGE_REQUEST_MAX}
              value={language}
              // Typing again retires the confirmation.
              onChange={(e) => {
                setLanguage(e.target.value)
                setSent(false)
              }}
              // The row title is the visible label.
              aria-label={t('settings.language.requestField')}
              placeholder={t('settings.language.requestField')}
              className="font-body"
              style={FIELD}
              data-testid="settings-language-input"
            />
            {/* Not `disabled` in flight: the guard stops resubmits; dimming hurts contrast. */}
            <button
              type="submit"
              aria-busy={sending || undefined}
              className="btn-outline shrink-0"
              style={{ borderRadius: 'var(--radius-md)' }}
              data-testid="settings-language-submit"
            >
              {sending ? t('settings.language.requestSending') : t('settings.language.requestSubmit')}
            </button>
            {(sent || error) && (
              <p
                role={error ? 'alert' : 'status'}
                style={STATUS_LINE}
                data-testid="settings-language-status"
              >
                {error ?? t('settings.language.requestSent')}
              </p>
            )}
          </form>
        </SettingsRow>
      )}
    </SettingsCard>
  )
}
