import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

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
    // the wider left inset clears the 4px double margin-rule; the other three sides land on --space-lg.
    padding: 'var(--space-lg) var(--space-lg) var(--space-lg) var(--space-xl)',
    fontFamily: 'var(--faction-ephemerists-card-font)',
  }
}

export default function EphemeristsComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={{ ...frame(), display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <FactionAvatar character={character} size="sm" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--text-base)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--faction-ephemerists-card-accent)', marginBottom: 'var(--space-sm)' }}>
            {t('comments.ephemerists.prompt')}
          </div>
          <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-ephemerists-card-accent)" bg="rgba(255,255,255,0.35)" text="var(--faction-ephemerists-card-text)" />
        </div>
      </div>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const body = comment.body_text
  const drop = body[0] ?? ''
  return (
    <div style={frame()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', borderBottom: '1px solid rgba(29,110,114,0.25)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <Link to={`/characters/${comment.author.id}`} style={{ fontSize: 'var(--text-content)', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--faction-ephemerists-card-text)', textDecoration: 'none' }}>
          {comment.author.display_name}
        </Link>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-md)', fontStyle: 'italic', color: 'var(--faction-ephemerists-card-muted)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
          {formatCommentTime(slug, comment.created_at)}
          {comment.is_edited ? ` · ${t('comments.ephemerists.edited')}` : ''}
          <OwnerControls owner={owner} />
          <CommentFlagControl comment={comment} />
        </span>
      </div>
      {owner.editing ? (
        <CommentEditor owner={owner} accent="var(--faction-ephemerists-card-accent)" bg="rgba(255,255,255,0.35)" text="var(--faction-ephemerists-card-text)" />
      ) : (
        <div style={{ fontSize: 'var(--text-content)', lineHeight: 1.55 }}>
          <span style={{
            float: 'left', lineHeight: 0.72, color: RUBRIC, padding: 'var(--space-xs) var(--space-sm) 0 0', fontWeight: 600,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: illuminated drop cap
            fontSize: 34,
          }}>{drop}</span>
          <MentionText body={body.slice(1)} mentions={comment.mentions} accent="var(--faction-ephemerists-card-accent)" />
        </div>
      )}
    </div>
  )
}
