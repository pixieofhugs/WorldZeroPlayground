import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

/**
 * UA — University of Asthmatics. The gilt salon (ADR-0026, superseding
 * ADR-0018's comment-scoped orange letterhead): a gold museum-frame around a
 * parchment plate, EB-Garamond small-caps house line, Cormorant-italic body. Mirrors
 * UaFeedFrame / UaPraxisDetail; all colors via --ua-* tokens (no hex — CLAUDE.md).
 * UA is always-light, so tokens read identically in both themes.
 */
const GILT = 'var(--ua-gilt)'
const PAPER = 'var(--ua-paper)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const INK = 'var(--ua-ink)'
const ORANGE = 'var(--ua-orange)'
const SUB = 'var(--ua-sub)'
const SERIF = "var(--faction-ua-card-font)"
const LABEL = "var(--faction-ua-body-font)"

/** Gilt museum frame — gold-leaf border around the parchment plate. */
function GiltFrame({ children, gap }: { children: ReactNode; gap: string }) {
  return (
    <div
      style={{
        background: GILT,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: this inset *is* the gold-leaf border drawn around the parchment plate, not spacing
        padding: 3,
        borderRadius: 6,
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, white 40%, transparent)',
      }}
    >
      <div
        style={{
          background: PAPER,
          color: INK,
          border: '1px solid var(--ua-line-soft)',
          borderRadius: 4,
          padding: 'var(--space-md) var(--space-lg)',
          display: 'flex',
          gap,
          alignItems: 'flex-start',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function UaComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <GiltFrame gap="var(--space-md)">
        <FactionAvatar character={character} size="sm" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: LABEL, fontSize: 'var(--text-base)', letterSpacing: '0.14em', textTransform: 'uppercase', color: ORANGE, marginBottom: 'var(--space-sm)' }}>
            {t('comments.ua.house')}
          </div>
          <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent={ORANGE} bg={PAPER_WARM} text={INK} />
        </div>
      </GiltFrame>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  return (
    <GiltFrame gap="var(--space-lg)">
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: LABEL, fontSize: 'var(--text-base)', letterSpacing: '0.14em', textTransform: 'uppercase', color: ORANGE }}>
          {t('comments.ua.house')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
          <Link to={`/characters/${comment.author.id}`} style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 'var(--text-content)', color: INK, textDecoration: 'none' }}>
            {comment.author.display_name}
          </Link>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'var(--text-lg)', color: SUB, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.ua.edited')}` : ''}
            <OwnerControls owner={owner} />
            <CommentFlagControl comment={comment} />
          </span>
        </div>
        <div style={{ height: 1, background: 'color-mix(in srgb, var(--ua-gold) 55%, transparent)', margin: 'var(--space-sm) 0' }} />
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 'var(--text-content)', lineHeight: 1.5, color: INK }}>
          {owner.editing ? (
            <CommentEditor owner={owner} accent={ORANGE} bg={PAPER_WARM} text={INK} />
          ) : (
            <MentionText body={comment.body_text} mentions={comment.mentions} accent={ORANGE} />
          )}
        </div>
      </div>
    </GiltFrame>
  )
}
