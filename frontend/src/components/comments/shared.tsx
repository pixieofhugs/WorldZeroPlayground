/**
 * Shared comment-archetype contract + slot primitives (ADR-0006 / ADR-0018).
 *
 * One per-faction Comment surface, two render modes. A faction component lives in
 * voices/ and switches on `props.mode`; the dispatcher (CommentThread) picks the
 * slug. These helpers keep the three invariant slots — author identity · body ·
 * timestamp+edited — and the composer mechanics out of every voice so each voice
 * only owns its chrome.
 */
import type { ComponentType } from 'react'
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
}: {
  body: string
  mentions: CommentMention[]
  accent?: string
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
                style={{ color: accent ?? 'inherit', fontWeight: 600, textDecoration: 'none' }}
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
  bg = 'transparent',
  text = 'inherit',
  maxLength,
  submitLabel,
  submittingLabel,
  onCancel,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  accent: string
  bg?: string
  text?: string
  /** Cap the body length (edit mode passes MAX_COMMENT_BODY) + light a live count. */
  maxLength?: number
  /** Override the default "Post" affordance (edit mode → "Save"). */
  submitLabel?: string
  submittingLabel?: string
  /** When set, renders a neutral Cancel affordance beside submit (edit mode). */
  onCancel?: () => void
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
            padding: '8px 10px',
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
          gap: 8,
          marginTop: 6,
        }}
      >
        {maxLength != null ? (
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-tertiary)' }}>
            {t('comments.charCount', { count: value.length, max: maxLength })}
          </span>
        ) : (
          <span />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onCancel && (
            <button
              onClick={onCancel}
              className="font-body eyebrow hover:underline"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
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
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 14px',
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
