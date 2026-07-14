import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'

/**
 * Albescent — vellum correspondence (ADR-0018). The quietest archetype: warm-white
 * letterhead, near-black ink, Cormorant Garamond, a hairline rule + embossed
 * monogram. A full faction, so it gets its own component (not the →ua alias).
 */
const SURFACE = '#faf9f7'
const INK = '#1c1c1a'
const MUTED = 'rgba(28,28,26,0.44)'
const SERIF = "'Cormorant Garamond', Georgia, serif"

function frame(): React.CSSProperties {
  return {
    background: SURFACE,
    color: INK,
    border: '1px solid rgba(0,0,0,0.10)',
    boxShadow: '0 2px 18px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
    borderRadius: 4,
    padding: '18px 22px',
  }
}

function Letterhead({ monogram }: { monogram: string }) {
  const { t } = useTranslation('praxis')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED, marginBottom: 11 }}>
      <span>{t('comments.albescent.letterhead')}</span>
      <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(28,28,26,0.3)', borderRadius: '50%', fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: 'rgba(28,28,26,0.6)' }}>
        {monogram}
      </span>
    </div>
  )
}

export default function AlbescentComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={frame()}>
        <Letterhead monogram={character.display_name[0]?.toUpperCase() ?? 'A'} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent={INK} bg="#ffffff" text={INK} />
          </div>
        </div>
      </div>
    )
  }
  const { comment } = props
  const slug = comment.author.faction_slug
  return (
    <div style={frame()}>
      <Letterhead monogram={comment.author.display_name[0]?.toUpperCase() ?? 'A'} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <Link to={`/characters/${comment.author.id}`} style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 16, letterSpacing: '0.02em', color: INK, textDecoration: 'none' }}>
          {comment.author.display_name}
        </Link>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 10, paddingTop: 11, fontFamily: SERIF, fontSize: 17, lineHeight: 1.6, letterSpacing: '0.01em', color: INK }}>
        <MentionText body={comment.body_text} mentions={comment.mentions} accent={INK} />
      </div>
      <div style={{ marginTop: 11, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
        {formatCommentTime(slug, comment.created_at)}
        {comment.is_edited ? ` · ${t('comments.albescent.edited')}` : ''}
      </div>
    </div>
  )
}
