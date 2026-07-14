import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * The Ephemerists — marginalia (ADR-0018). Vellum leaf, engraved Cinzel byline,
 * a double left margin-rule and a rubric drop-cap on the body. Timestamp counts
 * days ("the Nth day").
 */
const RUBRIC = '#9a3b2e'

function frame(): React.CSSProperties {
  return {
    background: 'var(--faction-ephemerists-card-bg)',
    color: 'var(--faction-ephemerists-card-text)',
    border: '1px solid rgba(29,110,114,0.3)',
    borderLeft: '4px double var(--faction-ephemerists-card-accent)',
    padding: '16px 18px 14px 20px',
    fontFamily: 'var(--faction-ephemerists-card-font)',
  }
}

export default function EphemeristsComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={{ ...frame(), display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <FactionAvatar character={character} size="sm" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faction-ephemerists-card-accent)', marginBottom: 6 }}>
            {t('comments.ephemerists.prompt')}
          </div>
          <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-ephemerists-card-accent)" bg="rgba(255,255,255,0.35)" text="var(--faction-ephemerists-card-text)" />
        </div>
      </div>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  const body = comment.body_text
  const drop = body[0] ?? ''
  return (
    <div style={frame()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(29,110,114,0.25)', paddingBottom: 8, marginBottom: 10 }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <Link to={`/characters/${comment.author.id}`} style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--faction-ephemerists-card-text)', textDecoration: 'none' }}>
          {comment.author.display_name}
        </Link>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontStyle: 'italic', color: 'var(--faction-ephemerists-card-muted)', whiteSpace: 'nowrap' }}>
          {formatCommentTime(slug, comment.created_at)}
          {comment.is_edited ? ` · ${t('comments.ephemerists.edited')}` : ''}
        </span>
      </div>
      <div style={{ fontSize: 16, lineHeight: 1.55 }}>
        <span style={{ float: 'left', fontSize: 34, lineHeight: 0.72, color: RUBRIC, padding: '4px 8px 0 0', fontWeight: 600 }}>{drop}</span>
        <MentionText body={body.slice(1)} mentions={comment.mentions} accent="var(--faction-ephemerists-card-accent)" />
      </div>
    </div>
  )
}
