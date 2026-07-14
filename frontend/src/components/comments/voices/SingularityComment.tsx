import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar } from '../../../utils/factions'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * Singularity — terminal printout (ADR-0018). Dark, green mono, corner brackets,
 * a `>` prompt and (composer) a blinking cursor. Same in light + dark mode, like
 * the task card. Timestamp is a plain relative in terminal type (no T-#### fluff).
 */
const FONT = factionCssVar('singularity', 'card-font')

function frame(): React.CSSProperties {
  return {
    position: 'relative',
    background: 'var(--faction-singularity-card-bg)',
    color: 'var(--faction-singularity-card-text)',
    border: '1px solid var(--faction-singularity-border-hard)',
    fontFamily: FONT,
    padding: '12px 14px',
    overflow: 'hidden',
  }
}

function Brackets() {
  const c = 'var(--faction-singularity-card-text)'
  return (
    <>
      <span style={{ position: 'absolute', top: 3, left: 3, width: 9, height: 9, borderTop: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
      <span style={{ position: 'absolute', top: 3, right: 3, width: 9, height: 9, borderTop: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
      <span style={{ position: 'absolute', bottom: 3, left: 3, width: 9, height: 9, borderBottom: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
      <span style={{ position: 'absolute', bottom: 3, right: 3, width: 9, height: 9, borderBottom: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
    </>
  )
}

export default function SingularityComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={frame()}>
        <Brackets />
        <div style={{ position: 'relative', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--faction-singularity-card-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
              {t('comments.singularity.protocol')}
              <span style={{ display: 'inline-block', width: 5, height: 9, background: 'var(--faction-singularity-card-text)', marginLeft: 4, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
            </div>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-singularity-card-text)" bg="#0a1f12" text="var(--faction-singularity-card-text)" />
          </div>
        </div>
      </div>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  return (
    <div style={frame()}>
      <Brackets />
      <div style={{ position: 'relative', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <Link to={`/characters/${comment.author.id}`} style={{ fontSize: 13, color: 'var(--faction-singularity-card-text)', textDecoration: 'none' }}>
              {comment.author.username}
            </Link>
            <span style={{ fontSize: 11, color: 'var(--faction-singularity-card-muted)', whiteSpace: 'nowrap' }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` [${t('comments.singularity.edited')}]` : ''}
            </span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>
            <span style={{ color: 'var(--faction-singularity-card-muted)' }}>&gt; </span>
            <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-singularity-card-muted)" />
          </div>
        </div>
      </div>
    </div>
  )
}
