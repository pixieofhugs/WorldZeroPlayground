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

/**
 * Cozy Coven — THE CANDLELIT SLIP, as a comment (dress issue #1197, epic #1192).
 *
 * A slip of the coven's own paper: a candle-glow gradient along its top edge, a
 * near-white sheet under it, the byline hand-set in Grenze Gotisch and the
 * reading copy in Cormorant Garamond. The braided thread rules the foot off the
 * body, and Caveat survives as the one hand-written mark — the "edited"
 * marginalia, which is what a pencilled amendment on a slip looks like.
 *
 * THIS REPLACES the `{handle}.exe` window (ADR-0018's original Coven voice). The
 * window metaphor was retired for this faction wholesale by ADR-0055 / ADR-0056
 * (task card) and #1031 (task detail); the comment and the feed card were the
 * last two surfaces wearing it, and #1197 dresses both.
 *
 * THE FOUR FACES, and why the body moved off Caveat. The sheet names Grenze
 * Gotisch (display), Quicksand (chrome), Cormorant Garamond (reading) and Caveat
 * (hand) — four ROLES, not four decorations. A comment body is user-authored
 * content, so it takes the reading face at the content floor (§4 role floor);
 * hand-lettering a stranger's paragraph is the one place Caveat costs
 * legibility. The hand keeps the marginalia, which is the job it is named for.
 *
 * BEHAVIOUR IS NOT MINE. Edit, withdraw, flag, @mentions, the live character
 * count and the submitting state all live in the shared helpers, and the owner
 * row's hover/focus gate is F3's `useOwnerReveal` (#1195) — wired here in two
 * lines, never re-implemented. This file owns chrome and ink only.
 *
 * Seven states, one responsive component (ADR-0056 / 0058 / 0063 — no mobile
 * twin): row · default | row + mention | row · edited | row · yours (hover) |
 * row · editing | composer · empty | composer · submitting.
 *
 * Colour is entirely `--faction-coven-slip-*` / `-ward-*` — both themes already
 * declared, both already measured (#1023 / #1031). No hex, no ternary; the theme
 * flips through the `[data-theme="dark"]` cascade.
 */

const CHROME = 'var(--font-faction-rounded)' /* Quicksand */
const READING = 'var(--font-faction-serif)' /* Cormorant Garamond */
const HAND = 'var(--font-faction-script)' /* Caveat */
const DISPLAY = 'var(--font-faction-witch)' /* Grenze Gotisch */

const INK = 'var(--faction-coven-slip-ink)'
const LABEL = 'var(--faction-coven-slip-label)'
/** The CTA pair, measured at both ends in both themes (#1023). */
const ACCENT = 'var(--faction-coven-slip-cta-from)'
const ON_ACCENT = 'var(--faction-coven-slip-cta-ink)'
/** The inset field: a tinted stop of the slip's own gradient, so a textarea
 *  reads as pressed into the paper rather than painted on top of it. */
const FIELD = 'var(--faction-coven-slip-from)'

/** Small-caps chrome voice — the byline's quiet marks speak in it. */
const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: LABEL,
}

/** The slip's corner. Named because the candle glow rounds to the same arc. */
const SLIP_RADIUS = 14

/**
 * The slip both modes sit on: avatar in the margin, a near-white sheet under a
 * candle-glow edge. One shape for a row and for the composer, so the thread
 * reads as one stack of slips rather than a list plus a form.
 */
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
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--faction-coven-ward-card)',
          border: '1.5px solid var(--faction-coven-slip-border)',
          borderRadius: SLIP_RADIUS,
          // NO `overflow: hidden` here (#1255) — the composer this wraps owns
          // the @mention listbox, an absolutely positioned child, and a
          // clipping ancestor cuts it off. The glow below rounds its own ends
          // instead, which is all the clip was ever doing.
          boxShadow: 'var(--faction-coven-slip-shadow)',
        }}
      >
        {/* the candle glow along the top edge — the slip's gradient, at 4px. It
            carries the slip's top corners itself: an element's background is
            clipped by its OWN border-radius, so the glow stays inside the
            curve with nothing clipping it from above. */}
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
        {/* `.content-text` rides the wrapper because the one slot inside without
            a size of its own is the textarea (`font: inherit`), and a comment
            draft is content-tier text. Every other slot names its own size. */}
        <div
          className="content-text"
          aria-busy={submitting}
          // 500, not the default 400: index.html loads Cormorant Garamond at
          // 500/600/700 only, so an unspecified weight would be synthesised.
          style={{ fontFamily: READING, fontWeight: 500, color: INK }}
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
            // The shared string in this sheet's own caption voice — an OVERRIDE
            // of ComposerControls' neutral default, not a new hint.
            hint={<span style={CAPTION}>{t('comments.mentionHint')}</span>}
          />
        </div>
      </Slip>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // The foot exists only when it holds something: the author's edit/withdraw row
  // or a flag affordance. Hidden while editing — the inline editor owns
  // Save/Cancel then.
  const showFoot = !owner.editing && (owner.isOwner || canFlag)
  // The foot RULE is never gated (#2733): on your own comment it always draws,
  // and only the edit/delete cluster fades. `<OwnerControls reveal>` gates
  // itself — and it alone knows to stay pinned through the withdraw-confirm
  // strip, which an outer gate used to fade out from under mid-answer.

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
        <span style={CAPTION}>{formatCommentTime(slug, comment.created_at)}</span>
        {comment.is_edited && (
          // The hand's one mark on the slip: a pencilled amendment, lowercase in
          // Caveat rather than set in the chrome's small caps.
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

      {/* The body is user-authored free text — the content floor, resting and
          editing alike (the editor's textarea inherits from here). */}
      <div
        className="content-text"
        style={{
          marginTop: 'var(--space-sm)',
          fontFamily: READING,
          // See the composer: Cormorant's 400 is not among the loaded weights.
          fontWeight: 500,
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
          {/* the braided thread rules the foot off the body. `.cvn-braid` owns
              both its pigments and its dark override — a data-URI SVG is a
              separate document, so `var(--…)` inside one never resolves. */}
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
