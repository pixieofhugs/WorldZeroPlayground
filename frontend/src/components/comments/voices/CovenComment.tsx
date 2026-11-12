import type { CSSProperties, ReactNode } from 'react'
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
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * Cozy Coven — the candlelit slip, as a comment (#1197). Grenze Gotisch byline,
 * Spectral body (user content takes the reading face, §4), Caveat only for the
 * "edited" marginalia. Behaviour is in the shared helpers; this owns chrome and ink.
 * One responsive component, no mobile twin (ADR-0063).
 */

const CHROME = 'var(--font-faction-script)' /* Caveat */
const READING = 'var(--font-faction-spectral)' /* Spectral */
const HAND = 'var(--font-faction-script)' /* Caveat */
const DISPLAY = 'var(--font-faction-witch)' /* Grenze Gotisch */

const INK = 'var(--faction-coven-slip-ink)'
const LABEL = 'var(--faction-coven-slip-label)'
/** CTA pair, measured in both themes (#1023). */
const ACCENT = 'var(--faction-coven-slip-cta-from)'
const ON_ACCENT = 'var(--faction-coven-slip-cta-ink)'
/** Inset field: a stop of the slip's own gradient. */
const FIELD = 'var(--faction-coven-slip-from)'

const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: LABEL,
}

/** Shared with the candle glow's arc. */
const SLIP_RADIUS = 14

/** The slip both modes sit on, so the thread reads as one stack. */
function Slip({
  avatar,
  children,
  containerProps,
}: {
  avatar: ReactNode
  children: ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  return (
    <div style={{ ...factionBodyVars("coven"), display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--faction-coven-ward-card)',
          border: '1.5px solid var(--faction-coven-slip-border)',
          borderRadius: SLIP_RADIUS,
          // No `overflow: hidden` (#1255): it would clip the @mention listbox.
          boxShadow: 'var(--faction-coven-slip-shadow)',
        }}
      >
        {/* candle glow; rounds its own top corners since nothing clips it */}
        <div
          aria-hidden="true"
          style={{
            height: 4,
            borderRadius: `${SLIP_RADIUS}px ${SLIP_RADIUS}px 0 0`,
            background:
              'linear-gradient(90deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 38%, var(--faction-coven-slip-lav) 78%, var(--faction-coven-slip-vio))',
          }}
        />
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>{children}</div>
      </div>
    </div>
  )
}

export default function CovenComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Slip avatar={<FactionAvatar character={character} size="sm" />}>
        {/* `.content-text` here sizes the textarea (`font: inherit`) */}
        <div
          className="content-text"
          aria-busy={submitting}
          style={{ fontFamily: READING, color: INK }}
        >
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={ACCENT}
            onAccent={ON_ACCENT}
            bg={FIELD}
            text={INK}
            hint={<span style={CAPTION}>{t('comments.mentionHint')}</span>}
          />
        </div>
      </Slip>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showFoot = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.

  return (
    <Slip
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to={`/characters/${comment.author.id}`}
          style={{
            fontFamily: DISPLAY,
            fontSize: 'var(--text-xl)',
            letterSpacing: '0.04em',
            color: INK,
            textDecoration: 'none',
          }}
        >
          {comment.author.display_name}
        </Link>
        <span style={CAPTION}>{formatCommentTime(comment.created_at)}</span>
        {comment.is_edited && (
          <span
            style={{
              fontFamily: HAND,
              fontSize: 'var(--text-lg)',
              color: LABEL,
            }}
          >
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>

      <div
        className="content-text"
        style={{
          marginTop: 'var(--space-sm)',
          fontFamily: READING,
          color: INK,
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <CommentEditor owner={owner} accent={ACCENT} onAccent={ON_ACCENT} bg={FIELD} text={INK} />
        ) : (
          <MentionText
            body={comment.body_text}
            mentions={comment.mentions}
            accent="var(--faction-coven-slip-deep)"
          />
        )}
      </div>

      {showFoot && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          {/* `.cvn-braid` owns its pigments: `var()` can't resolve inside a data-URI SVG */}
          <span
            className="cvn-braid"
            aria-hidden="true"
            style={{ display: 'block', width: '100%' }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-sm)',
            }}
          >
            <OwnerControls owner={owner} reveal={reveal} />
            <CommentFlagControl comment={comment} />
          </div>
        </div>
      )}
    </Slip>
  )
}
