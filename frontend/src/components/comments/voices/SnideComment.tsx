import type { CSSProperties } from 'react'
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
  ownerRevealStyle,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'

/**
 * S.N.I.D.E. comment voice — THE INTERCEPTED SLIP (ADR-0018, redressed for
 * epic #1192 / #1198 against `Snide Comment + Update Cards.dc.html`).
 *
 * The comment half of the same sheet that draws the feed chassis, and it is the
 * same object: a xerox photocopy taped to the wall, half a degree off true,
 * dusted with the halftone raster, the author's name cut letter-by-letter out of
 * five different scraps. Rows and the composer share one shape so a thread reads
 * as a run of flyposted slips rather than a list plus a form.
 *
 * Six states, one responsive component (ADR-0056 / 0058 / 0063 — no mobile
 * twin): row · default | row · mention | row · edited | row · yours (hover) |
 * row · editing | composer · empty | composer · submitting.
 *
 * ── WHAT THIS FILE DOES NOT OWN ─────────────────────────────────────────────
 * Every behaviour is shared and stays shared: `useOwnerEdit` runs the
 * edit/withdraw state machine, `useOwnerReveal` runs F3's hover-OR-focus gate on
 * the owner row (never `display`, so Tab still reaches it, and never gated at
 * all on a device that cannot hover), `ComposerControls` owns the textarea, the
 * @-mention autocomplete, the 500-character cap and its live count, and
 * `CommentFlagControl` owns flagging. This file passes them a skin.
 *
 * ── THREE INKS ARE WALKED DOWN, AND THE STOCK NOW FLIPS ─────────────────────
 * The sheet's card is `--paper`, so this moved off the theme-invariant
 * `--faction-snide-card-bg` (photocopier black in both themes) onto the flipping
 * `--faction-snide-slip-*` stock. That is what §3's #1118 rule requires of it:
 * the slots this voice does not write — `OwnerControls`, `CommentFlagControl`,
 * the shared editor — all paint the app's global inks, and on the invariant
 * black card in the LIGHT theme `--color-text-tertiary` was 3.20:1 on the owner
 * row. On the flipping stock it lands at 5.22:1. `--color-danger` moves 3.90 →
 * 4.28:1, which is better and still under AA — it is painted by three shared
 * controls that take no ink prop, so it is §3's #1153 missing-seam case rather
 * than something this voice can route. See the token block's note.
 *
 * Moving to paper is also what forces the three walk-downs, and this is the
 * #1224 trap the design notes name outright: acid is a DRAWN thing, not an ink.
 *   • resolved @mentions: `--faction-snide-acid` → `-slip-acid-ink` (1.35 → 5.20)
 *   • the composer's marker prompt: `-pink` → `-slip-pink-ink` (3.10 → 5.35)
 *   • the pink ransom tile's letter: paper-white → `-on-accent` (3.50 → 5.38)
 * Acid keeps its bright pigment wherever it is drawn rather than read — the
 * ransom scraps, the submit button's fill, the field's rule.
 *
 * The BODY face is Special Elite (`-font-type`), per the sheet's own type line
 * (Anton headline · Archivo Black · Special Elite body). It used to be condensed
 * Bebas forced to uppercase, which is a poster treatment applied to somebody
 * else's prose; only the cut-out NAME is a poster now.
 */

/**
 * The five scraps the author's name is cut from. Only the first FLIPS — it is a
 * paler patch of the sheet itself, so on a dark stock it has to be a darker one
 * or the letter loses its edge. The other four are the PRESS's theme-invariant
 * pigments: over-inked black, hot pink, acid. A scrap is a drawn thing.
 */
const RANSOM = [
  {
    bg: 'var(--faction-snide-slip-field)',
    col: 'var(--faction-snide-slip-ink)',
    font: 'var(--faction-snide-font-impact)',
    rot: -5,
  },
  {
    bg: 'var(--faction-snide-ink)',
    col: 'var(--faction-snide-acid)',
    font: 'var(--faction-snide-font-cond)',
    rot: 4,
  },
  {
    bg: 'var(--faction-snide-pink)',
    col: 'var(--faction-snide-on-accent)',
    font: 'var(--faction-snide-font-black)',
    rot: -3,
  },
  {
    bg: 'var(--faction-snide-acid)',
    col: 'var(--faction-snide-ink)',
    font: 'var(--faction-snide-font-impact)',
    rot: 6,
  },
  {
    bg: 'var(--faction-snide-ink)',
    col: 'var(--faction-snide-paper)',
    font: 'var(--faction-snide-font-cond)',
    rot: -6,
  },
]

