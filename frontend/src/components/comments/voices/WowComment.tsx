import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { useAuth } from '../../../auth/AuthContext'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'

/**
 * Warriors of Whimsy — counsel in the proclamation (#1204): the update card's
 * chrome exactly (`WowFeedFrame`). One component, no mobile twin.
 *
 * No Huzzah reaction pill and no Reply: no reaction endpoint exists (a no-op
 * control is forbidden) and comments are flat (ADR-0006).
 * `--faction-wow-card-muted` is a CREAM-only ink (4.25:1 on `-chronicle-panel`,
 * #1221): muted marks stay on the cream sheet; only the composer field (ink
 * `-card-text`, 13:1) uses the parchment plate.
 */

const MED = 'var(--wow-comment-face)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const INK = 'var(--wow-comment-ink)'
const MUTED = 'var(--wow-comment-quiet)'
const PLUM = 'var(--wow-comment-accent)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'

/** Crest at 44px per the kit (`sm` is too small to read as a seal); ornament, §4a. */
const CREST_AVATAR = 44

/** The barber ribbon: crown and section rule (§4a). */
const CROWN_HEIGHT = 6
const RULE_HEIGHT = 3
const RULE_OPACITY = 0.75

const QUIET: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  fontSize: 'var(--text-lg)',
  color: MUTED,
}

/** Shared with the crown's arc. */
const SHEET_RADIUS = 9

/** The sheet both modes sit on, so a thread reads as one stack. */
function Sheet({
  avatar,
  children,
  containerProps,
}: {
  avatar: ReactNode
  children: ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          // Role map (#2674) on the sheet, not the row: the crest is a sibling.
          ...factionBodyVars("wow"), ...factionRoleVars('wow', 'wow-comment'),
          flex: 1,
          minWidth: 0,
          borderRadius: SHEET_RADIUS,
          // No `overflow: hidden` (#1255): it would clip the @mention listbox.
          background: 'var(--wow-comment-paper)',
          color: INK,
          border: `2px solid ${GOLD}`,
          boxShadow: 'var(--faction-wow-quest-shadow)',
          fontFamily: LORA,
        }}
      >
        {/* The crown carries no text, so undimmed gold/plum is fine (§3, #840);
            it rounds its own top corners since nothing clips it. */}
        <div
          aria-hidden
          style={{
            height: CROWN_HEIGHT,
            borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`,
            background: RIBBON,
          }}
        />
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>{children}</div>
      </div>
    </div>
  )
}

function RibbonRule({ style }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{ height: RULE_HEIGHT, background: RIBBON, opacity: RULE_OPACITY, ...style }}
    />
  )
}

export default function WowComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Sheet avatar={<FactionAvatar character={character} size={CREST_AVATAR} />}>
        {/* `.content-text` here sizes the textarea (`font: inherit`) */}
        <div className="content-text" aria-busy={submitting}>
          <RibbonRule style={{ marginBottom: 'var(--space-md)' }} />
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={PLUM}
            onAccent="var(--faction-wow-on-accent)"
            // Inset plate; its ink `-card-text` is 13:1 on it.
            bg="var(--faction-wow-chronicle-panel)"
            text={INK}
            hint={<span style={QUIET}>{t('comments.mentionHint')}</span>}
          />
        </div>
      </Sheet>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.

  return (
    <Sheet
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size={CREST_AVATAR} />}
      containerProps={reveal.containerProps}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
        }}
      >
        <Link
          to={`/characters/${comment.author.id}`}
          style={{
            fontFamily: MED,
            fontSize: 'var(--text-content)',
            color: INK,
            textDecoration: 'none',
          }}
        >
          {comment.author.display_name}
        </Link>
        <span style={QUIET}>{formatCommentTime(comment.created_at)}</span>
        {comment.is_edited && (
          <span style={QUIET}>
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>

      <div
        className="content-text"
        style={{
          marginTop: 'var(--space-sm)',
          fontFamily: LORA,
          color: INK,
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={PLUM}
            onAccent="var(--faction-wow-on-accent)"
            bg="var(--faction-wow-chronicle-panel)"
            text={INK}
          />
        ) : (
          <MentionText body={comment.body_text} mentions={comment.mentions} accent={PLUM} />
        )}
      </div>

      {showControls && (
        <div>
          <RibbonRule style={{ marginTop: 'var(--space-md)' }} />
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
    </Sheet>
  )
}
