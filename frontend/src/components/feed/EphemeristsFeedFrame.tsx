/**
 * THE EPHEMERISTS' FEED CHASSIS — a Valley plate at card size (#1199, epic
 * #1192; design `Ephemerists Comment + Update Cards.dc.html`, light + Dark in
 * one document).
 *
 * The CHASSIS layer and nothing else. Read {@link FeedFrameProps} and
 * `FeedCardRouter`'s docblock first: `FeedItemSlot` owns the whole archive
 * interaction (the ✕, the touch swipe, the immediate write, the six-second undo
 * strip) and the body is the shared faction-blind payload. This file draws the
 * physical card and places the four chrome slots on it — kicker, tag, time,
 * archive — and it neither reimplements nor gates any of the archive.
 *
 * ## The metaphor
 *
 * The v2 VALLEY PLATE, the same Deco × Egypt vocabulary as the task card
 * (#1023), task detail (#1032) and the praxis record (#1120): a night-sky
 * masthead over a fluted cavetto cornice, a winged sun disc crowning it, and the
 * event itself filed on papyrus below with an ochre margin rule struck down the
 * gutter. Cinzel small caps label it; Spectral dates it.
 *
 * This REPLACES the illuminated-codex leaf the frame wore before (foxed vellum,
 * rubric sigil, `--eph-*`). The plate is a full metaphor swap (ADR-0055) and
 * `ephemeristsPlate.tsx` is explicit that the two grounds must not be mixed on
 * one surface — so the codex atoms leave the file rather than sit under the new
 * band.
 *
 * Every mark is REUSED from `ephemeristsPlate`, never redrawn: `WingedDisc`,
 * `Cornice`, `GlyphRegister`. No new SVG.
 *
 * ## Two things the sheet draws that this card deliberately does not
 *
 * 1. **The 22px ruled grid.** On the sheet that texture is the PAGE the plate
 *    lies on, and the plate is opaque over it. The activity feed has no
 *    Ephemerists page: it is one shared, mixed, multi-faction stream, and a
 *    faction skin owns its own card and never the viewport (WORLD_ZERO_STYLE §5,
 *    the #1028 ruling). Painting a page texture onto the plate instead would be
 *    a thing the sheet itself never does. The ruled character is carried by the
 *    marks the sheet DOES strike on the plate — the cornice flutes, the brass
 *    hairline and the ochre margin rule.
 * 2. **The cornice's slow gold bloom** (`.eph-cornice-glow`). That is the praxis
 *    record's one piece of motion, on a page-long surface showing a single deed.
 *    A feed is twenty cards tall, so twenty independent 16s blooms would be the
 *    loudest thing on the page. `<Cornice />` without `glow`.
 *
 * Every colour is a `--faction-ephemerists-plate-*` token and flips through the
 * `[data-theme="dark"]` cascade — no ternary, no hex. `-brass` is a rule colour
 * and never an ink; the band's two ink tiers are `-band-ink` and the measured
 * `-band-quiet` (see index.css) rather than one ink at two opacities.
 *
 * ONE responsive component, no mobile twin (ADR-0056 / 0058 / 0063): the band's
 * geometry comes from `useFormFactor()`.
 */
import {
  BAND,
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  Cornice,
  GlyphRegister,
  INK,
  LINE,
  NILE,
  OCHRE,
  PLATE,
  READING,
  SHADOW,
  SMALL_CAPS,
  WASH,
  WingedDisc,
} from '../factionMarks/ephemeristsPlate'
import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'

/**
 * The one body ink the plate's own measurements never covered (#1341). The
 * shared row paints the actor's name in the raw `--faction-ephemerists`, a hue
 * measured against the app's neutral page — 4.37:1 on the papyrus this plate
 * used to be, and 4.15:1 once the light theme's gold {@link WASH} composited
 * over it, where 18px/700 owes 4.5:1 (700 weight reaches the large-text 3:1
 * exemption only at 18.66px).
 *
 * BOTH HALVES OF THAT READING ARE HISTORY SINCE #1627; the conclusion is not.
 * The plate is night in both cascades and {@link WASH} is `none` in both, so the
 * raw hue reads 5.56:1 flat with no composite left to take it down — the miss
 * went away rather than being fixed. The repoint stays, because it was never
 * only a ratio: {@link NILE} is exactly the ink this faction declares for
 * "links", and the actor's name IS a link to that player. It measures 7.00:1 on
 * the plate. `-plate-quiet` clears too (5.98) and is still rejected for the
 * reason it always was — it is the MUTED role's ink, and painting the row's one
 * identity slot in a colour quieter than the body copy loses the faction rather
 * than legibly keeping it.
 */
