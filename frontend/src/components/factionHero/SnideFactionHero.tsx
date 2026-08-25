import type { FactionHeroProps } from "../../pages/FactionDetail";
import { SnideSigil } from "../sigil/SnideSigil";
import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";

/**
 * S.N.I.D.E. faction-page hero — a flyposted wall (NOT a tidy poster): faint
 * pasted-flyer ghosts, halftone + grain, a torn acid strip, a slapped sigil
 * sticker, a skewed acid wordmark with a pink drop-shadow, the motto on a strip,
 * and — per the faction-page standardization — the acid stat chits stacked on
 * the SIDE of the sigil (stats live on the side of the hero, never a full-width
 * band). Ported from the SNIDE design kit (SnideHero); conforms to
 * {@link FactionHeroProps}.
 *
 * The page passes raw counts; the faction labels them in its own voice. Motto +
 * full name are faction constants (not backend fields).
 *
 * THE WALL IS `-wall`; `-ink` IS THE PRESS (#2343). This hero grounded on
 * `--faction-snide-ink` — theme-INVARIANT photocopier black — while calling it
 * "the wall" in its own comments, so the page's ground flipped to xerox stock by
 * day and the hero stayed a dark island on it. It stands on
 * `--faction-snide-wall` now, the token that FLIPS, which is the same move #2287
 * made for the field desk's credential panel. Everything READ on it therefore
 * takes the flipping `-note-*` inks rather than the `-card-*` ones, which are
 * pinned near-black-surface-bright in both themes for the slabs pasted ON a wall
 * (#2066): on the light wall `-card-text` reads 1.05:1 and `-card-muted` 1.24:1.
 * Acid cannot move — there is no rung below the wall's luminance — so acid AS
 * TYPE carries #2173's photocopier-black plate, which by day is a censor bar and
 * by night dissolves into the wall. That asymmetry is the ruling, not a bug.
 */

/** The ground, which FLIPS: xerox stock by day, pitch black by night. */
const WALL = "var(--faction-snide-wall)";
/** Type on that ground (16.03:1 light / 17.52:1 dark). */
const NOTE_INK = "var(--faction-snide-note-ink)";
/* The wall's quiet tier (6.75:1 / 12.38:1) stood here and has no site left on
   this hero: its one reader was the wordmark's expansion, which #2368 made a
   subhead in the full ink. The tier itself is untouched — the four panels below
   the hero still read it. */
/** The wall's own texture ink — the hue `.snide-backdrop` draws its raster with. */
const GRAIN = "var(--faction-snide-wall-text)";
const ACID = "var(--faction-snide-acid)";
/** The plate acid owes the wall (#2173). Invariant, so the bar dissolves at night. */
const PLATE = "var(--faction-snide-ink)";
/**
 * The CHROME hue, which flips #6fae00 -> #b6ff2e — a different token from `ACID`
 * and the medallion's only ink (#2368). It is legal on that disc precisely
 * because the disc is frozen on `PLATE` and BOTH of its ends were measured
 * there: 6.93:1 by day, 15.55:1 by night.
 */
const CHROME = "var(--snd-hero-fill, var(--faction-snide))";
/** The stock the disc gave up, kept as the raster that reads on it. Invariant. */
const STOCK = "var(--faction-snide-paper)";

const HERO_GHOSTS = [
  { w: 122, h: 152, top: -24, left: 54, rot: -12 },
  { w: 96, h: 128, top: 44, left: 232, rot: 7 },
  { w: 150, h: 92, top: 158, left: 430, rot: -5 },
  { w: 84, h: 116, top: 14, left: 690, rot: 11 },
  { w: 116, h: 150, top: 128, left: 858, rot: -8 },
];

const CHIT_ROT = [-3, 2.5, -2];

