import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from '../OwnerControls'
import { CommentFlagControl } from '../FlagControl'

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
    padding: 'var(--space-lg) var(--space-xl)',
  }
}

function Letterhead({ monogram }: { monogram: string }) {
  const { t } = useTranslation('praxis')
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED, marginBottom: 'var(--space-md)',
      // eslint-disable-next-line local/no-raw-style-values -- ornament: engraved letterhead strip
      fontSize: 9,
    }}>
      <span>{t('comments.albescent.letterhead')}</span>
      <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(28,28,26,0.3)', borderRadius: '50%', fontFamily: SERIF, fontStyle: 'italic', color: 'rgba(28,28,26,0.6)',
        // eslint-disable-next-line local/no-raw-style-values -- ornament: monogram glyph inside the 22px seal
        fontSize: 12,
      }}>
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
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1 }}>
            <ComposerControls value={value} onChange={onChange} onSubmit={onSubmit} submitting={submitting} accent={INK} bg="#ffffff" text={INK} />
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
      <Letterhead monogram={comment.author.display_name[0]?.toUpperCase() ?? 'A'} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <Link to={`/characters/${comment.author.id}`} style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 'var(--text-content)', letterSpacing: '0.02em', color: INK, textDecoration: 'none' }}>
          {comment.author.display_name}
        </Link>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', fontFamily: SERIF, fontSize: 'var(--text-content)', lineHeight: 1.6, letterSpacing: '0.01em', color: INK }}>
        {owner.editing ? (
          <CommentEditor owner={owner} accent={INK} bg="#ffffff" text={INK} />
        ) : (
          <MentionText body={comment.body_text} mentions={comment.mentions} accent={INK} />
        )}
      </div>
      <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--text-base)', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
        {formatCommentTime(slug, comment.created_at)}
        {comment.is_edited ? ` · ${t('comments.albescent.edited')}` : ''}
        <OwnerControls owner={owner} />
        <CommentFlagControl comment={comment} />
      </div>
    </div>
  )
}
