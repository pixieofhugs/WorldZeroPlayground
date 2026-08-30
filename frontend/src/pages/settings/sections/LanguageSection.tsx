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
 * Language and region (#2157) — one honest fact, and a way to ask for another.
 *
 * THE STATIC ROW IS THE TRUE ONE. `i18n.ts` initialises `lng: 'en'` with a
 * single locale, so "Language: English" is a statement, not a control. The
 * design draws it that way and this does not add a picker behind it.
 *
 * THE REQUEST GOES DOWN `POST /contact`, WHICH IS THE WHOLE BACKEND. A request
 * lands as a `ContactMessage` and is already readable in the Moderation tab's
 * inbox (`GET /admin/messages`); the owner ruled that counting them by eye at
 * this volume is the correct algorithm, and the rows are all still there to
 * migrate from if it ever stops being. There is no `language_requests` table
 * and this file must not grow one.
 *
 * THE FIELD IS FREE TEXT, NOT A PICKER. A dropdown forces us to guess the list,
 * and "Brazilian Portuguese, not European" is exactly the nuance worth
 * capturing. It is capped instead — see {@link LANGUAGE_REQUEST_MAX}.
 *
 * "REQUEST SENT" IS NOT PERSISTED, AND THAT IS THE DESIGN BEING CORRECTED. The
 * canvas keeps the button flipped to "Request sent" for good. A ContactMessage
 * leaves NO per-account record to read back, so that state could only live in
 * this component and would vanish on reload — a lie the moment the reader
 * refreshes. The confirmation below is transient on purpose: it survives until
 * the reader types again or leaves, which is exactly as long as the fact it
 * reports is knowable.
 *
 * COPY CORRECTION: the canvas says the setting "Applies to menus, labels, and
 * email." There is no email. `settings.language.currentHelp` says "menus and
 * labels" until notification delivery ships.
 */

type ContactMessageIn = components['schemas']['ContactMessageIn']

/**
 * The cap on what a reader may type. A language name, plus room for the
 * qualifier that makes the request useful ("Portuguese (Brazil)") — and far
 * under the backend's 5000-character `message` limit, which is a body cap
 * rather than a field one. Enforced natively by `maxLength` on the input AND
 * again in {@link languageRequestBody}, because the attribute is a UI courtesy
 * and the builder is the trust boundary.
 */
export const LANGUAGE_REQUEST_MAX = 60

/**
 * The marker the moderation inbox reads. Deliberately NOT in the copy catalog:
 * it is not user-facing text, it is how whoever opens `GET /admin/messages`
 * tells a language request apart from a support message. It stays English
 * whatever the reader's locale is, which is the point.
 */
const MESSAGE_PREFIX = 'Language request: '

/**
 * The `POST /contact` body for this request, or `null` when there is not enough
 * to send one.
 *
 * SEPARATE AND PURE BECAUSE IT IS THE ONLY LOGIC HERE. It is also the single
 * answer to two questions the component would otherwise answer twice and
 * differently: whether the request row may be shown at all, and what gets sent
 * when it is submitted. `name` and `email` both have `min_length=1` on the
 * server (`backend/schemas/contact.py`), so an account with no character or no
 * address cannot produce a valid body — and a control that can only 422 is one
 * the reader should not be shown.
 */
export function languageRequestBody(
  user: CurrentUser | null,
  language: string,
): ContactMessageIn | null {
  // `?.` on two fields the schema types as required, because this runs on every
  // Settings mount and a throw here white-screens the whole page. `email`
  // defaults to "" server-side, so a body missing it is what a partial answer
  // looks like — and there is exactly one honest reading of that: no identity.
  const name = user?.character?.display_name?.trim() ?? ''
  const email = user?.email?.trim() ?? ''
  const wanted = language.trim().slice(0, LANGUAGE_REQUEST_MAX)
  if (!name || !email || !wanted) return null
  return { name, email, message: `${MESSAGE_PREFIX}${wanted}` }
}

/** The design's static-value pill (`sec-language`, which is this section),
 *  mapped to tokens: `10px 14px` to the space scale, `--wz-well` to the
 *  `--switch-*` control chrome that already holds that exact `color-mix`, and
 *  13px up to the content floor. ponytail: `AccountSection` carries the same
 *  object — it lifted the geometry from here — and the two are one hoist into
 *  `settings/` apart. Not done in this PR because #2161 owns that file this
 *  batch and a shared constant would have both PRs editing it. */
const VALUE_PILL: CSSProperties = {
  minWidth: 0,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 999,
  border: '1px solid var(--color-border)',
  background: 'var(--switch-well)',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)',
}

/** Field and button on one line, wrapping to two when the row's control column
 *  cannot hold both — the same posture `SettingsRow` takes one level up. */
const REQUEST_FORM: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  minWidth: 0,
}

/** The canvas' `inputStyle`, in tokens. `1 1 14ch` rather than a fixed width so
 *  the field gives the button its line back before it wraps. */
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

/** The confirmation / failure line, on its own row under the control. */
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

  // Hidden exactly when a submit could not be built — one condition, asked of
  // the builder itself rather than restated here where it could drift.
  const canRequest = languageRequestBody(user, 'probe') !== null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const body = languageRequestBody(user, language)
    // `required` on the input already stops the empty case in a browser; this
    // is the same answer for anything that gets past it.
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
              // Typing again retires the confirmation: it reports the request
              // that was just sent, not this one.
              onChange={(e) => {
                setLanguage(e.target.value)
                setSent(false)
              }}
              // No visible label — the row's title is the label, and repeating
              // it above the field would say "Request another language" twice.
              // The field still has a name for anyone not reading the row.
              aria-label={t('settings.language.requestField')}
              placeholder={t('settings.language.requestField')}
              className="font-body"
              style={FIELD}
              data-testid="settings-language-input"
            />
            {/* Not `disabled` while in flight: the guard above is what stops a
                second submit, and a dimmed button is a contrast problem for a
                state that lasts one round trip. The label carries it. */}
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
