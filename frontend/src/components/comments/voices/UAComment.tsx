import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * UA — University of Asthmatics. The gilt salon (ADR-0026, superseding
 * ADR-0018's comment-scoped orange letterhead): a gold museum-frame around a
 * parchment plate, Marcellus small-caps house line, Playfair-italic body. Mirrors
 * UAFeedFrame / UAPraxisDetail; all colors via --ua-* tokens (no hex — CLAUDE.md).
 * UA is always-light, so tokens read identically in both themes.
 */
const GILT = 'var(--ua-gilt)'
const PAPER = 'var(--ua-paper)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const INK = 'var(--ua-ink)'
const ORANGE = 'var(--ua-orange)'
const SUB = 'var(--ua-sub)'
const SERIF = "'Playfair Display', Georgia, serif"
const LABEL = "'Marcellus', Georgia, serif"

/** Gilt museum frame — gold-leaf border around the parchment plate. */
function GiltFrame({ children, gap }: { children: ReactNode; gap: number }) {
  return (
    <div
      style={{
        background: GILT,
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
          padding: '13px 18px',
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

export default function UAComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <GiltFrame gap={12}>
        <FactionAvatar character={character} size="sm" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: LABEL, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ORANGE, marginBottom: 6 }}>
            {t('comments.ua.house')}
          </div>
          <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent={ORANGE} bg={PAPER_WARM} text={INK} />
        </div>
      </GiltFrame>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  return (
    <GiltFrame gap={14}>
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: LABEL, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ORANGE }}>
          {t('comments.ua.house')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <Link to={`/characters/${comment.author.id}`} style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 18, color: INK, textDecoration: 'none' }}>
            {comment.author.display_name}
          </Link>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: SUB, whiteSpace: 'nowrap' }}>
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.ua.edited')}` : ''}
          </span>
        </div>
        <div style={{ height: 1, background: 'color-mix(in srgb, var(--ua-gold) 55%, transparent)', margin: '8px 0 9px' }} />
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: INK }}>
          <MentionText body={comment.body_text} mentions={comment.mentions} accent={ORANGE} />
        </div>
      </div>
    </GiltFrame>
  )
}
