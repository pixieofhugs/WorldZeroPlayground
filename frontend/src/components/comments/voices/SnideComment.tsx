import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * S.N.I.D.E. — ransom dispatch (ADR-0018). Reuses the task-card ransom vocabulary:
 * photocopier-black card, cut-out author name, scotch tape, acid highlight. Body
 * stays legible in the condensed face (the card's own rule — only the name is cut).
 */
const RANSOM = [
  { bg: 'var(--faction-snide-paper)', col: 'var(--faction-snide-ink)', font: 'var(--faction-snide-font-impact)', rot: -5 },
  { bg: 'var(--faction-snide-ink)', col: 'var(--faction-snide-acid)', font: 'var(--faction-snide-font-cond)', rot: 4 },
  { bg: 'var(--faction-snide-pink)', col: '#fff', font: 'var(--faction-snide-font-black)', rot: -3 },
  { bg: 'var(--faction-snide-acid)', col: 'var(--faction-snide-ink)', font: 'var(--faction-snide-font-impact)', rot: 6 },
  { bg: 'var(--faction-snide-ink)', col: '#fff', font: 'var(--faction-snide-font-cond)', rot: -6 },
]

function Ransom({ text, size = 16 }: { text: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '3px 2px', alignItems: 'center' }}>
      {[...text].map((char, index) => {
        if (char === ' ') return <span key={index} style={{ width: size * 0.22 }} />
        const s = RANSOM[(char.charCodeAt(0) + index * 3) % RANSOM.length]
        return (
          <span key={index} style={{ display: 'inline-block', background: s.bg, color: s.col, fontFamily: s.font, fontSize: size, lineHeight: 0.92, padding: '2px 5px 0', transform: `rotate(${s.rot}deg)`, boxShadow: '1.5px 2.5px 0 rgba(0,0,0,0.4)', textTransform: 'uppercase' }}>
            {char}
          </span>
        )
      })}
    </span>
  )
}

function frame(): React.CSSProperties {
  return {
    position: 'relative',
    background: 'var(--faction-snide-card-bg)',
    color: 'var(--faction-snide-card-text)',
    padding: '20px 18px 16px',
    boxShadow: '6px 8px 0 rgba(0,0,0,0.28)',
    transform: 'rotate(-0.6deg)',
  }
}

function Tape() {
  return (
    <>
      <div className="snide-tape" style={{ top: -8, left: 28, transform: 'rotate(-8deg)' }} />
      <div className="snide-tape" style={{ top: -8, right: 22, transform: 'rotate(7deg)' }} />
    </>
  )
}

export default function SnideComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={frame()}>
        <Tape />
        <div style={{ position: 'relative', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--faction-snide-font-marker)', color: 'var(--faction-snide-pink)', fontSize: 11, transform: 'rotate(-1deg)', marginBottom: 6 }}>
              {t('comments.snide.prompt')}
            </div>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-snide-pink)" bg="rgba(255,255,255,0.04)" text="var(--faction-snide-card-text)" />
          </div>
        </div>
      </div>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  return (
    <div style={frame()}>
      <Tape />
      <div style={{ position: 'relative', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <Link to={`/characters/${comment.author.id}`} style={{ textDecoration: 'none' }}>
              <Ransom text={comment.author.display_name} size={16} />
            </Link>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--faction-snide-card-muted)', whiteSpace: 'nowrap' }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` · ${t('comments.snide.edited')}` : ''}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--faction-snide-font-cond)', textTransform: 'uppercase', fontSize: 15, lineHeight: 1.4, letterSpacing: '0.02em' }}>
            <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-snide-acid)" />
          </div>
        </div>
      </div>
    </div>
  )
}
