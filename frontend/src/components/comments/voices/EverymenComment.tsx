import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

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
    <div style={{
      background: 'var(--faction-everymen-card-accent)', color: 'var(--faction-everymen-card-bg)',
      fontFamily: 'var(--faction-everymen-card-font)', letterSpacing: '0.14em',
      padding: 'var(--space-xs) var(--space-lg)',
      // eslint-disable-next-line local/no-raw-style-values -- ornament: newsprint masthead bar
      fontSize: 13,
    }}>
      {t('comments.everymen.masthead')}
    </div>
  )

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={frame()}>
        {masthead}
        <div style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-everymen-card-accent)" bg="rgba(0,0,0,0.03)" text="var(--faction-everymen-card-text)" />
          </div>
        </div>
      </div>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  return (
    <div style={frame()}>
      {masthead}
      <div style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
            <Link to={`/characters/${comment.author.id}`} style={{ fontFamily: 'var(--faction-everymen-card-font)', fontSize: 'var(--text-content)', letterSpacing: '0.04em', color: 'var(--faction-everymen-card-text)', textDecoration: 'none' }}>
              {comment.author.display_name}
            </Link>
            <span style={{ fontSize: 'var(--text-md)', color: 'var(--faction-everymen-card-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` · ${t('comments.everymen.edited')}` : ''}
              <OwnerControls owner={owner} />
              <CommentFlagControl comment={comment} />
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-content)', lineHeight: 1.4, marginTop: 'var(--space-xs)' }}>
            {owner.editing ? (
              <CommentEditor owner={owner} accent="var(--faction-everymen-card-accent)" bg="rgba(0,0,0,0.03)" text="var(--faction-everymen-card-text)" />
            ) : (
              <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-everymen-card-accent)" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
