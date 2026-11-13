/**
 * The Everymen comment — the feed chassis's dispatch slip at comment scale (#1200):
 * double frame, red band carrying the byline (no faction name, epic #1192 dec. 5).
 * Never archivable (that's `FeedItemSlot`'s). The body sits on the sheet PANEL
 * because red mention ink is 4.49:1 on paper but AA on the panel (#1223).
 * Behaviour lives in the shared helpers; one component, no mobile twin (ADR-0063).
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { useAuth } from '../../../auth/AuthContext'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/** Red as rule and fill, never type; AA ink per #924. */
const ACCENT = 'var(--everymen-red)'
const ON_ACCENT = 'var(--faction-everymen-on-accent)'
const PANEL = 'var(--faction-everymen-sheet-panel)'
/** Field inset into the panel; deeper than it in both themes. */
const FIELD = 'var(--everymen-paper)'
const BODY_INK = 'var(--everymen-paper-text)'

const DATELINE = {
  fontFamily: 'var(--faction-everymen-body-font)',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: 'inherit',
} as const

const BYLINE = {
  fontFamily: 'var(--ev-voice-face)',
  // Content tier: Bebas is narrow enough that 18px reads like 14 of a normal face.
  fontSize: 'var(--text-content)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  lineHeight: 1.15,
  color: 'inherit',
  textDecoration: 'none',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

/** The slip both modes sit on (and the surface root for the role map). */
function Slip({
  avatar,
  byline,
  dateline,
  children,
  containerProps,
}: {
  avatar: ReactNode
  byline: ReactNode
  dateline: ReactNode
  children: ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  const mobile = useFormFactor() === 'mobile'
  return (
    <div
      style={{
        ...factionBodyVars("everymen"), ...factionRoleVars('everymen', 'ev-voice'),
        display: 'flex',
        gap: 'var(--space-md)',
        alignItems: 'flex-start',
      }}
    >
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--everymen-paper)',
          color: BODY_INK,
          // The double frame, as the feed slip rules it: plate edge…
          border: '2px solid var(--everymen-frame)',
          // …4px pad…
          padding: 'var(--space-xs)',
          boxShadow: 'var(--faction-everymen-slip-shadow)',
        }}
      >
        {/* …and inner hairline. */}
        <div style={{ border: '1px solid var(--faction-everymen-sheet-hair)' }}>
          {/* Byline band: red fill + masthead ink (5.24:1 / 4.59:1). */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 'var(--space-md)',
              flexWrap: 'wrap',
              background: 'var(--everymen-red)',
              color: 'var(--everymen-masthead-text)',
              borderBottom: '3px double var(--everymen-paper)',
              padding: mobile
                ? 'var(--space-xs) var(--space-sm)'
                : 'var(--space-xs) var(--space-md)',
            }}
          >
            {byline}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 'var(--space-sm)',
                color: 'inherit',
              }}
            >
              {dateline}
            </span>
          </div>
          <div
            style={{
              background: PANEL,
              padding: mobile ? 'var(--space-sm)' : 'var(--space-md)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EverymenComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Slip
        avatar={<FactionAvatar character={character} size="sm" />}
        byline={<span style={BYLINE}>{character.display_name}</span>}
        dateline={null}
      >
        {/* `.content-text` here sizes the textarea (`font: inherit`) */}
        <div className="content-text" aria-busy={submitting}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={ACCENT}
            onAccent={ON_ACCENT}
            bg={FIELD}
            text={BODY_INK}
            hint={
              <span
                style={{
                  fontFamily: 'var(--faction-everymen-body-font)',
                  fontSize: 'var(--text-md)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--everymen-muted)',
                }}
              >
                {t('comments.mentionHint')}
              </span>
            }
          />
        </div>
      </Slip>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.

  return (
    <Slip
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
      byline={
        <Link to={`/characters/${comment.author.id}`} style={BYLINE}>
          {comment.author.display_name}
        </Link>
      }
      dateline={
        <>
          {/* Full masthead ink: 4.59:1 in dark leaves no headroom for 0.7 opacity. */}
          <span style={DATELINE}>{formatCommentTime(comment.created_at)}</span>
          {comment.is_edited && (
            <span style={DATELINE}>
              <span aria-hidden="true">· </span>
              {t('comments.edited')}
            </span>
          )}
        </>
      }
    >
      <div
        className="content-text"
        style={{
          fontFamily: 'var(--faction-everymen-body-font)',
          color: BODY_INK,
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={ACCENT}
            onAccent={ON_ACCENT}
            bg={FIELD}
            text={BODY_INK}
          />
        ) : (
          <MentionText
            body={comment.body_text}
            mentions={comment.mentions}
            // Red ink is only legible on this panel (#1223).
            accent="var(--faction-everymen-sheet-accent)"
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
            borderTop: '1px solid var(--faction-everymen-sheet-hair)',
          }}
        >
          <OwnerControls owner={owner} reveal={reveal} />
          <CommentFlagControl comment={comment} />
        </div>
      )}
    </Slip>
  )
}
