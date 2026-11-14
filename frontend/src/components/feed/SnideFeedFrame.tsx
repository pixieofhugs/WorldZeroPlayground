import type { CSSProperties } from 'react'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import { factionBodyVars } from '../../utils/factionBodyFace'

/**
 * S.N.I.D.E. feed chassis (surface #12, SPEC-faction-ui-profile.md §12; epic
 * #1192 / #1198): an intercepted xerox slip, halftone raster, acid sprocket
 * stripe, near-black intake bar. No tape strip: removed by owner override
 * (#1708); don't put it back.
 *
 * Owns the outside and the four chrome slots; `archive` arrives finished from
 * `FeedItemSlot` (null on `awaiting_submission`), children are the
 * faction-blind self-padding payload.
 *
 * The `-slip-*` stock FLIPS with the theme because the body is written in the
 * global flipping inks (§3, #1118); an invariant paper measured 1.10:1 at night.
 * Acid is a drawn thing, never type (1.35:1 on light, #1224); the kicker sits
 * on the dark bar so it can read in paper.
 *
 * One responsive component (ADR-0056/0058/0063): tilt and offset shadow are
 * desktop-only; the stripe narrows on mobile.
 */
/**
 * Actor ink (#1341): raw `--faction-snide` is 2.41:1 on the light slip.
 * Repoints to the existing `-slip-acid-ink` (5.21:1 / 15.55:1), not a new mint.
 */
const ROW_SKIN: FeedRowSkin = { ink: { actor: 'var(--faction-snide-slip-acid-ink)' } }

export default function SnideFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const slip: CSSProperties = {
    ...factionBodyVars("snide"),
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    marginBottom: 'var(--space-lg)',
    background: 'var(--faction-snide-slip-paper)',
    color: 'var(--faction-snide-slip-ink)',
    border: '1.5px solid var(--faction-snide-slip-ink)',
    // Two offset dot screens in the stock's own ink, so the grain inverts.
    backgroundImage:
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px),' +
      'radial-gradient(var(--faction-snide-slip-grain) 1px, transparent 1px)',
    backgroundSize: '3px 3px, 4px 4px',
    backgroundPosition: '0 0, 2px 1px',
    // Hard offset, no blur.
    boxShadow: 'var(--snide-slip-shadow, var(--faction-snide-slip-shadow))',
    transform: 'var(--snide-slip-tilt)',
    // Guillotined: stripe and bar stop at the cut edge.
    overflow: 'hidden',
  }

  return (
    <div style={slip}>
      {/* Acid sprocket stripe; a flex child so the column needs no inset. */}
      <span
        aria-hidden="true"
        style={{
          // Ornament geometry, not spacing.
          width: 'var(--snide-stripe-width)',
          flexShrink: 0,
          background: 'var(--faction-snide-acid)',
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 13px, var(--faction-snide-slip-bar) 13px 14px)',
        }}
      />

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {/* Intake bar: three chrome slots, and its `color` tints the ✕
            (`currentColor`) paper-white in both themes. */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            minWidth: 0,
            padding: 'var(--feed-bar-pad)',
            background: 'var(--faction-snide-slip-bar)',
            color: 'var(--faction-snide-paper)',
            // The bar is 1.4:1 on the dark stock; this rule draws its foot at night.
            borderBottom: '2px solid var(--faction-snide-acid)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--faction-snide-font-marker)',
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

          {/* Status chip; today only "Still waiting". */}
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

        <div style={{ position: 'relative' }}>
          <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
        </div>
      </div>
    </div>
  )
}
