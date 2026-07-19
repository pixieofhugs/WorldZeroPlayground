import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

/**
 * Warriors of Whimsy — `{handle}.exe` (ADR-0018). Reuses the task-card window
 * chrome verbatim (--faction-coven-win-border / title gradient / dotted body),
 * retitled to the author's handle. Handwritten Caveat body.
 */
function Dot({ color }: { color: string }) {
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, border: '1.2px solid rgba(255,255,255,0.7)' }} />
}

function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '2px solid var(--faction-coven-win-border)', borderRadius: 11, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-sm) var(--space-md)', background: 'linear-gradient(180deg, var(--faction-coven-title-from), var(--faction-coven-title-to))', borderBottom: '2px solid var(--faction-coven-win-border)',
        // eslint-disable-next-line local/no-raw-style-values -- ornament: rhythm of the three drawn traffic-light dots, not layout spacing
        gap: 7 }}>
        <Dot color="#fb7aa8" /><Dot color="#f6c75e" /><Dot color="#86cfa6" />
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: window title bar + close glyphs, part of the desktop-window illustration */}
        <span style={{ fontSize: 10, letterSpacing: '0.03em', color: 'var(--faction-coven-title-text)', marginLeft: 2 }}>✦ {title}</span>
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the ▭ ✕ window glyphs are drawn chrome, not typeset copy */}
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.8, letterSpacing: '1.5px', color: 'var(--faction-coven-title-text)' }}>▭ ✕</span>
      </div>
      <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--faction-coven-body-bg)', backgroundImage: 'radial-gradient(var(--faction-coven-dot) 1.4px, transparent 1.4px)', backgroundSize: '13px 13px' }}>
        {children}
      </div>
    </div>
  )
}

export default function CovenComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Window title={`${character.username}.exe`}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-coven-card-accent)" bg="var(--faction-coven-notepad-bg)" text="var(--faction-coven-card-text)" />
          </div>
        </div>
      </Window>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  return (
    <Window title={`${comment.author.username}.exe`}>
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--faction-coven-card-font)', fontSize: 'var(--text-content)', lineHeight: 1.25, color: 'var(--faction-coven-card-text)' }}>
            {owner.editing ? (
              <CommentEditor owner={owner} accent="var(--faction-coven-card-accent)" bg="var(--faction-coven-notepad-bg)" text="var(--faction-coven-card-text)" />
            ) : (
              <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-coven-card-accent)" />
            )}
          </div>
          <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-md)', color: 'var(--faction-coven-card-accent)', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <Link to={`/characters/${comment.author.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              @{comment.author.username}
            </Link>
            <span>
              {' · '}
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` · ${t('comments.wow.edited')}` : ''}
            </span>
            <OwnerControls owner={owner} />
            <CommentFlagControl comment={comment} />
          </div>
        </div>
      </div>
    </Window>
  )
}
