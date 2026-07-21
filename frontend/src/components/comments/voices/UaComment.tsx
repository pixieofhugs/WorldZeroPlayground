import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { UaSigil } from '../../cards/UaSigil'
import { UA_DISPLAY, UA_TEXT } from '../../cards/uaAtoms'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

/**
 * UA comment — THE MARGINAL NOTE (kit §14, #851).
 *
 * SUPERSEDES ADR-0026's gilt salon. A UA comment is now a note written in the
 * margin of the work: rag paper, one dashed orange rule down the left edge, an
 * ensō on the composer, and nothing else. No gold-leaf frame, no house line, no
 * ornament. The mandala is ABSENT — a comment thread is the densest text
 * surface in the app (brief §5).
 *
 * The three invariant slots are unchanged (ADR-0016): author identity · body ·
 * timestamp+edited. A posted row takes the AUTHOR's faction; the composer takes
 * the current character's.
 *
 * Both themes come from the `[data-theme="dark"]` cascade. The salon that never
 * dimmed is gone.
 */

/** The margin — a dashed orange rule down the left of the note. */
function note(active: boolean): CSSProperties {
  return {
    display: 'flex',
    gap: 'var(--space-lg)',
    alignItems: 'flex-start',
    padding: 'var(--space-lg) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: active
      ? '1px solid var(--faction-ua)'
      : '1px solid var(--faction-ua-rule)',
    borderLeft: '2px dashed var(--faction-ua)',
    background: active
      ? 'var(--faction-ua-lift)'
      : 'var(--faction-ua-card-bg)',
    color: 'var(--faction-ua-card-text)',
  }
}

export default function UaComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { value, onChange, onSubmit, submitting } = props
    return (
      <div style={note(true)}>
        {/* The mark stands in for the portrait on the composer, as the kit
            draws it: you are writing in the practice's margin, not signing.
            The three invariant slots (ADR-0016) belong to the posted row. */}
        <span aria-hidden="true" style={{ flexShrink: 0 }}>
          <UaSigil width={38} height={38} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: UA_TEXT,
              fontSize: 'var(--text-content)',
              fontStyle: 'italic',
              color: 'var(--faction-ua-card-muted)',
              marginBottom: 'var(--space-md)',
            }}
          >
            {t('comments.ua.prompt')}
          </div>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent="var(--faction-ua-card-accent)"
            bg="var(--faction-ua-panel)"
            text="var(--faction-ua-card-text)"
          />
        </div>
      </div>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  return (
    <div style={note(false)}>
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
          }}
        >
          <Link
            to={`/characters/${comment.author.id}`}
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: 'var(--text-content)',
              color: 'var(--faction-ua-card-text)',
              textDecoration: 'none',
            }}
          >
            {comment.author.display_name}
          </Link>
          <span
            style={{
              fontFamily: UA_TEXT,
              fontSize: 'var(--text-lg)',
              color: 'var(--faction-ua-card-muted)',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
            }}
          >
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.ua.edited')}` : ''}
            <OwnerControls owner={owner} />
            <CommentFlagControl comment={comment} />
          </span>
        </div>
        <div
          style={{
            fontFamily: UA_TEXT,
            fontSize: 'var(--text-content)',
            lineHeight: 1.55,
            color: 'var(--faction-ua-card-body)',
            marginTop: 'var(--space-sm)',
          }}
        >
          {owner.editing ? (
            <CommentEditor
              owner={owner}
              accent="var(--faction-ua-card-accent)"
              bg="var(--faction-ua-panel)"
              text="var(--faction-ua-card-text)"
            />
          ) : (
            <MentionText
              body={comment.body_text}
              mentions={comment.mentions}
              accent="var(--faction-ua-card-accent)"
            />
          )}
        </div>
      </div>
    </div>
  )
}
