import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { useAuth } from '../../../auth/AuthContext'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { Ransom } from '../../factionMarks/snideAtoms'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * S.N.I.D.E. comment voice — the intercepted slip (#1198), same object as the feed
 * chassis. No drawn tape (#1708, owner override). One component, no mobile twin.
 *
 * On the flipping `--faction-snide-slip-*` stock (not the invariant black card) so
 * shared controls' global inks stay legible (#1118); `--color-danger` is 4.28:1, a
 * missing-seam case (#1153). Acid is a DRAWN thing, not an ink (#1224): mentions
 * use `-slip-acid-ink`, pink text would use `-slip-pink-ink`. Body is Special Elite.
 */

/** The slip; tilt and offset shadow are desktop-only (they foul a narrow column). */
function slip(): CSSProperties {
  return {
    ...factionBodyVars("snide"),
    position: 'relative',
    background: 'var(--faction-snide-slip-paper)',
    color: 'var(--faction-snide-slip-ink)',
    border: '1.5px solid var(--faction-snide-slip-ink)',
    backgroundImage:
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px),' +
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px)',
    backgroundSize: '3px 3px, 4px 4px',
    backgroundPosition: '0 0, 2px 1px',
    boxShadow: 'var(--snide-slip-shadow, var(--faction-snide-slip-shadow))',
    transform: 'var(--snide-slip-tilt)',
    // eslint-disable-next-line local/no-raw-style-values -- ornament: graded 20/18/16 inset, no scale rung between 16 and 24 (§4a).
    padding: '20px 18px 16px',
  }
}

const TYPED: CSSProperties = {
  fontFamily: 'var(--faction-snide-font-type)',
  fontSize: 'var(--text-lg)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

const FIELD = {
  // Acid as rule and fill; press near-black prints on it in both themes.
  accent: 'var(--faction-snide-acid)',
  onAccent: 'var(--faction-snide-ink)',
  bg: 'var(--faction-snide-slip-field)',
  text: 'var(--faction-snide-slip-ink)',
} as const

export default function SnideComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={slip()} aria-busy={submitting}>
        <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* `.content-text` here sizes the textarea (`font: inherit`) */}
            <div className="content-text" style={{ fontFamily: 'var(--faction-snide-font-type)' }}>
              <ComposerControls
                value={value}
                onChange={onChange}
                onSubmit={onSubmit}
                submitting={submitting}
                accent={FIELD.accent}
                onAccent={FIELD.onAccent}
                bg={FIELD.bg}
                text={FIELD.text}
                hint={
                  <span style={{ ...TYPED, color: 'var(--faction-snide-slip-faint)' }}>
                    {t('comments.mentionHint')}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.

  return (
    <div style={slip()} {...reveal.containerProps}>
      <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Link to={`/characters/${comment.author.id}`} style={{ textDecoration: 'none' }}>
              <Ransom text={comment.author.display_name} size={16} />
            </Link>
            <span style={{ ...TYPED, color: 'var(--faction-snide-composer-muted)', whiteSpace: 'nowrap' }}>
              {formatCommentTime(comment.created_at)}
              {comment.is_edited && (
                <>
                  <span aria-hidden="true"> · </span>
                  {t('comments.edited')}
                </>
              )}
            </span>
          </div>
          <div
            className="content-text"
            style={{
              fontFamily: 'var(--faction-snide-font-type)',
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              overflowWrap: 'anywhere',
            }}
          >
            {owner.editing ? (
              <CommentEditor
                owner={owner}
                accent={FIELD.accent}
                onAccent={FIELD.onAccent}
                bg={FIELD.bg}
                text={FIELD.text}
              />
            ) : (
              <MentionText
                body={comment.body_text}
                mentions={comment.mentions}
                accent="var(--faction-snide-slip-acid-ink)"
              />
            )}
          </div>
          {showControls && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-md)',
                paddingTop: 'var(--space-sm)',
                borderTop: '1px solid var(--faction-snide-note-rule)',
                  }}
            >
              <OwnerControls owner={owner} reveal={reveal} />
              <CommentFlagControl comment={comment} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