function Ransom({ text, size = 16 }: { text: string; size?: number }) {
  return (
    // THE NAME MUST STAY ONE READABLE STRING. This byline is the accessible
    // name of the link to the author's profile, and it was an `inline-flex` row
    // of per-letter tiles spaced with `gap`: a flex container discards
    // whitespace-only children, and the space CHARACTER was drawn as an empty
    // box, so the link announced "VexLineCrane" (#1043, the fix #1023 made on
    // the SNIDE task card). Ordinary inline flow instead — REAL spaces between
    // the words, the tiles still `inline-block` and still wrapping, their
    // kerning carried by a margin and the wrapped rows by the line-height.
    <span style={{ display: 'inline-block', fontSize: size, lineHeight: 1.25 }}>
      {[...text].map((char, index) => {
        if (char === ' ') return <span key={index}>{' '}</span>
        const s = RANSOM[(char.charCodeAt(0) + index * 3) % RANSOM.length]
        return (
          <span key={index} style={{ display: 'inline-block', verticalAlign: 'middle', background: s.bg, color: s.col, fontFamily: s.font, fontSize: size, lineHeight: 0.92,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of a single cut-out letter tile inside its scrap of paper
            padding: '2px 5px 0',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: kerning between the cut-out ransom letters; a rung breaks the pasted-up letterform run
            marginRight: 2,
            transform: `rotate(${s.rot}deg)`, boxShadow: '1.5px 2.5px 0 var(--faction-snide-slip-scrap-shadow)', textTransform: 'uppercase' }}>
            {char}
          </span>
        )
      })}
    </span>
  )
}

/**
 * The slip itself — the same stock, raster, border and hard printed shadow the
 * feed chassis paints, so the two halves of the sheet read as one object.
 *
 * The tilt and the offset shadow are desktop-only: in a narrow single column a
 * rotated card fouls its neighbours' edges and the shadow eats the gutter.
 */
function slip(mobile: boolean): CSSProperties {
  return {
    position: 'relative',
    background: 'var(--faction-snide-slip-paper)',
    color: 'var(--faction-snide-slip-ink)',
    border: '1.5px solid var(--faction-snide-slip-ink)',
    backgroundImage:
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px),' +
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px)',
    backgroundSize: '3px 3px, 4px 4px',
    backgroundPosition: '0 0, 2px 1px',
    boxShadow: mobile ? undefined : 'var(--faction-snide-slip-shadow)',
    transform: mobile ? undefined : 'rotate(-0.6deg)',
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the ransom slip's graded 20/18/16 inset. The scale has no rung between 16 and 24, so every tokenization collapses top/sides/bottom to one value and regularizes the archetype (§4a asymmetric-inset exception).
    padding: '20px 18px 16px',
  }
}

function Tape() {
  return (
    <>
      <div className="snide-tape" aria-hidden="true" style={{ top: -8, left: 28, transform: 'rotate(-8deg)' }} />
      <div className="snide-tape" aria-hidden="true" style={{ top: -8, right: 22, transform: 'rotate(7deg)' }} />
    </>
  )
}

/** Typewriter label voice — the timestamp, the edited mark, the composer hint. */
const TYPED: CSSProperties = {
  fontFamily: 'var(--faction-snide-font-type)',
  fontSize: 'var(--text-lg)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

/** The field tier: an input reads as inset on the stock, not painted onto it. */
const FIELD = {
  // Acid is a DRAWN thing here — the box's rule and the submit fill — and the
  // press's near-black is the type that prints on it, in both themes.
  accent: 'var(--faction-snide-acid)',
  onAccent: 'var(--faction-snide-ink)',
  bg: 'var(--faction-snide-slip-field)',
  text: 'var(--faction-snide-slip-ink)',
} as const

export default function SnideComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const mobile = useFormFactor() === 'mobile'
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={slip(mobile)} aria-busy={submitting}>
        <Tape />
        <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <FactionAvatar character={character} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* The marker scrawl across the head of the slip. Pink as TEXT, so
                the walked-down ink rather than the poster pigment. */}
            <div style={{
              fontFamily: 'var(--faction-snide-font-marker)',
              color: 'var(--faction-snide-slip-pink-ink)',
              transform: 'rotate(-1deg)', marginBottom: 'var(--space-sm)',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: rotated marker scrawl, an optical size the type scale has no rung for
              fontSize: 11,
            }}>
              {t('comments.snide.prompt')}
            </div>
            {/* The draft is content-tier free text; the textarea inherits the
                size from this wrapper (`font: inherit`), which is why the class
                rides here rather than on any slot inside. */}
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
                // The shared string, typed in this sheet's own label voice — an
                // OVERRIDE of the neutral default, not a new affordance.
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
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // The foot only exists when it holds something: the author's own row, or a
  // flag affordance for everyone else. The inline editor owns Save/Cancel while
  // editing, so the foot stands down then.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // On your OWN slip the foot holds nothing but the gated owner row, so the
  // censor rule above it fades with the row — a hairline over empty space is a
  // state the sheet never draws.
  const footGate = owner.isOwner && !canFlag ? ownerRevealStyle(reveal.revealed) : null

  return (
    <div style={slip(mobile)} {...reveal.containerProps}>
      <Tape />
      <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
        <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Link to={`/characters/${comment.author.id}`} style={{ textDecoration: 'none' }}>
              <Ransom text={comment.author.display_name} size={16} />
            </Link>
            <span style={{ ...TYPED, color: 'var(--faction-snide-slip-muted)', whiteSpace: 'nowrap' }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited && (
                <>
                  <span aria-hidden="true"> · </span>
                  {t('comments.snide.edited')}
                </>
              )}
            </span>
          </div>
          {/* Somebody else's prose: the content floor, typed rather than set in
              the condensed poster face, and not forced to uppercase. */}
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
                // A censor rule inside the slip, quieter than its cut edge.
                borderTop: '1px solid var(--faction-snide-slip-rule)',
                ...footGate,
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