const ROW_SKIN: FeedRowSkin = { ink: { actor: NILE } }

interface BandSize {
  /** Masthead height, and the width its register is drawn to fill. Geometry. */
  height: number
  view: number
  /** The winged disc crowning the band. Geometry. */
  disc: number
  discHeight: number
  /** Strength of the incised register behind the label. */
  register: number
  bandPadding: string
  labelSize: string
}

const SIZES: Record<'desktop' | 'mobile', BandSize> = {
  // 452 is the feed column's own basis (the sheet's `minmax(452px, 1fr)`), so
  // the register's signs land at their drawn pitch instead of being sliced short.
  desktop: {
    height: 30,
    view: 452,
    disc: 58,
    discHeight: 14,
    register: 0.24,
    bandPadding: 'var(--space-xs) var(--space-md)',
    labelSize: 'var(--text-md)',
  },
  mobile: {
    height: 26,
    view: 360,
    disc: 42,
    discHeight: 10,
    register: 0.2,
    bandPadding: 'var(--space-xs) var(--space-sm)',
    labelSize: 'var(--text-base)',
  },
}

export default function EphemeristsFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const size = SIZES[useFormFactor() === 'mobile' ? 'mobile' : 'desktop']

  return (
    <div
      style={{
        position: 'relative',
        // The ornament z-indexes (the register behind the label, the cornice's
        // own layer) stay inside this card. Without it they order against
        // whatever stacking context the feed column happens to establish, which
        // is how a positioned ornament ends up over unrelated copy (§5).
        isolation: 'isolate',
        background: PLATE,
        border: `1px solid ${LINE}`,
        boxShadow: SHADOW,
        color: INK,
      }}
    >
      {/* ── The masthead: night sky, one incised register, the winged disc ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: size.height,
          background: BAND,
          color: BAND_INK,
        }}
      >
        <svg
          width="100%"
          height={size.height}
          // The viewBox tracks the band's own height so `slice` crops the
          // register at the edges rather than through the middle of every sign.
          viewBox={`0 0 ${size.view} ${size.height}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        >
          <path
            d={`M6 4 H${size.view - 6}`}
            stroke={BRASS_LIGHT}
            strokeWidth="0.6"
            opacity="0.24"
          />
          <GlyphRegister
            width={size.view}
            y={size.height - 7}
            strength={size.register}
            keyPrefix="feed"
          />
        </svg>

        {/* The four chrome slots, placed by hand rather than through
            `FeedChassisBand`: this band sets the kicker in incised small caps and
            the time in the reading face, which the shared arrangement's
            `.label-heading` / `.label-caption` pair would flatten. All four are
            still drawn — a swallowed slot
            loses a feature, not a decoration. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: size.bandPadding,
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <WingedDisc width={size.disc} height={size.discHeight} />
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: size.labelSize,
              color: BAND_INK,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {kicker}
          </span>
          {tag && (
            <span
              style={{
                ...SMALL_CAPS,
                fontSize: 'var(--text-sm)',
                color: BAND_INK,
                border: `1px solid ${BRASS}`,
                padding: '0 var(--space-xs)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tag}
            </span>
          )}
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: READING,
              fontStyle: 'italic',
              fontSize: size.labelSize,
              color: BAND_QUIET,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {time}
          </span>
          {/* The dismiss control, tinted by the band's own `color` — it paints in
              `currentColor` and arrives finished (dormant until hover OR focus,
              labelled, keyboard reachable, and `null` on a card that cannot be
              archived, which is `awaiting_submission`). Placed, never rebuilt. */}
          {archive}
        </div>
      </div>

      {/* The cavetto cornice, carrying the band's night ground out beneath it so
          masthead and cornice read as one architectural element. No `glow`. */}
      <Cornice />

      {/* ── The leaf: the event filed on papyrus ──
          The gold wash rides the leaf's own `background` rather than an absolute
          overlay: the dark plate takes no wash at all (`--plate-wash: none`), and
          a positioned layer here would need a stacking context of its own to stay
          off the copy. */}
      <div style={{ position: 'relative', background: WASH }}>
        {/* The margin rule, struck in the gutter at --space-sm so it clears the
            body's own --space-lg text inset on every payload shape — the shared
            row, and all three companions. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 'var(--space-sm)',
            top: 'var(--space-sm)',
            bottom: 'var(--space-sm)',
            width: 1,
            background: OCHRE,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
        {/* The shared payload — the slot-driven row or one of the three
            companions. Its inks are the global text tokens, which follow the
            theme exactly as the plate ground does, so nothing is set on it. */}
        <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
      </div>
    </div>
  )
}
