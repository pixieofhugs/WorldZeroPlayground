import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

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
    <span style={{
      display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center',
      // eslint-disable-next-line local/no-raw-style-values -- ornament: kerning between the cut-out ransom letters; a rung breaks the pasted-up letterform run
      gap: '3px 2px',
    }}>
      {[...text].map((char, index) => {
        if (char === ' ') return <span key={index} style={{ width: size * 0.22 }} />
        const s = RANSOM[(char.charCodeAt(0) + index * 3) % RANSOM.length]
        return (
          <span key={index} style={{ display: 'inline-block', background: s.bg, color: s.col, fontFamily: s.font, fontSize: size, lineHeight: 0.92,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of a single cut-out letter tile inside its scrap of paper
            padding: '2px 5px 0',
            transform: `rotate(${s.rot}deg)`, boxShadow: '1.5px 2.5px 0 rgba(0,0,0,0.4)', textTransform: 'uppercase' }}>
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
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the ransom card's graded 20/18/16 inset. The scale has no rung between 16 and 24, so every tokenization collapses top/sides/bottom to one value and regularizes the archetype (§4a asymmetric-inset exception).
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
        <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--faction-snide-font-marker)', color: 'var(--faction-snide-pink)',
              transform: 'rotate(-1deg)', marginBottom: 'var(--space-sm)',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: rotated marker scrawl
              fontSize: 11,
            }}>
              {t('comments.snide.prompt')}
            </div>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent="var(--faction-snide-pink)" onAccent="var(--faction-snide-on-accent)" bg="rgba(255,255,255,0.04)" text="var(--faction-snide-card-text)" />
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
      <Tape />
      <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            <Link to={`/characters/${comment.author.id}`} style={{ textDecoration: 'none' }}>
              <Ransom text={comment.author.display_name} size={16} />
            </Link>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--faction-snide-card-muted)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` · ${t('comments.snide.edited')}` : ''}
              <OwnerControls owner={owner} />
              <CommentFlagControl comment={comment} />
            </span>
          </div>
          <div style={{ fontFamily: 'var(--faction-snide-font-cond)', textTransform: 'uppercase', fontSize: 'var(--text-content)', lineHeight: 1.4, letterSpacing: '0.02em' }}>
            {owner.editing ? (
              <CommentEditor owner={owner} accent="var(--faction-snide-pink)" onAccent="var(--faction-snide-on-accent)" bg="rgba(255,255,255,0.04)" text="var(--faction-snide-card-text)" />
            ) : (
              <MentionText body={comment.body_text} mentions={comment.mentions} accent="var(--faction-snide-acid)" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
