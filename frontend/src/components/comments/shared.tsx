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

export interface CommentRowProps {
  mode: 'row'
  comment: CommentOut
  /** Lift an author edit back into the thread's list (re-renders with is_edited). */
  onEdited?: (updated: CommentOut) => void
  /** Lift an author withdrawal back into the thread's list (drops the row). */
  onWithdrawn?: (id: number) => void
}

export interface CommentComposerProps {
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
    bio: null,
    location: null,
    level: 0,
    score: 0,
    all_time_score: 0,
    status: 'active',
    created_at: '',
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
  maxLength,
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
  /** Cap the body length (edit mode passes MAX_COMMENT_BODY) + light a live count. */
  maxLength?: number
  /** Override the default "Post" affordance (edit mode → "Save"). */
  submitLabel?: string
  submittingLabel?: string
  /** When set, renders a neutral Cancel affordance beside submit (edit mode). */
  onCancel?: () => void
  /**
   * Voice-dressed caption for the foot's left slot — the composer's "@ to
   * mention" hint (#1195). Deliberately a ReactNode rather than a string: the
   * slot is shared, the dress is the voice's. It yields to the live character
   * count, because `maxLength` is only set while EDITING, and the two states
   * are mutually exclusive on the sheet.
   */
  hint?: ReactNode
}) {
  const { t } = useTranslation('praxis')
  const disabled = submitting || value.trim().length === 0
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
        }}
      >
        {maxLength != null ? (
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-tertiary)' }}>
            {t('comments.charCount', { count: value.length, max: maxLength })}
          </span>
        ) : (
          (hint ?? <span />)
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {onCancel && (
            <button
              onClick={onCancel}
              className="font-body eyebrow hover:underline"
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
