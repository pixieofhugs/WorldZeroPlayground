/**
 * SnideProfileBody — S.N.I.D.E. ransom-note / crime-board player-profile skin
 * (#460). Ported from docs/design/profile/templates/SNIDE Profile.dc.html: hard
 * offset shadows, skewed Impact headlines with a pink drop-shadow,
 * halftone dot texture, and the tagline pasted up as a ransom slip (#1630, which
 * also dropped the torn acid strip along the header top).
 *
 * S.N.I.D.E. IS NOT AN ALWAYS-DARK FACTION (#2631, ADR-0085). "SNIDE is ALWAYS
 * DARK — its --faction-snide-* tokens are identical in both themes, so the
 * container scopes data-theme='dark' to itself" stood here, and it stopped being
 * true at #1023 and #2065: `-wall` and `-note-paper` both FLIP. This file was the
 * last of six surfaces still asserting it and the only one that acted on it with
 * a THEME PIN — `dataTheme: 'dark'` on the skin container froze every alias
 * inside to its night value whatever the viewer had chosen, so a light-mode
 * player's own profile was a black rectangle in the middle of a cream page.
 * The pin is gone. Three registers, and which one a mark takes is the whole of
 * the repair (ADR-0085 states them once):
 *
 *   `-wall` / `-note-*`   the flipping GROUND and the inks read on it — this
 *                         page, its header, its panels, its empty states
 *   `-ink`                the PRESS. An ink, and the plate acid carries when it
 *                         has to sit on a wall that flips (#2173)
 *   `-card-*`             the evidence SLAB pasted on the wall. This page paints
 *                         none, and `-card-muted` (1.24:1 on the light wall) was
 *                         the one it did.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-snide-* vars, and no `dark ?` branch anywhere.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'

/** The ground, which FLIPS: xerox stock by day, pitch black by night. */
const WALL = 'var(--faction-snide-wall)'
/** Type on that ground — 15.95:1 light / 17.52:1 dark. */
const NOTE_INK = 'var(--faction-snide-note-ink)'
/** Its quiet tier, for eyebrows and meta — 6.75:1 / 12.38:1. */
const NOTE_MUTED = 'var(--faction-snide-note-muted)'
/** The walked pink, for pink that carries a WORD — 6.67:1 / 7.41:1 on the wall.
 *  `PINK` below is the PIGMENT and is 2.96:1 as type by day. */
const NOTE_PINK = 'var(--faction-snide-note-pink-ink)'
/** The wall-end rung of the acid hue (#2177) — 7.71:1 / 11.36:1. The level
 *  numeral is a bare `color:` knob on the shared renderer, so it cannot carry a
 *  plate the way a span can; this is the rung that reads without one. */
const WALL_GREEN = 'var(--faction-snide-wall-credit)'
/** The hairline that separates a wall-grounded panel from a wall-grounded page.
 *  LOAD-BEARING, not ornament (§6, #2065): near-black by day, acid by night. */
