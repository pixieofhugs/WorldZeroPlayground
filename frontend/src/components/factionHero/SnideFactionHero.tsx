import { SnideSigil } from "../sigil/SnideSigil";
import i18n from "../../i18n";

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
/** The quiet tier on it (6.75:1 / 12.38:1). */
const NOTE_MUTED = "var(--faction-snide-note-muted)";
/** The wall's own texture ink — the hue `.snide-backdrop` draws its raster with. */
const GRAIN = "var(--faction-snide-wall-text)";
const ACID = "var(--faction-snide-acid)";
/** The plate acid owes the wall (#2173). Invariant, so the bar dissolves at night. */
const PLATE = "var(--faction-snide-ink)";

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
}: {
  name: string;
  members: number;
  tasks: number;
  praxes: number;
}) {
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.snide.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];

  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-xl)",
        background: WALL,
        color: NOTE_INK,
        // ornament (#1609): the flyposter's flat offset register — the print
        // metaphor, not elevation, so not `--color-cast-shadow`. The ink is
        // `--color-print-offset`; the 8/10px offset and the 32% are the drawing
        // and stay at this call site.
        boxShadow: "8px 10px 0 color-mix(in srgb, var(--color-print-offset) 32%, transparent)",
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
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              // `-card-muted` is the SLAB's quiet tier and reads 1.24:1 on the
              // light wall (#2173's other half). The wall's quiet tier flips.
              color: NOTE_MUTED,
              margin: "var(--space-md) 0 0",
              transform: "rotate(-0.4deg)",
            }}
          >
            {i18n.t("feed:identity.snide.fullName")}
          </div>
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
                background: "var(--faction-snide-paper)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // THE DISC IS FROZEN, SO ITS RIM AND ITS MARK ARE (#2364). This
                // rim and the sigil below both painted `--faction-snide` — the
                // CHROME hue, the one that flips #6fae00 -> #b6ff2e — on a disc
                // whose stock has exactly one value in both cascades (#2227
                // pinned it there, and six surfaces spend it as an ink). Acid on
                // cream measures 2.41:1 by day and **1.07:1** by night: the mark
                // was simply not there in dark. It is the mirror of #2173 above,
                // where the ink was frozen and the ground flipped, and #2173's
                // repair is the wrong tool for it — a plate would take the disc
                // away, and the disc is paper BY DESIGN, which is what makes the
                // medallion a slapped sticker rather than another censor bar.
                // So the mark moves instead, onto the press's own ink, which is
                // the same answer the three other S.N.I.D.E. surfaces drawing on
                // this exact stock already shipped (the faction page's inverted
                // monogram, the praxis-detail avatar tile, the profile laurel):
                // 16.68:1 in both cascades. Acid is not lost from the hero — it
                // is the wordmark, the motto sticker, the torn strip and all
                // three chits — and it cannot be lifted onto cream anyway, since
                // no acid rung is dark enough for this stock (#2133).
                border: "2px solid var(--faction-snide-ink)",
                // The second layer is the medallion's offset register (#1609);
                // the first is a solid ink rim, not a shadow.
                boxShadow:
                  "0 0 0 4px var(--faction-snide-ink), 3px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
              }}
            >
              {/* The medallion's own raster, and the LAST raw colour on this
                  file (#1853's list, class 2). It does not flip and must not:
                  the disc under it is `--faction-snide-paper`, which has one
                  value in both cascades, so photocopier ink at 6% is correct by
                  day and by night alike. The literal was still a literal,
                  though, and `color-mix(in srgb, <token> N%, transparent)` IS
                  that rgba to the byte — so the density stays here, the hue gets
                  its name, and the file comes off the list. */}
              <div
                className="ht-dots"
                style={{
                  position: "absolute",
                  inset: 0,
                  color: `color-mix(in srgb, ${PLATE} 6%, transparent)`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              {/* The mark itself, in the press's ink for the reason the rim
                  states (#2364). A drawn mark owes 3:1 (WCAG 1.4.11), not the
                  text floor; this reads 16.68:1 in both cascades. */}
              <SnideSigil size={54} color="var(--faction-snide-ink)" />
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
                  color: "var(--faction-snide-card-muted)",
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
