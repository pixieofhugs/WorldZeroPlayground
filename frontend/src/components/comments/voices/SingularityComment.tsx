import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  ownerRevealStyle,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { useAuth } from '../../../auth/AuthContext'
import { factionRoleVars } from '../../../utils/factionRoles'

/**
 * Singularity comment voice — THE SESSION TRANSCRIPT (ADR-0006 / ADR-0018;
 * epic #1192 / #1202, design project 19d52c65,
 * `Singularity Comment + Update Cards.dc.html`).
 *
 * Restyled onto the same terminal the feed chassis wears, so the two halves of
 * the sheet read as one window: near-black chassis, a standing raster, four blue
 * corner brackets, Share Tech Mono throughout, a `>` prompt before every line
 * and a blinking block cursor on the composer.
 *
 * **Comments are never archivable** — every sheet in the epic says so in its own
 * dialect, and it is the sheet's single most important structural fact. There is
 * no ✕, no swipe and no undo strip anywhere in this file; the archive belongs to
 * `FeedItemSlot` and to update cards only.
 *
 * ## What is inherited rather than built
 *
 * All seven states the issue names are states of shared machinery, not of this
 * file: edit / withdraw / confirm (`useOwnerEdit`), the hover-and-focus gate on
 * the owner row (`useOwnerReveal`, #1195), @mention autocomplete +
 * linkification, the live character count and the 500-char cap (#1205), and
 * flagging. This voice wires them and dresses them. Two were missing here before
 * #1202: the hover gate (the owner row was always on) and an in-voice `hint`.
 *
 * ## Repoints, and why they are three narrow ones rather than one wide one
 *
 * Singularity is dark in BOTH themes (WORLD_ZERO_STYLE §6) while the shared
 * control primitives paint from the global `--color-*` set, which was measured
 * against the app's near-white page. So `--color-text-tertiary` (the character
 * count, Cancel, the owner row) and `--color-success` (the "reported" mark) were
 * dark ink on near-black in light theme.
 *
 * The obvious fix — one repoint on the card root, as `SingularityFeedFrame` does
 * for the shared body — is WRONG here, and each exception is load-bearing:
 *
 *  - **`--color-text-primary` / `-secondary` stay put.** Inside this card their
 *    only reader is the @mention dropdown, a floating popover painting its own
 *    near-white `--color-surface-scrim` panel. Repointing them would put bright
 *    phosphor on near-white at about 1.9:1.
 *  - **`--color-danger` moves only around `OwnerControls`.** There it is ink
 *    (#dc2626 is 4.02:1 on the terminal — a 3:1 heading floor passes, 9px text
 *    does not), so it takes the sheet-measured NOTICE exactly as #1168 routed the
 *    duel seal's forfeit body. `CommentFlagControl` paints the same token as a
 *    FILL on its selected reason and its submit, and amber under
 *    `--color-bg-surface` ink would be 1.67:1 — so the flag control keeps the red.
 *  - **`--color-bg-surface` stays put**, for that same fill.
 *
 * That leaves the flag *link* at a pre-existing 4.02:1 which cannot be fixed from
 * here: the token is both ink and fill inside one shared component, which is a
 * missing seam rather than a missing measurement (WORLD_ZERO_STYLE, "the seam
 * beats the ground"). Recorded on the PR, not papered over.
 *
 * ## Always dark, in both themes
 *
 * No `dark ?` branch. Every value is an existing `--faction-singularity-*` token;
 * `-term-*` is a two-theme contract whose halves are both near-black, so the
 * cascade flips the phosphor and never the chassis. Nothing was added to
 * `index.css` — including the composer field, which used to be a hardcoded
 * `#0a1f12` and is now the chassis's own `-term-panel`.
 */

const MONO = 'var(--comment-face, var(--faction-singularity-card-font))' /* Share Tech Mono */

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

/** Terminal caption voice — every small mark on the transcript speaks in it. */
const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

/**
 * Ink-only repoint. Safe around any subtree that reads `--color-danger` as TEXT
 * — `OwnerControls` and `ComposerControls` both do. See the docblock for why it
 * is not applied to the card root.
 */
const INK_REPOINT = {
  '--color-text-tertiary': DIM,
  '--color-danger': NOTICE,
} as CSSProperties

/**
 * The flag control keeps its red (it fills with the token as well as inking with
 * it); only the post-report acknowledgement moves, and it has to — the global
 * success green is #14532d in light theme, about 1.5:1 here.
 */
const FLAG_REPOINT = { '--color-success': CREDIT } as CSSProperties

/** The comment's process handle. Ornament on a real referent, never copy. */
function handleOf(id: number): string {
  return `0x${id.toString(16).toUpperCase().padStart(3, '0')}`
}

/** Four corner brackets — the sheet's window tell. Ornament geometry, raw px. */
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

/**
 * The window both modes sit in: avatar in the margin, a bracketed terminal pane
 * carrying the standing raster. One shape for a row and for the composer, so a
 * thread reads as one session rather than a list plus a form.
 */
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
          // The pane is where the nine roles land (#2675): every mark this
          // voice draws is a child of it, in both the composer branch and the
          // transcript one.
          ...factionRoleVars('singularity', 'comment'),
          position: 'relative',
          flex: 1,
          minWidth: 0,
          // NO `overflow: hidden` here (#1255) — the composer this wraps owns
          // the @mention listbox, an absolutely positioned child, and a
          // clipping ancestor cuts it off. Nothing on this pane needed the
          // clip: it takes no corner radius, the scrim is `inset: 0` and the
          // brackets sit 3px in, so every child was already inside the frame.
          background: BG,
          border: `1px solid ${BORDER}`,
          color: INK,
          fontFamily: MONO,
          padding: 'var(--space-md) var(--space-lg)',
        }}
      >
        {/* The standing raster — a fixed scrim, no motion. Matches the feed
            chassis; the travelling sweep stays off a list surface. */}
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
            {/* The prompt read "singularity function"
                (`comments.singularity.protocol`). #1909 cut it: Singularity was
                the only faction with the slot, and the audit ruled the comment
                masthead generic. The `> ` and the caret are the prompt's
                punctuation and stay. */}
            {/* `.sg-cursor` owns the blink AND its reduced-motion guard (#1003:
                keyframes never live in a component). The caret is punctuation on
                the prompt, so it stays drawn when the blink is stilled. */}
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
  // The foot exists only when it holds something. Hidden while editing — the
  // inline editor owns Save/Cancel then.
  const showFoot = !owner.editing && (owner.isOwner || canFlag)
  // On your own comment the foot holds nothing but the gated owner row, so the
  // rule above it fades with the row: a hairline over empty space is a state the
  // sheet never draws. A flaggable (someone else's) comment keeps its foot.
  const footGate = owner.isOwner && !canFlag ? ownerRevealStyle(reveal.revealed) : null

  return (
    <Pane
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
    >
      {/* The session header: prompt, the author as the acting process, its
          handle, then the timestamp. */}
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
          {formatCommentTime(comment.author.faction_slug, comment.created_at)}
          {comment.is_edited && (
            <>
              {' '}
              {`[${t('comments.edited')}]`}
            </>
          )}
        </span>
      </div>

      {/* The transcript line. User-authored free text, so the content floor (§4)
          in both the resting and the editing state — the editor's textarea
          inherits the size through `font: inherit`. */}
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
            ...footGate,
          }}
        >
          {/* Two repoints, deliberately not one — see the docblock. */}
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