const EDGE = 'var(--faction-snide-note-wall-edge)'
/** The wall's own texture ink, which reverses polarity with its ground. */
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-ink)' // the press: an ink, and acid's plate
const PAPER = 'var(--faction-snide-paper)' // warm xerox — an ink, never a ground
const ACID = 'var(--faction-snide-acid)' // acid green accent
const PINK = 'var(--faction-snide-pink)' // hot zine pink
const IMPACT = 'var(--faction-snide-font-impact)' // Anton
const TYPE = 'var(--faction-snide-font-type)' // Special Elite
const MARKER = 'var(--faction-snide-font-marker)' // Permanent Marker

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: TYPE,
          fontSize: 'var(--text-base)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          // The eyebrow typed in the INVARIANT `-paper`, which on a page that
          // had become xerox stock was xerox white on xerox stock — 1.05:1.
          color: NOTE_MUTED,
          marginBottom: 'var(--space-xs)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: IMPACT,
          fontSize: 'var(--text-heading)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          transform: 'skewX(-5deg)',
          margin: 0,
          textShadow: `2px 2px 0 ${PINK}`,
        }}
      >
        {/* THE HEADING IS ACID, SO IT CARRIES THE PLATE (#2173, and the hero's
            wordmark verbatim). Acid on the light wall is 1.03:1 and there is no
            darker acid to reach for — `-acid-deep` only gets to 2.30:1. So the
            GROUND moves per §3, and the black plate is the censor bar the
            ruling asked for; at night it dissolves into the wall and the mark is
            plain acid, exactly as it was. 15.55:1 in both cascades.
            THE PLATE IS ON AN INLINE SPAN, not on the h2: an inline box's
            background covers the FONT's ascent-to-descent, so it wraps the
            letters whatever the leading does. Horizontal padding is the strike
            of the redaction. */}
        <span style={{ color: ACID, background: INK, padding: '0 var(--space-sm)' }}>{title}</span>
      </h2>
      {/* The pink rule keeps the PIGMENT on the bare wall, the same deliberate
          hold the faction page's barcode takes (#2173, restated by #2343): it
          carries no informational content, so no ratio is owed, and it reads
          2.96:1 by day — a rule printed a little fainter than at night. */}
      <div style={{ height: 2, marginTop: 'var(--space-sm)', borderTop: `2px dashed ${PINK}` }} />
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'snide',
  // NO `dataTheme` (#2631). It read `'dark'`, and it is deleted rather than
  // repointed: a pin is only ever right for a faction whose ground has one value
  // in both cascades, which is `SingularityProfileBody` — a terminal is black —
  // and is not this one. With the pin gone every alias below resolves in the
  // viewer's own cascade, which is what makes the `-wall`/`-note-*` family work
  // at all; pinning them would have frozen the flip this whole file now depends
  // on. This skin never mutated the GLOBAL theme and still does not.
  pageBackground: WALL,
  // The halftone dot field (#2139), the twin of Everymen's grain and reached the
  // same way — through a skin prop the colour arm does not judge. The DENSITY is
  // the drawing and is unchanged; the HUE could not survive the ground moving.
  // Acid at 5% over xerox stock is a luminance step of ~0.0006 — the page would
  // have rendered as the one flat rectangle in the app. `-wall-text` flips with
  // the wall, so the raster reverses polarity with its ground, at the same
  // percentage and the same pitch (#2343's call, on the hero's own field).
  pageOverlay: `radial-gradient(color-mix(in srgb, ${WALL_TEXT} 5%, transparent) 1px, transparent 1px)`,
  ink: NOTE_INK,
  // `-card-muted` is the SLAB's quiet tier, #d8d6c8, and reads 1.24:1 on the
  // light wall. This page paints no slab (#2066).
  muted: NOTE_MUTED,
  // The level numeral, and `accent`'s only reader since #2213. See WALL_GREEN:
  // acid is 1.03:1 here and the knob is a bare `color:`, with no style object of
  // its own to hang a plate on.
  accent: WALL_GREEN,
  surface: WALL,
  border: EDGE,
  displayFont: IMPACT,
  eyebrowFont: TYPE,
  bodyFont: TYPE,
  headerStyle: {
    // The banner is a flyer pasted to the wall, not a slab on it: same ground as
    // the page, and the EDGE plus the offset print register are the only things
    // that separate it from what it is pasted to (§6, #2065). The acid hairline
    // that did the job before could not — at full strength it is a 0.03
    // luminance step over xerox stock.
    background: WALL,
    border: `1px solid ${EDGE}`,
    // ornament (#1609): the flyposter's flat offset shadow — the print
    // metaphor, not elevation, so neither cast rung fits. Same drawing as the
    // faction hero's and the ransom seal's. The ink is now
    // `--color-print-offset`. This was the hardest impression on the page at
    // 55%; #2302 collapsed the nine strengths onto one, so it prints at 40%
    // like every other register.
    boxShadow: '8px 10px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
    // The torn acid strip along the top is dropped (#1630), and the 3xl top
    // inset that was reserving room for it goes with it — a band sized for an
    // absent ornament is #1138's shape (hiding the mark does not hide the SPACE
    // it was given).
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-3xl)',
  },
  // The same offset register as the header, struck through `filter` so it follows
  // the card's cut edge rather than its box (#1609). `filter` is not a
  // COLOUR_PROP, so the ratchet never reported this one — it is the blind spot
  // the legacy list records, not a site anybody decided to keep raw.
  credentialFrame: (card) => (
    <div
      style={{
        transform: 'rotate(-1.5deg)',
        filter: 'drop-shadow(6px 8px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent))',
      }}
    >
      {card}
    </div>
  ),
  /**
   * The tagline PASTED UP as a ransom slip (#1630).
   *
   * The one slot on this page where the faction's metaphor is a physical object
   * rather than a typeface: acid stock, photocopier ink, cut at a slight angle
   * and stuck down with a hard offset shadow. `inline-block` is what makes it a
   * slip instead of a band — the ground has to hug the words, and the shared
   * `TaglineSlot` is a `<p>`.
   *
   * IT BRINGS ITS OWN GROUND, which is why #2631 left the pairing alone: acid
   * stock with press-ink type is 15.55:1 in BOTH cascades and never reads the
   * page, exactly like the hero's motto sticker and the medallion below. A mark
   * that paints its own stock does not re-measure when the page changes stock.
   * The skewX and pink drop-shadow the slot wore before are gone — a slip that
   * is both sheared AND rotated reads as a rendering error rather than a cut.
   *
   * The meta line beneath it needed nothing: `bodyFont` is already
   * --faction-snide-font-type (Special Elite, declared in index.css and worn by
   * six SNIDE surfaces), so the typewriter was there the whole time.
   */
  taglineExtra: {
    display: 'inline-block',
    background: ACID,
    color: INK,
    // 4px 12px 6px in the design; the bottom rounds to the 8px rung, since a
    // 2px optical trim is not a spacing decision the scale needs to express.
    padding: 'var(--space-xs) var(--space-md) var(--space-sm)',
    transform: 'rotate(-0.7deg)',
    // ornament (#1609): same flat offset print register at a tighter 4/4px
    // offset. Strength is the uniform 40% (#2302; this chip printed at 45%).
    boxShadow: '4px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
    letterSpacing: '-0.01em',
    textTransform: 'uppercase',
  },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: WALL,
    border: `2px solid ${EDGE}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill:
    'repeating-linear-gradient(45deg, var(--faction-snide-acid) 0 6px, var(--faction-snide-acid-deep) 6px 12px)',
  // THE GROOVE IS THE PLATE, which is the same repair the field desk's level
  // track took (#2287) and for the same reason: the fill above ramps between the
  // two acids, and a DRAWN mark owes 1.4.11's 3:1 on the ground it is actually
  // on. On the light wall those two ends read 1.03:1 and 2.30:1; on the press
  // they are 15.55:1 and 6.93:1, in both cascades. The 12% wash of the xerox
  // white that stood here was legible only because the panel was black.
  barTrack: INK,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `2px dashed ${EDGE}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: WALL,
  },
  // UNCHANGED, and deliberately so (#2631): the laurel is a medallion that
  // brings its own stock — a xerox disc with press-ink laurel, inside the shared
  // spectrum ring, which is its own edge on any ground. `-paper` is spent here
  // as the ink of an object, which is what #2227 was right about and what this
  // file does NOT reverse.
  laurel: <SpectrumLaurel centerBg={PAPER} glyphColor={INK} rotate={-8} />,
  // The board is pasted to the wall like every other panel on this page (#2631),
  // so it takes the wall and the edge. This REVERSES the ink ground #2227 gave
  // it, on the same ruling that reversed the faction page's panels in #2343 —
  // and it does not bring back what #2227 was right to retire: `-paper` is still
  // an ink here, never a second cream ground.
  badgeBoardStyle: {
    border: `2px solid ${EDGE}`,
    background: WALL,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: TYPE,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    // The WALKED pink, because this one carries a word. The pigment is 2.96:1
    // as type on the light wall; this rung is 6.67:1 / 7.41:1. The chip's own
    // hairline walks with its ink so the two read as one cut.
    color: NOTE_PINK,
    marginLeft: 'auto',
    border: `1px solid ${NOTE_PINK}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      // The clipping's own hairline, which flips with the board it is drawn on:
      // a 25% wash of the invariant xerox white is nothing at all on xerox stock.
      dividerColor="var(--faction-snide-note-rule)"
      nameStyle={{ fontFamily: MARKER, color: NOTE_INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            // An acid chip with press-ink glyph, and it stays that way through
            // #2631 for the reason the slip and the laurel do: the chip brings
            // its own stock, so 15.55:1 holds in both cascades whatever the
            // board behind it is. This kit inverts exactly here — the ransom
            // slip above and the faction page's `Mugshot` spotlight do the same.
            background: ACID,
            transform: 'skewX(-5deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: INK,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function SnideProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}
