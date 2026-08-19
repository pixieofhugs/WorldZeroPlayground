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
 * Every mark is REUSED from the kit, never redrawn: `EphemeristsSigil`,
 * `Cornice`. No new SVG.
 *
 * The band's mark was the winged sun disc until #1634 retired it kit-wide — the
 * sigil is the only mark, and this row was its last caller anywhere. It takes
 * the sigil at the disc's own height, which is under #1635's 20px threshold, so
 * what lands here is the reduced cut: the kite and its apex point, with the rule
 * floored at a device pixel rather than fading to a grey smear.
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
  INK,
  LINE,
  OCHRE,
  PLATE,
  READING,
  SHADOW,
  SMALL_CAPS,
  WASH,
} from '../factionMarks/ephemeristsPlate'
import { EphemeristsSigil } from '../sigil/EphemeristsSigil'
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
 * THE COMPOSITE HALF OF THAT READING IS HISTORY SINCE #1627, AND THE RATIO HALF
 * SINCE #2068. {@link WASH} is `none` in both cascades now, so there is nothing
 * left to composite; and the spine hue this faction flips is no longer the teal
 * that read **2.91:1** on the night plate but the plate's own brass, which reads
 * **7.22:1** light / 10.64:1 dark on that same theme-invariant near-black. The
 * miss the repoint was measured against is gone — the raw hue would now clear
 * AA here, and by a hair more than {@link BRASS_LIGHT} does.
 *
 * THE REPOINT STAYS ANYWAY, because it was never only a ratio: {@link BRASS_LIGHT} is
 * exactly the ink this faction declares for "links + affirmations", and the
 * actor's name IS a link to that player. #2141 retired the aqua this slot used
 * to read and handed the role to the brass highlight, so the sentence is now
 * true of the token it names: 5.09:1 on the vellum sheet, 9.68:1 on the night
 * plate. `-plate-quiet` clears too (5.98) and is still rejected for the
 * reason it always was — it is the MUTED role's ink, and painting the row's one
 * identity slot in a colour quieter than the body copy loses the faction rather
 * than legibly keeping it.
 */
const ROW_SKIN: FeedRowSkin = { ink: { actor: BRASS_LIGHT } }

interface BandSize {
  /**
   * The head hairline's OWN drawing box: the ornament SVG's height, and the
   * height of the viewBox it is struck in. The two must stay equal — `slice`
   * scales to cover, so a mismatch silently magnifies the rule and eats the
   * 6px insets it is drawn with rather than erroring.
   *
   * THIS IS NOT THE BAND'S HEIGHT (#2100). The band has none: it sizes to its
   * tallest child, the way the other eight feed frames always have. The
   * ornament is pinned to the band's head and keeps its own proportion
   * whatever the band grows to.
   */
  ruleHeight: number
  /** The width the hairline is drawn to fill. Geometry. */
  view: number
  /** The sigil at the head of the band. Its HEIGHT — the mark owns its ratio
   *  (#1635) — so there is one number, not two. */
  discHeight: number
  bandPadding: string
  labelSize: string
}

const SIZES: Record<'desktop' | 'mobile', BandSize> = {
  // 452 is the feed column's own basis (the sheet's `minmax(452px, 1fr)`), so
  // the band's hairline is drawn to the width it is actually shown at.
  desktop: {
    ruleHeight: 30,
    view: 452,
    discHeight: 14,
    bandPadding: 'var(--space-xs) var(--space-md)',
    labelSize: 'var(--text-md)',
  },
  mobile: {
    ruleHeight: 26,
    view: 360,
    discHeight: 10,
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
        // The ornament z-indexes (the band's hairline behind the label, the
        // cornice's own layer) stay inside this card. Without it they order against
        // whatever stacking context the feed column happens to establish, which
        // is how a positioned ornament ends up over unrelated copy (§5).
        isolation: 'isolate',
        background: PLATE,
        border: `1px solid ${LINE}`,
        boxShadow: SHADOW,
        color: INK,
      }}
    >
      {/* ── The chassis band: night sky, ruled off, four chrome slots ──
          IT DECLARES NO HEIGHT (#2100), and that is the whole of the fix. It
          sizes to its tallest child, which is how the other eight feed frames
          have always worked — so a 44px control makes a 44px band, and the next
          thing that needs more gets more without a second decision. The fixed
          30/26 this carried was the ONLY numeric masthead height in the nine
          frames, and under `overflow: hidden` it clipped anything taller than
          itself for hit-testing as well as visually, by any mechanism. That is
          what held the shared dismiss control down to a 24px target against
          §6's non-negotiable 44.

          `overflow: hidden` goes with it. With an intrinsic height there is
          nothing left for it to clip — the ornament below is an `<svg>`, which
          clips its own viewport, and the kicker carries its own ellipsis — so
          it is inert, and an inert property that re-arms the trap the moment
          someone puts a height back is worse than no property. */}
      <div
        style={{
          position: 'relative',
          background: BAND,
          color: BAND_INK,
        }}
      >
        <svg
          width="100%"
          height={size.ruleHeight}
          // The hairline keeps its OWN box, pinned to the band's head, rather
          // than reading a band height that no longer exists. Element height
          // and viewBox height are one number for that reason: `slice` crops
          // rather than erroring, so a viewBox that disagreed with its box
          // would magnify the rule and read as a design choice, not a bug.
          viewBox={`0 0 ${size.view} ${size.ruleHeight}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          <path
            d={`M6 4 H${size.view - 6}`}
            stroke={BRASS_LIGHT}
            strokeWidth="0.6"
            opacity="0.24"
          />
          {/* AN INCISED REGISTER RAN ALONG THE FOOT OF THIS BAND (#2210). It
              was the old glyph vocabulary, which #2143 replaced on the masthead
              with the notation band and then left standing everywhere else —
              two vocabularies at once, overlapping wherever they shared a band.
              The register retires; nothing replaces it here, because the
              notation band is the MASTHEAD's last line and this frame has no
              masthead: it places its four chrome slots by hand. The hairline
              above still rules the band's head. */}
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
            display: 'flex',
            // This row IS the band's height now (#2100) — it is the only
            // in-flow child, so its content plus this padding is what the night
            // ground measures. It carried `height: 100%` to fill the old fixed
            // band; against an intrinsic parent that is inert at best and the
            // second place the ceiling would come back. `center` is what keeps
            // the sigil, kicker, tag and time on one optical line beside the
            // tallest thing in the row rather than stretching to meet it.
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: size.bandPadding,
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <EphemeristsSigil size={size.discHeight} color={BAND_INK} />
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
                fontSize: 'var(--text-md)',
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
              `currentColor` and arrives finished (boxed, labelled, keyboard
              reachable, and `null` on a card that cannot be archived, which is
              `awaiting_submission`). Placed, never rebuilt. BAND_INK is what it
              spends, at full strength since #2091 — 14.00:1 here in both themes.
              It is also the tallest thing in this row at §6's 44px, so it is the
              control that sets the band's height rather than the one the band
              used to cut down to 24 (#2100). */}
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
