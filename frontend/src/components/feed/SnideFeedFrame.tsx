import type { CSSProperties } from 'react'
import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'

/**
 * S.N.I.D.E. activity-feed CHASSIS (surface #12, SPEC-faction-ui-profile.md §12).
 *
 * Design: `Snide Comment + Update Cards.dc.html` (+ its `- Dark` companion),
 * epic #1192 / #1198. An INTERCEPTED SLIP: a xerox photocopy flyposted on the
 * wall, taped down at the head, half a degree off true, dusted with the halftone
 * raster, with an acid sprocket stripe ruled down its left edge and a near-black
 * intake bar typed across its top.
 *
 * ── WHAT THIS LAYER OWNS ────────────────────────────────────────────────────
 * The outside of the card and the four chrome slots of {@link FeedFrameProps},
 * and nothing else. The archive itself — the ✕'s behaviour, swipe-to-archive,
 * the immediate write, the six-second undo strip — lives OUTSIDE in
 * `FeedItemSlot` and is inherited free; `archive` arrives here as a finished
 * node and is PLACED, never rebuilt. The payload (`FeedRowContent` or one of the
 * three companions) arrives as `children` and is faction-blind: it self-pads and
 * paints its own inks, so this frame gives it a stock and stays out of its way.
 *
 * All fifteen feed types therefore ride this one chassis unchanged, including
 * the nine the design sheet never drew — the drawing is a style sheet, not a
 * screenshot. `era_announcement` is the deliberate exception and never reaches
 * here (epic decision 6). `awaiting_submission` arrives with `archive === null`,
 * which is the whole of "not archivable" on this side of the seam: the slot
 * refuses to hand out a control the backend would 400, and the bar simply has
 * one fewer thing in it. Nothing here draws a disabled stand-in.
 *
 * ── WHY THE STOCK FLIPS ─────────────────────────────────────────────────────
 * `--faction-snide-slip-*` is a FLIPPING family, unlike the theme-invariant
 * `--faction-snide-paper`/`-ink` this frame used to paint. That is a contrast
 * fix, not a taste call: the body is shared payload written in the app's global
 * inks (`--color-text-primary`/`-secondary`/`-tertiary`), those flip with the
 * theme, and §3's #1118 rule — a block whose ink you do not control gets the
 * stock that ink was measured on — makes a flipping stock mandatory. The old
 * invariant paper put `#f0e6d0` headline copy on `#f4f1e8` at night: 1.10:1.
 *
 * ── ACID IS A DRAWN THING, NOT AN INK ───────────────────────────────────────
 * The sprocket stripe, the rule under the bar and the tag chip's edge take the
 * bright `--faction-snide-acid`, which measures 1.35:1 as type on the light
 * stock (#1224). The kicker is TYPE, so on the near-black bar it reads the
 * PRESS's paper — and the bar exists partly so that it can: a kicker typed
 * straight onto the stock would have to be walked down to
 * `--faction-snide-slip-acid-ink`, which is quieter than this card's loudest
 * line should be.
 *
 * One responsive component, no mobile twin (ADR-0056 / 0058 / 0063): the tilt
 * and the hard offset shadow are desktop-only — in a single narrow column a
 * rotated card fouls its neighbours' edges and the shadow eats the gutter — and
 * the stripe narrows. Everything else is identical.
 */
/**
 * The shared body's one ink that is wrong on this stock (#1341). The row paints
 * the actor's name in the raw `--faction-snide`, measured against the app's
 * neutral page: 2.41:1 on the light slip, and the name is 18px/700, so it owes
 * 4.5:1 rather than the large-text 3:1. It is the *deep* acid at that — the
 * bright pigment reads 1.07:1 there.
 *
 * The ink that fixes it is the one this faction already minted for exactly the
 * question "acid, but as TYPE on the slip": `-slip-acid-ink`, 5.21:1 light /
 * 15.55:1 dark, and the same ink a resolved @mention prints in a comment on this
 * very card. A repoint, not a mint — {@link FeedRowInk.actor}'s docblock makes
 * this slot a place to re-point an existing ink and never a reason to make one —
 * and the acid stays a DRAWN thing everywhere else on the slip (the sprocket
 * stripe, the rule under the intake bar, the tag chip's edge).
 */
