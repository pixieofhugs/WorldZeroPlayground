import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * Everymen — dispatch from the floor (ADR-0018). Union-poster register: red
 * masthead bar, Bebas display name over a condensed body, paper stock. Timestamp
 * counts shifts ("Shift N").
 */
function frame(): React.CSSProperties {
  return {
    background: 'var(--faction-everymen-card-bg)',
    color: 'var(--faction-everymen-card-text)',
    border: '1px solid rgba(193,39,45,0.3)',
  }
}

export default function EverymenComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const masthead = (
    <div style={{ background: 'var(--faction-everymen-card-accent)', color: 'var(--faction-everymen-card-bg)', fontFamily: 'var(--faction-everymen-card-font)', fontSize: 13, letterSpacing: '0.14em', padding: '5px 14px' }}>
      {t('comments.everymen.masthead')}
    </div>
  )

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={frame()}>
        {masthead}
        <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-everymen-card-accent)" bg="rgba(0,0,0,0.03)" text="var(--faction-everymen-card-text)" />
          </div>
        </div>
      </div>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  return (
    <div style={frame()}>
      {masthead}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <Link to={`/characters/${comment.author.id}`} style={{ fontFamily: 'var(--faction-everymen-card-font)', fontSize: 18, letterSpacing: '0.04em', color: 'var(--faction-everymen-card-text)', textDecoration: 'none' }}>
              {comment.author.display_name}
            </Link>
            <span style={{ fontSize: 11, color: 'var(--faction-everymen-card-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` · ${t('comments.everymen.edited')}` : ''}
            </span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.4, marginTop: 3 }}>
            <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-everymen-card-accent)" />
          </div>
        </div>
      </div>
    </div>
  )
}
