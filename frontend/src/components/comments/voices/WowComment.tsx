import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

/**
 * Warriors of Whimsy — COUNSEL IN THE MARGIN (kit §06, #899).
 *
 * A knight speaks beside the chronicle, not on it: a slip of the same cream
 * parchment, ruled down its left edge in plum, with the crest avatar set at the
 * head and the name lettered in MedievalSharp. It follows the decree's chrome
 * (the task card is the archetype the other surfaces mirror) — same parchment,
 * same gold hairline, same plum ink — and adds no ornament of its own.
 *
 * The three invariant slots are unchanged (ADR-0016): author identity · body ·
 * timestamp+edited. A posted row takes the AUTHOR's faction; the composer takes
 * the current character's, which is why both ends carry the crest avatar rather
 * than the bare sigil — `WowAvatar` (#897) is already the crest in a gilt ring.
 *
 * THE HUZZAH IS NOT BUILT. The kit draws a "✦ Huzzah · 12" reaction pill on this
 * row, and #898 shipped the word for it (`comments.wow.react`). There is no
 * reaction anywhere in the product — no endpoint, no column, no count on
 * `CommentOut` — so rendering the pill would be a control that no-ops, which UX
 * principle 5 forbids outright ("no dead buttons"). The copy key is left in
 * place for whoever builds reactions; the pill arrives with the feature, not
 * before it. The kit's "Reply" affordance is absent for the same reason:
 * comments are flat (ADR-0006).
 *
 * Both themes come from the `[data-theme="dark"]` cascade.
 */

/**
 * The kit sets the crest beside the counsel at 44px, wider than the shared
 * `sm` (24px) — a seal that small stops reading as a seal. Below #897's 56px
 * motto floor, so the band drops its lettering and keeps its ring, which is
 * exactly what the kit draws here.
 */
const CREST_AVATAR = 44

/** The parchment slip: gold hairline all round, plum rule down the margin. */
const SLIP: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-md)',
  alignItems: 'flex-start',
  padding: 'var(--space-lg) var(--space-xl)',
  borderRadius: 12,
  background: 'var(--faction-wow-chronicle-bg)',
  color: 'var(--faction-wow-card-text)',
  border: '1px solid var(--faction-wow-chronicle-rule)',
  borderLeft: '4px solid var(--faction-wow-card-accent)',
  fontFamily: 'var(--faction-wow-body-font)',
}

export default function WowComment(props: CommentProps) {
  const { t } = useTranslation('praxis')

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={SLIP}>
        <FactionAvatar character={character} size={CREST_AVATAR} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontStyle: 'italic',
              fontSize: 'var(--text-content)',
              color: 'var(--faction-wow-card-muted)',
              marginBottom: 'var(--space-md)',
            }}
          >
            {t('comments.wow.prompt')}
          </div>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent="var(--faction-wow-card-accent)"
            bg="var(--faction-wow-chronicle-panel)"
            text="var(--faction-wow-card-text)"
            submitLabel={t('comments.wow.post')}
          />
        </div>
      </div>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })

  return (
    <div style={SLIP}>
      <FactionAvatar character={authorToCharacter(comment.author)} size={CREST_AVATAR} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <Link
            to={`/characters/${comment.author.id}`}
            style={{
              fontFamily: 'var(--faction-wow-card-font)',
              fontSize: 'var(--text-content)',
              color: 'var(--faction-wow-card-text)',
              textDecoration: 'none',
            }}
          >
            {comment.author.display_name}
          </Link>
          <span
            style={{
              fontStyle: 'italic',
              fontSize: 'var(--text-lg)',
              color: 'var(--faction-wow-card-muted)',
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
            }}
          >
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.wow.edited')}` : ''}
            <OwnerControls owner={owner} />
            <CommentFlagControl comment={comment} />
          </span>
        </div>
        <div
          style={{
            fontSize: 'var(--text-content)',
            lineHeight: 1.55,
            color: 'var(--faction-wow-card-text)',
            marginTop: 'var(--space-sm)',
          }}
        >
          {owner.editing ? (
            <CommentEditor
              owner={owner}
              accent="var(--faction-wow-card-accent)"
              bg="var(--faction-wow-chronicle-panel)"
              text="var(--faction-wow-card-text)"
            />
          ) : (
            <MentionText
              body={comment.body_text}
              mentions={comment.mentions}
              accent="var(--faction-wow-card-accent)"
            />
          )}
        </div>
      </div>
    </div>
  )
}