const ROW_SKIN: FeedRowSkin = { ink: { actor: 'var(--faction-snide-slip-acid-ink)' } }

export default function SnideFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const mobile = useFormFactor() === 'mobile'

  const slip: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    marginBottom: 'var(--space-lg)',
    background: 'var(--faction-snide-slip-paper)',
    color: 'var(--faction-snide-slip-ink)',
    border: '1.5px solid var(--faction-snide-slip-ink)',
    // The xerox raster: two offset dot screens in the stock's own ink, so the
    // grain inverts with the sheet instead of staying a light-mode smudge.
    backgroundImage:
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px),' +
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px)',
    backgroundSize: '3px 3px, 4px 4px',
    backgroundPosition: '0 0, 2px 1px',
    // Printed, not floating — a hard offset with no blur.
    boxShadow: mobile ? undefined : 'var(--faction-snide-slip-shadow)',
    transform: mobile ? undefined : 'rotate(-0.6deg)',
    // Clips the tape to a half-strip, as if it were applied from behind.
    overflow: 'hidden',
  }

  return (
    <div style={slip}>
      {/* The acid sprocket stripe ruled down the left edge. A drawn thing, so it
          keeps the bright pigment; a flex child rather than an absolute overlay
          so the column beside it needs no inset to keep clear of it. */}
      <span
        aria-hidden="true"
        style={{
          // Ornament geometry — the drawn stripe's own width, not layout spacing.
          width: mobile ? 5 : 8,
          flexShrink: 0,
          background: 'var(--faction-snide-acid)',
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 13px, var(--faction-snide-slip-bar) 13px 14px)',
        }}
      />

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {/* A strip of tape pinning the slip to the wall. */}
        <div
          className="snide-tape"
          aria-hidden="true"
          style={{ top: -9, right: 40, width: 64, height: 20, transform: 'rotate(5deg)' }}
        />

        {/* ── THE INTAKE BAR ── the kicker band, over-inked across the head of
            the slip. It carries three of the four chrome slots and tints the
            fourth: `archive` paints in `currentColor`, so setting `color` here
            is what makes the ✕ read paper-white on the bar in both themes. */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            minWidth: 0,
            padding: mobile
              ? 'var(--space-xs) var(--space-sm)'
              : 'var(--space-xs) var(--space-md)',
            background: 'var(--faction-snide-slip-bar)',
            color: 'var(--faction-snide-paper)',
            // The bar is only 1.4:1 against the dark stock, so this rule is what
            // draws the band's foot at night. Structure, not garnish.
            borderBottom: '2px solid var(--faction-snide-acid)',
          }}
        >
          {/* The card's kind, cut in the condensed poster face. */}
          <span
            style={{
              fontFamily: 'var(--faction-snide-font-cond)',
              fontSize: 'var(--text-xl)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              lineHeight: 1.1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {kicker}
          </span>

          {/* The status chip — nullable, and today only ever "Still waiting". */}
          {tag && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: 'var(--faction-snide-font-type)',
                fontSize: 'var(--text-base)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                lineHeight: 1.2,
                color: 'var(--faction-snide-acid)',
                border: '1px solid var(--faction-snide-acid)',
                padding: '0 var(--space-xs)',
                whiteSpace: 'nowrap',
              }}
            >
              {tag}
            </span>
          )}

          {/* The timestamp, typed. Right-aligned on the bar's own line. */}
          <span
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              fontFamily: 'var(--faction-snide-font-type)',
              fontSize: 'var(--text-lg)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            {time}
          </span>

          {archive}
        </div>

        {/* The slip's body — the shared payload, which self-pads and paints its
            own inks. It gets a stock and nothing else. */}
        <div style={{ position: 'relative' }}>
          <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
        </div>
      </div>
    </div>
  )
}
