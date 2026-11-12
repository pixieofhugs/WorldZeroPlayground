import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { useAuth } from '../../../auth/AuthContext'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * Singularity comment voice — the session transcript (#1202), on the feed
 * chassis's terminal. Never archivable (that's `FeedItemSlot`'s).
 *
 * Always dark, so shared controls' global `--color-*` inks need narrow repoints,
 * NOT one on the card root:
 *  - `--color-text-primary/-secondary` stay: their only reader is the @mention
 *    popover on its own near-white panel (repointed: ~1.9:1).
 *  - `--color-danger` moves only around `OwnerControls` (ink there);
 *    `CommentFlagControl` also uses it as a FILL, so the flag keeps red.
 *  - `--color-bg-surface` stays, for that fill.
 * The flag link stays at 4.02:1: one token is ink and fill in a shared component
 * (a missing seam, WORLD_ZERO_STYLE).
 */

const MONO = 'var(--sg-voice-face)' /* Share Tech Mono */

const BG = 'var(--faction-singularity-term-bg)'
const PANEL = 'var(--faction-singularity-term-panel)' /* the field, inset on the chassis */
const INK = 'var(--faction-singularity-term-ink)' /* the transcript's prose */
const BRIGHT = 'var(--faction-singularity-term-bright)' /* the author, the caret */
const DIM = 'var(--faction-singularity-term-dim)' /* captions */
const BLUE = 'var(--faction-singularity-term-blue)' /* brackets, prompts, mentions */
const BORDER = 'var(--faction-singularity-term-border)'
const HAIR = 'var(--faction-singularity-term-hair)'
const NOTICE = 'var(--faction-singularity-card-notice)'
const CREDIT = 'var(--faction-singularity-card-credit)'
const ON_ACCENT = 'var(--faction-singularity-on-accent)'

const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

/** Ink-only repoint, for subtrees that read `--color-danger` as TEXT. */
const INK_REPOINT = {
  '--color-text-tertiary': DIM,
  '--color-danger': NOTICE,
} as CSSProperties

/** Only the post-report mark moves: global success green is ~1.5:1 here. */
const FLAG_REPOINT = { '--color-success': CREDIT } as CSSProperties

/** The comment's process handle (ornament, not copy). */
function handleOf(id: number): string {
  return `0x${id.toString(16).toUpperCase().padStart(3, '0')}`
}

function Brackets() {
  return (
    <>
      <span aria-hidden="true" style={{ position: 'absolute', top: 3, left: 3, width: 9, height: 9, borderTop: `1px solid ${BLUE}`, borderLeft: `1px solid ${BLUE}` }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 3, right: 3, width: 9, height: 9, borderTop: `1px solid ${BLUE}`, borderRight: `1px solid ${BLUE}` }} />
      <span aria-hidden="true" style={{ position: 'absolute', bottom: 3, left: 3, width: 9, height: 9, borderBottom: `1px solid ${BLUE}`, borderLeft: `1px solid ${BLUE}` }} />
      <span aria-hidden="true" style={{ position: 'absolute', bottom: 3, right: 3, width: 9, height: 9, borderBottom: `1px solid ${BLUE}`, borderRight: `1px solid ${BLUE}` }} />
    </>
  )
}

/** The pane both modes sit in, so a thread reads as one session. */
function Pane({
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
          // Role map lands here (#2675): every mark is a child of the pane.
          ...factionBodyVars("singularity"), ...factionRoleVars('singularity', 'sg-voice'),
          position: 'relative',
          flex: 1,
          minWidth: 0,
          // No `overflow: hidden` (#1255): it would clip the @mention listbox.
          background: BG,
          border: `1px solid ${BORDER}`,
          color: INK,
          fontFamily: MONO,
          padding: 'var(--space-md) var(--space-lg)',
        }}
      >
        {/* Standing raster, no motion: the sweep stays off a list surface. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)',
          }}
        />
        <Brackets />
        <div style={{ position: 'relative' }}>{children}</div>
      </div>
    </div>
  )
}

export default function SingularityComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Pane avatar={<FactionAvatar character={character} size="sm" />}>
        <div aria-busy={submitting}>
          <div style={{ ...LABEL, color: BLUE, marginBottom: 'var(--space-sm)' }}>
            <span aria-hidden="true">{'> '}</span>
            {/* `.sg-cursor` owns the blink and its reduced-motion guard (#1003). */}
            <span
              aria-hidden="true"
              className="sg-cursor"
              style={{
                display: 'inline-block',
                width: 5,
                height: 9,
                background: BRIGHT,
                marginLeft: 'var(--space-xs)',
                verticalAlign: 'middle',
              }}
            />
          </div>
          <div style={INK_REPOINT}>
            <ComposerControls
              value={value}
              onChange={onChange}
              onSubmit={onSubmit}
              submitting={submitting}
              accent={BRIGHT}
              onAccent={ON_ACCENT}
              bg={PANEL}
              text={INK}
              hint={<span style={{ ...LABEL, color: DIM }}>{t('comments.mentionHint')}</span>}
            />
          </div>
        </div>
      </Pane>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showFoot = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.

  return (
    <Pane
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
        <span aria-hidden="true" style={{ color: BLUE }}>
          {'>'}
        </span>
        <Link
          to={`/characters/${comment.author.id}`}
          style={{
            fontFamily: MONO,
            fontSize: 'var(--text-content)',
            color: BRIGHT,
            textDecoration: 'none',
          }}
        >
          {comment.author.username}
        </Link>
        <span aria-hidden="true" style={{ ...LABEL, color: BLUE }}>
          {handleOf(comment.id)}
        </span>
        <span style={{ ...LABEL, color: DIM, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {formatCommentTime(comment.created_at)}
          {comment.is_edited && (
            <>
              {' '}
              {`[${t('comments.edited')}]`}
            </>
          )}
        </span>
      </div>

      <div
        style={{
          fontSize: 'var(--text-content)',
          lineHeight: 1.55,
          marginTop: 'var(--space-sm)',
          color: INK,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <div style={INK_REPOINT}>
            <CommentEditor owner={owner} accent={BRIGHT} onAccent={ON_ACCENT} bg={PANEL} text={INK} />
          </div>
        ) : (
          <>
            <span aria-hidden="true" style={{ color: BLUE }}>
              {'> '}
            </span>
            <MentionText body={comment.body_text} mentions={comment.mentions} accent={BLUE} />
          </>
        )}
      </div>

      {showFoot && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-sm)',
            borderTop: `1px dashed ${HAIR}`,
          }}
        >
          <span style={INK_REPOINT}>
            <OwnerControls owner={owner} reveal={reveal} />
          </span>
          <span style={FLAG_REPOINT}>
            <CommentFlagControl comment={comment} />
          </span>
        </div>
      )}
    </Pane>
  )
}
