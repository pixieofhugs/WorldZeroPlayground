/**
 * Shared comment-archetype contract + slot primitives (ADR-0006 / ADR-0018).
 *
 * One per-faction Comment surface, two render modes. A faction component lives in
 * voices/ and switches on `props.mode`; the dispatcher (CommentThread) picks the
 * slug. These helpers keep the three invariant slots — author identity · body ·
 * timestamp+edited — and the composer mechanics out of every voice so each voice
 * only owns its chrome.
 */
import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { CharacterOut } from '../../api/auth'
import type { CommentMention, CommentOut } from '../../api/comments'
import { MentionDropdown, useMentionAutocomplete } from './useMentionAutocomplete'

interface CommentRowProps {
  mode: 'row'
  comment: CommentOut
  /** Lift an author edit back into the thread's list (re-renders with is_edited). */
  onEdited?: (updated: CommentOut) => void
  /** Lift an author withdrawal back into the thread's list (drops the row). */
  onWithdrawn?: (id: number) => void
}

interface CommentComposerProps {
  mode: 'composer'
  character: CharacterOut
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
}

export type CommentProps = CommentRowProps | CommentComposerProps
export type CommentComponent = ComponentType<CommentProps>

/**
 * FactionAvatar wants a full CharacterOut but only reads username / avatar_url /
 * faction_slug. Pad the rest so a comment author can compose the avatar surface.
 */
export function authorToCharacter(
  author: CommentOut['author'],
): CharacterOut {
  return {
    id: author.id,
    username: author.username,
    display_name: author.display_name,
    avatar_url: author.avatar_url,
    faction_slug: author.faction_slug,
    bio: '',
    tagline: '',
    location: '',
    level: 0,
    score: 0,
    all_time_score: 0,
    status: 'active',
    created_at: '',
    badges: [],
    invitations: [],
  }
}

