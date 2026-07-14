import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * Warriors of Whimsy — `{handle}.exe` (ADR-0018). Reuses the task-card window
 * chrome verbatim (--faction-wow-win-border / title gradient / dotted body),
 * retitled to the author's handle. Handwritten Caveat body.
 */
function Dot({ color }: { color: string }) {
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, border: '1.2px solid rgba(255,255,255,0.7)' }} />
}

function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '2px solid var(--faction-wow-win-border)', borderRadius: 11, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: 'linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))', borderBottom: '2px solid var(--faction-wow-win-border)' }}>
        <Dot color="#fb7aa8" /><Dot color="#f6c75e" /><Dot color="#86cfa6" />
        <span style={{ fontSize: 10, letterSpacing: '0.03em', color: 'var(--faction-wow-title-text)', marginLeft: 2 }}>✦ {title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8, letterSpacing: '1.5px', color: 'var(--faction-wow-title-text)' }}>▭ ✕</span>
      </div>
      <div style={{ padding: '12px 14px', background: 'var(--faction-wow-body-bg)', backgroundImage: 'radial-gradient(var(--faction-wow-dot) 1.4px, transparent 1.4px)', backgroundSize: '13px 13px' }}>
        {children}
      </div>
    </div>
  )
}

export default function WowComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Window title={`${character.username}.exe`}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-wow-card-accent)" bg="var(--faction-wow-notepad-bg)" text="var(--faction-wow-card-text)" />
          </div>
        </div>
      </Window>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  return (
    <Window title={`${comment.author.username}.exe`}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--faction-wow-card-font)', fontSize: 20, lineHeight: 1.25, color: 'var(--faction-wow-card-text)' }}>
            <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-wow-card-accent)" />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--faction-wow-card-accent)', letterSpacing: '0.04em' }}>
            <Link to={`/characters/${comment.author.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              @{comment.author.username}
            </Link>
            {' · '}
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.wow.edited')}` : ''}
          </div>
        </div>
      </div>
    </Window>
  )
}
