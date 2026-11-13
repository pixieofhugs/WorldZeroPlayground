/**
 * Shared comment-archetype contract + slot primitives (ADR-0006 / ADR-0018). Each
 * voice in voices/ switches on `props.mode` and owns only its chrome.
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
  onEdited?: (updated: CommentOut) => void
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

/** Pad a comment author to the CharacterOut FactionAvatar wants (it reads 3 fields). */
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
  /** na tell (#970): mentions in `.rainbow-ink` spectrum instead of `accent`. */
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
                // rainbow: no inline `color`, or it would beat the gradient clip.
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

/** Courtesy mirror of `MAX_COMMENT_BODY` in `backend/models/comment.py` (which enforces); keep in step by hand. */
export const MAX_COMMENT_BODY = 500

/** Shared composer body: textarea + post button; each voice wraps it in its chrome. */
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
  /** AA ink on the `accent` submit (#924): `--faction-{slug}-on-accent`, not `-on-fill`. */
  onAccent: string
  bg?: string
  text?: string
  /** Body cap + live count; defaults to `MAX_COMMENT_BODY` so no voice omits it (#1205). */
  maxLength?: number
  /** Override the default "Post" affordance (edit mode → "Save"). */
  submitLabel?: string
  submittingLabel?: string
  /** When set, renders a neutral Cancel affordance beside submit (edit mode). */
  onCancel?: () => void
  /** Foot's left slot, the "@ to mention" hint (#1195); defaults to the neutral caption. */
  hint?: ReactNode
}) {
  const { t } = useTranslation('praxis')
  // Legacy bodies can exceed the cap and `maxLength` won't truncate a seeded value:
  // block the save rather than eat a 422 (#1205).
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
      {/* The foot wraps (#2238) so a narrow leaf drops the hint rather than crush the row. */}
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
          // Same tier as the count, so it inherits that count's legibility.
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-tertiary)' }}>
            {t('comments.mentionHint')}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span
            style={{
              fontSize: 'var(--text-md)',
              // One token (#2238): `nowrap` beats an inherited `overflow-wrap: anywhere`
              // (Ephemerists); no shrink, or it is squeezed to overflow.
              whiteSpace: 'nowrap',
              flexShrink: 0,
              // Danger ink is the only signal that the save is blocked.
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