/** Body slot: linkify resolved @mentions, leave unresolved handles as plain text. */
export function MentionText({
  body,
  mentions,
  accent,
  rainbow = false,
}: {
  body: string
  mentions: CommentMention[]
  accent?: string
  /**
   * Opt-in na / Unaffiliated tell (#970): render resolved @mentions as
   * gradient-clipped spectrum text via the shared `.rainbow-ink` class
   * (`--faction-default-rainbow`), instead of the flat `accent` ink. Only the
   * Default (na) voice passes this; every other voice omits it and renders
   * byte-identically.
   */
  rainbow?: boolean
}) {
  if (mentions.length === 0) return <>{body}</>
  const byHandle = new Map(mentions.map((m) => [m.username.toLowerCase(), m]))
  const parts = body.split(/(@[A-Za-z0-9_]+)/g)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const mention = byHandle.get(part.slice(1).toLowerCase())
          if (mention) {
            return (
              <Link
                key={index}
                to={`/characters/${mention.character_id}`}
                className={rainbow ? 'rainbow-ink' : undefined}
                // rainbow: omit inline `color` so `.rainbow-ink`'s transparent
                // fill can reveal the gradient clip; a flat color would win.
                style={{
                  ...(rainbow ? null : { color: accent ?? 'inherit' }),
                  fontWeight: rainbow ? 700 : 600,
                  textDecoration: 'none',
                }}
              >
                {part}
              </Link>
            )
          }
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

/**
 * Courtesy mirror of the backend's `MAX_COMMENT_BODY` (`backend/models/comment.py`).
 *
 * The backend is the real enforcement — the trust boundary (ADR-0006) — and it
 * rejects an over-length body whatever the client does. This constant only buys
 * the author a cap and a live count BEFORE they hit send. There is no endpoint
 * that publishes server limits to the client, so the two literals are kept in
 * step by hand; change one and change the other.
 */
export const MAX_COMMENT_BODY = 500

/**
 * Shared composer body: textarea + post button. Each voice wraps this in its own
 * chrome and passes its accent (and optional surface/text colors for dark frames).
 */
export function ComposerControls({
  value,
  onChange,
  onSubmit,
  submitting,
  accent,
  onAccent,
  bg = 'transparent',
  text = 'inherit',
  maxLength = MAX_COMMENT_BODY,
  submitLabel,
  submittingLabel,
  onCancel,
  hint,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  accent: string
  /**
   * AA-legible ink for the submit button, which is painted in `accent` (#924).
   * A voice passes `var(--faction-{slug}-on-accent)` — the ink measured on its
   * composer accent, which is NOT `-on-fill` (that ink is measured on the fill).
   */
  onAccent: string
  bg?: string
  text?: string
  /**
   * Cap the body length + light a live count. DEFAULTS to `MAX_COMMENT_BODY`
   * (#1205), so the cap is opt-out rather than opt-in: composing and editing are
   * capped alike, and none of the nine voices can drop the cap by forgetting to
   * pass it. It used to be edit-only, which is exactly how the composer ended up
   * with no cap and no counter at all.
   */
  maxLength?: number
  /** Override the default "Post" affordance (edit mode → "Save"). */
  submitLabel?: string
  submittingLabel?: string
  /** When set, renders a neutral Cancel affordance beside submit (edit mode). */
  onCancel?: () => void
  /**
   * Caption for the foot's left slot — the composer's "@ to mention" hint
   * (#1195). A ReactNode rather than a string, because the slot is shared and
   * the dress is the voice's: a voice OVERRIDES this to speak in its own ink.
   *
   * It defaults to the neutral caption below rather than to nothing, so the
   * affordance is opt-OUT. The placeholder used to carry "type @ to mention
   * someone" for all eight voices; the design moves that job here, and a
   * default is what keeps the seven voices that have not been redressed yet
   * (#1196–#1202) from silently losing it in the meantime.
   *
   * It no longer yields to the live character count: #1205 caps the composer
   * too, so the count is always lit and "mutually exclusive" would have meant
   * this affordance never showing again. The count sits beside the submit
   * cluster instead, and this slot stays the hint's.
   */
  hint?: ReactNode
}) {
  const { t } = useTranslation('praxis')
  /**
   * A body already longer than the cap is the legacy case (#1205): nothing capped
   * a comment below 2000 before, so a stored body can exceed 500. `maxLength` on
   * a textarea blocks fresh typing but does NOT truncate a seeded value, so such
   * a body loads intact and the author can delete their way under the cap. Block
   * the save while it is over rather than letting the API answer with a 422.
   */
  const overLimit = value.length > maxLength
  const disabled = submitting || value.trim().length === 0 || overLimit
  const mention = useMentionAutocomplete(value, onChange)
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <textarea
          ref={mention.textareaRef}
          value={value}
          onChange={mention.handleChange}
          onKeyDown={mention.handleKeyDown}
          onBlur={mention.close}
          placeholder={t('comments.composerPlaceholder')}
          rows={2}
          maxLength={maxLength}
          disabled={submitting}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mention.open}
          aria-controls="mention-listbox"
          aria-activedescendant={mention.activeOptionId}
          style={{
            width: '100%',
            resize: 'vertical',
            background: bg,
            color: text,
            border: `1px solid ${accent}`,
            borderRadius: 6,
            padding: 'var(--space-sm) var(--space-md)',
            font: 'inherit',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        {mention.open && (
          <MentionDropdown
            results={mention.results}
            highlight={mention.highlight}
            onPick={mention.pick}
          />
        )}
      </div>
      {/*
       * THE FOOT WRAPS (#2238). Three things share this line — the hint, the
       * count, the submit — and a narrow leaf cannot seat them. Crushed, the
       * hint wrapped to two lines, the button's label broke, and the count came
       * apart as `100/5` over `00`. Wrapping moves the deficit to the LINE: the
       * hint drops to its own row and everything on the foot keeps its shape.
       */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
        }}
      >
        {hint ?? (
          // Same tier as the character count across the row, so a voice that
          // never overrides it inherits whatever legibility that count already
          // has on its ground.
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-tertiary)' }}>
            {t('comments.mentionHint')}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span
            style={{
              fontSize: 'var(--text-md)',
              // ONE TOKEN (#2238). `100/500` is a single figure, and a voice
              // whose note body sets `overflow-wrap: anywhere` — the
              // Ephemerists leaf does, so a long unbroken word cannot blow the
              // plate open — hands this span break opportunities between its
              // own digits. `nowrap` beats an inherited `overflow-wrap`; not
              // yielding width is the other half, or the count is simply
              // squeezed until it overflows instead of wrapping.
              whiteSpace: 'nowrap',
              flexShrink: 0,
              // Danger ink is the only signal that the save is blocked, so it
              // carries the over-limit state rather than decorating it.
              color: overLimit ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
            }}
          >
            {t('comments.charCount', { count: value.length, max: maxLength })}
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="font-body label-caption hover:underline"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-xs) var(--space-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {t('comments.cancel')}
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={disabled}
            style={{
              background: accent,
              color: onAccent,
              border: 'none',
              borderRadius: 4,
              padding: 'var(--space-xs) var(--space-lg)',
              cursor: disabled ? 'default' : 'pointer',
              fontSize: 'var(--text-lg)',
              letterSpacing: '0.04em',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {submitting
              ? (submittingLabel ?? t('comments.posting'))
              : (submitLabel ?? t('comments.post'))}
          </button>
        </div>
      </div>
    </div>
  )
}