export default function SnideFactionHero({
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.snide.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];

  return (
    <header
      style={{
        ...factionRoleVars("snide", "snd-hero"),
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-xl)",
        background: WALL,
        color: NOTE_INK,
        // ornament (#1609): the flyposter's flat offset register — the print
        // metaphor, not elevation, so not `--color-cast-shadow`. The ink is
        // `--color-print-offset`; the 8/10px offset is the drawing and stays at
        // this call site. The 40% is not this mark's own — #2302 collapsed the
        // nine strengths onto one, and this mark used to print at 32%.
        boxShadow: "8px 10px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
        paddingBottom: "var(--space-xs)",
      }}
    >
      {/* THE DENSITY IS STILL THE DRAWING; THE HUE IS NOT (#2343). These were
          raw acid/pink alphas because "density is the drawing" — and the density
          still is, which is why every percentage below is unchanged and stays at
          this call site. What could not survive the ground moving is the HUE: an
          alpha drawn against photocopier black paints nothing at all on xerox
          stock (acid at 5.5% over the light wall is a 0.0006 luminance step,
          which would have left the hero the one flat rectangle on a textured
          page). `--faction-snide-wall-text` flips with the wall, so the raster
          reverses polarity with its ground — and it is the same ink, at the same
          kind of percentage, that `.snide-backdrop` draws its own dot field and
          two hatches with. */}
      <div
        className="ht-dots"
        style={{
          position: "absolute",
          inset: 0,
          color: `color-mix(in srgb, ${GRAIN} 5.5%, transparent)`,
          pointerEvents: "none",
        }}
      />
      {/* faint pasted flyers on the wall */}
      {HERO_GHOSTS.map((g, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: g.top,
            left: g.left,
            width: g.w,
            height: g.h,
            border: `1px solid color-mix(in srgb, ${GRAIN} 7%, transparent)`,
            background: `color-mix(in srgb, ${GRAIN} ${i % 2 ? "3.5%" : "2.5%"}, transparent)`,
            transform: `rotate(${g.rot}deg)`,
            pointerEvents: "none",
          }}
        />
      ))}
      {/* Torn acid strip — a DRAWN mark, which #2173 leaves alone: the ruling is
          about type. On the light wall it reads by CHROMA rather than by
          luminance (a saturated yellow-green against warm cream is 1.03:1 and
          still perfectly visible as a colour), and it carries no words, so it
          owes no ratio. */}
      <div
        style={{
          height: 6,
          background: ACID,
          position: "relative",
          zIndex: 2,
          clipPath:
            "polygon(0 0,100% 0,100% 55%,97% 100%,94% 50%,90% 100%,86% 55%,82% 100%,78% 60%,0 100%)",
        }}
      />

      {/* identity + side stat column — stats sit on the SIDE, never a band */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-2xl)",
          padding: "var(--space-xl) var(--space-3xl) var(--space-2xl)",
        }}
      >
        {/* identity — eyebrow + wordmark + motto + blurb.
            `min(300px, 100%)` rather than a bare 300: #1314 sent this hero to a
            phone for the first time, and at 375px the band's own
            `--space-3xl` gutters leave 263px of inner width, so a hard floor of
            300 pushed the column past the (clipped) edge. The `min()` is inert
            wherever there is room, so no desktop rendering moves. */}
        <div style={{ flex: 1, minWidth: "min(300px, 100%)" }}>
          {/* eyebrow, typed straight onto the wall (#1708 took the tape) */}
          <div
            style={{
              display: "inline-block",
              width: "fit-content",
              whiteSpace: "nowrap",
              // The strip carried this line's ink as well as its ground; the
              // padding and the paste-up shadow went with it (#1708), so the
              // eyebrow sets flush with the wordmark below. It typed in the
              // INVARIANT `-paper` until #2343, which was xerox-white on a wall
              // that had become xerox stock — 1.05:1. It is the wall's own ink
              // now, and flips with it.
              color: NOTE_INK,
              fontFamily: "var(--faction-snide-font-type)",
              fontSize: "var(--text-base)",
              letterSpacing: "0.05em",
              transform: "rotate(-1.5deg)",
            }}
          >
            {i18n.t("feed:factionHero.snide.eyebrow")}
          </div>
          {/* THE WORDMARK IS ACID, SO IT CARRIES THE PLATE (#2173, #2343). Acid
              on the light wall is 1.026:1 — the faction's own name, invisible —
              and there is no darker acid to reach for: the wall's luminance
              (0.8389) puts every AA-clearing ink below L 0.1475 and `-acid-deep`
              only reaches 2.30:1, under even the 3:1 a mark this size owes. So
              the GROUND moves, per §3, and on the light wall the black plate is
              the censor bar the ruling asked for; at night it dissolves into the
              wall and the mark is plain acid, exactly as it was.
              THE PLATE IS ON AN INLINE SPAN, NOT ON THE h1. An inline box's
              background covers the FONT's own ascent-to-descent, so it wraps the
              letters whatever the leading does; the h1's `lineHeight: 0.8` is a
              slammed line box the glyphs deliberately overflow, and a plate on
              the block would have clipped them top and bottom. Horizontal
              padding is the strike of the redaction and stays here. */}
          {/* THE WORDMARK AND ITS EXPANSION ARE ONE HEADING (#2368). `<hgroup>`
              is the platform's own device for a heading plus its subhead — the
              HTML spec defines it as exactly one h1-h6 with `<p>`s around it —
              so the relationship is in the markup rather than in a `<div>` that
              happens to sit underneath. The h1's own top margin collapses
              through this box, so nothing moves. */}
          <hgroup style={{ margin: 0 }}>
          <h1
            style={{
              fontFamily: "var(--faction-snide-font-impact)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: ransom wordmark — impact face skewed and slammed at 0.8 leading
              fontSize: 82,
              lineHeight: 0.8,
              letterSpacing: "0.02em",
              margin: "var(--space-lg) 0 0",
              textShadow: "4px 4px 0 var(--faction-snide-pink)",
              transform: "skewX(-5deg) rotate(-1.5deg)",
            }}
          >
            <span style={{ color: ACID, background: PLATE, padding: "0 var(--space-md)" }}>{name}</span>
          </h1>
          {/* THE EXPANSION IS A SUBHEAD, NOT A CAPTION (#2368).
              It was `var(--font-body)` — Courier Prime, the app's generic body
              face — at `--text-base` in the wall's QUIET tier, which is the
              recipe for a footnote, on a page where the faction owns five faces
              of its own. Three things move together, because a subhead is a
              STEP in a hierarchy and any one of them alone leaves it a caption:

              THE FACE is `-font-cond` (Bebas Neue). Of the five it is the one
              built for a letterspaced caps line under a wordmark — a condensed
              grotesque with no lowercase to lose — where `-font-type` (Special
              Elite) is already the eyebrow's typewriter, `-font-black` is the
              motto sticker's, `-font-impact` is the wordmark itself, and
              `-font-marker` is the scrawl. It is also the only one of the five
              that costs nothing: `--font-accent` is a SHELL face, already in the
              render-blocking sheet for every visitor, while the other four live
              in the deferred `fonts.faction.css` (#2079).

              THE TIER is the wall's full ink, the one the h1 register reads.
              15.95:1 by day, 17.52:1 by night — the same pairing SNIDE_WALL_PAIRS
              already measures; nothing is minted.

              THE SIZE is `--text-xl`, the top rung of the scale and the step the
              other uppercase heading register takes; `--text-base` was the
              eyebrow's rung, and a subhead cannot sit below the line above it. */}
          <p
            style={{
              fontFamily: "var(--faction-snide-font-cond)",
              fontSize: "var(--text-xl)",
              lineHeight: 1.05,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: NOTE_INK,
              // THE MARGIN CLEARS THE PLATE, NOT THE LETTERS (#2495). This was
              // `--space-md`, 12px, which is the gap you would set between a
              // wordmark and its subhead if the wordmark ended where its h1
              // does. It does not: the plate above is a background on an INLINE
              // span, and an inline box's background covers the FONT's content
              // area — ascent plus descent — which is the whole point of it
              // being inline (see the h1). Anton's is 1.5054em (hhea 2409/-674
              // over a 2048 upm), so at 82px the bar is 123.4px tall inside a
              // 65.6px line box and 28.9px of it hangs BELOW the h1: the
              // subhead's single 14px line sat entirely under the censor bar,
              // and in light its ink IS the bar (`-note-ink` and `-ink` are both
              // #14110b), so the line read 1.00:1 and only the tail past the
              // plate's right edge escaped. `--space-4xl` is the smallest rung
              // that clears the 28.9px overhang AND the further dip the h1's
              // `rotate(-1.5deg)` gives the plate's bottom-LEFT corner — up to
              // ~14px of (columnWidth / 2) x sin(1.5deg) on a full-width
              // desktop column, minus what the subhead's own `rotate(-0.4deg)`
              // takes back — while still leaving a visible gap rather than a
              // tangency. `--space-3xl` clears the flat overhang by 11px and the
              // rotated corner by ~1px, which is not a gap. The floor is
              // asserted in `snidePlateClearsTheSubhead.test.tsx` off the h1's
              // OWN font-size and leading, so moving the wordmark's size moves
              // the requirement with it.
              margin: "var(--space-4xl) 0 0",
              transform: "rotate(-0.4deg)",
            }}
          >
            {i18n.t("feed:identity.snide.fullName")}
          </p>
          </hgroup>
          {/* motto */}
          <div
            style={{
              display: "inline-block",
              marginTop: "var(--space-lg)",
              // A sticker, so it brings its own ground on any wall: ink on acid
              // is 15.55:1 in both cascades and never reads the page.
              background: ACID,
              color: PLATE,
              fontFamily: "var(--faction-snide-font-black)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: motto slapped on an acid sticker, rotated -2deg — illustration, not chrome
              fontSize: 15,
              letterSpacing: "0.02em",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of the motto on its acid sticker; rounding reflows the sticker.
              padding: "6px 15px",
              transform: "rotate(-2deg)",
              boxShadow: "2px 3px 0 var(--faction-snide-pink)",
            }}
          >
            {i18n.t("feed:factionHero.snide.motto")}
          </div>
        </div>

        {/* right: slapped sigil + acid stat chits stacked on the side */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "var(--space-md)",
            flexShrink: 0,
            width: 196,
          }}
        >
          {/* slapped sigil sticker, tilted */}
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: offset of the slapped sigil sticker; rounding reflows the tilted paste-up. */}
          <div style={{ position: "relative", transform: "rotate(9deg)", margin: "2px 10px 6px 0" }}>
            <div
              style={{
                position: "relative",
                width: 94,
                height: 94,
                borderRadius: "50%",
                // THE DISC IS BLACK IN BOTH CASCADES — THE OWNER'S RULING
                // (#2368), and it REVERSES the ground #2364 settled on eleven
                // days of history above. The stock was `--faction-snide-paper`,
                // and #2364 answered a mark that flipped on a frozen disc by
                // freezing the mark. The ruling answers it from the other end:
                // the disc is the press's own ink, invariant, and BOTH ends of
                // the chrome hue were measured on it — 6.93:1 at #6fae00,
                // 15.55:1 at #b6ff2e. Both clear AA, so the mark is allowed to
                // go on flipping and is deliberately NOT frozen here.
                background: PLATE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // THE RING IS RESOLVED, NOT LEFT BEHIND. The 2px rim and the 4px
                // ring under it were both `--faction-snide-ink` on a cream disc:
                // move the disc onto that ink and they are black on black. That
                // is not merely invisible, it is the medallion's only edge at
                // night — the disc is #14110b and the DARK wall is #0a0a0b, so
                // the sticker reads 1.05:1 against the wall it is slapped on. By
                // day the black disc is 15.95:1 on xerox stock and separates
                // itself; the rim carries the other cascade, in the chrome hue
                // its own mark takes (2.30:1 on the light wall by luminance,
                // where it reads by chroma as the torn strip does, and 16.33:1
                // on the dark one, where it is the whole edge).
                //
                // THE 4px RING IS GONE RATHER THAN RECOLOURED. Six pixels of
                // solid rim was the drawing of a BLACK ring on a PALE disc; six
                // pixels of chrome around a black one is a different object. The
                // 2px that is left is the same rim the stat chits directly below
                // wear, which is what makes the right-hand column one material.
                border: `2px solid ${CHROME}`,
                // What remains is the medallion's offset register (#1609), which
                // was always the second layer.
                boxShadow: "3px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
              }}
            >
              {/* The medallion's own raster. It does not flip and must not —
                  both the disc and this ink have exactly one value in both
                  cascades — but it INVERTS with the stock it is printed on
                  (#2368): photocopier ink at 6% on cream is nothing at all on a
                  black disc, so the raster is now the paper the face gave up, at
                  the same 6% and the same pitch. The density is the drawing and
                  stays at this call site; only the hue moved. */}
              <div
                className="ht-dots"
                style={{
                  position: "absolute",
                  inset: 0,
                  color: `color-mix(in srgb, ${STOCK} 6%, transparent)`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              {/* The mark, in the chrome hue the rim takes, for the reason the
                  disc states (#2368). A drawn mark owes 3:1 (WCAG 1.4.11), not
                  the text floor; this reads 6.93:1 by day and 15.55:1 by night,
                  which is why it is allowed to keep flipping. */}
              <SnideSigil size={54} color={CHROME} />
            </div>
          </div>

          {/* staggered acid stat chits — not a clean band */}
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                alignSelf: "stretch",
                textAlign: "right",
                // THE CHIT IS THE PLATE, WHICH IS WHY IT IS NO LONGER A WASH
                // (#2303, resolved by #2343). The bare 34% black wash that
                // stood here was class 7 of the legacy raw-colour list, parked as an
                // undecided HUE question — does the chit want a named wash rung
                // the way `-note-wash-acid`/`-pink` have one? The ground moving
                // answers it by dissolving it: the chit's numeral is ACID, and
                // acid owes a photocopier-black plate on a wall that flips
                // (#2173). A 34% black over xerox stock composites to mid-grey
                // and takes that numeral to 2.4:1; the opaque plate reads
                // 15.55:1 in both cascades, and by night it is within 1.05:1 of
                // the wash it replaces. So the chit takes the plate, and there
                // is no wash left to name.
                background: PLATE,
                color: ACID,
                border: `2px solid ${ACID}`,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of a rotated stat chit; rounding reflows the staggered stack.
                padding: "7px 14px 6px",
                transform: `rotate(${CHIT_ROT[i % CHIT_ROT.length]}deg)`,
                // The chit's offset register (#1609). The translucent black ground
                // above it is NOT this — it is a wash on the wall, still raw and
                // still on the legacy list.
                boxShadow: "2px 3px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-impact)",
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: chit numeral in the impact face; above the content floor already
                  fontSize: 30,
                  lineHeight: 0.85,
                  // The acid is INHERITED from the chit, which is the plate it
                  // owes — declaring it here would put an ink on this element
                  // and its ground on the parent, which is the exact shape a
                  // sweep for #2173 cannot see.
                  whiteSpace: "nowrap",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  // The CARD's tier is the right one HERE and only here on this
                  // hero: the chit is a slab, not the wall. 12.96:1 light /
                  // 11.85:1 dark on the plate.
                  color: "var(--snd-hero-quiet, var(--faction-snide-card-muted))",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
