/**
 * THE EPHEMERISTS — the v2 VALLEY PLATE vocabulary.
 *
 * Deco × Egypt: a papyrus field journal out of the Valley. The metaphor shipped
 * with the v2 task card (#1023) and grew to page size with task detail v2
 * (#1032); this module is the first time its ornament is shared rather than
 * copied, extracted for the praxis-detail skin (#1120).
 *
 * NOT the illuminated codex. `ephemeristsAtoms.tsx` used to sit beside this file
 * holding the OTHER Ephemerists vocabulary — the foxing, the wax seal, the
 * concordance — painted in the `--eph-*` family; #1208 swept the last surface
 * off it and deleted the module. This is now the faction's only vocabulary. The
 * plate is a full metaphor swap (ADR-0055) on `--faction-ephemerists-plate-*`,
 * and it must not be mixed with `--eph-*` on one surface: those tokens have no
 * dark override tuned for the plate's night-blue, and the plate's brass is a
 * rule colour that is never an ink.
 *
 * `EphemeristsTaskCard` and `EphemeristsTaskDetail` carried their own copies of
 * the glyph library, the cornice, the octagon and the tally — eleven local
 * redefinitions of things declared here, transcribed rather than imported, so
 * nothing failed when a mark was redrawn in one file and left standing in the
 * others. #1654 collapsed all eleven. There is no second declaration of any of
 * this vocabulary left in `src/`, and `ephemeristsPlateSurfaces.test.tsx` pins
 * that against the SOURCE tree, because an import-graph sweep cannot see a copy.
 *
 * Every colour is a `--faction-ephemerists-plate-*` token, never a ternary — but
 * do not expect a theme flip. This register is THEME-INVARIANT BY DESIGN (#1627
 * + #1636): every plate var is declared once at `:root`, and `[data-theme="dark"]`
 * declares no plate token at all. The dark block in `index.css` says so where
 * the night half used to be — the half was removed because "the register is
 * theme-invariant and lives entirely in `:root`", the polarity argument being
 * set out beside the `:root` declarations. The register IS the design's night
 * half, so these values already read on the dark page.
 */
import type { CSSProperties } from "react";

/* ── The plate's palette, under the names the skins read ── */

/** Poiret One — the v2 display face. NOT `--faction-ephemerists-card-font`
 *  (Cinzel), which is the CODEX's display token a dozen surfaces still read. */
export const DECO = "var(--font-faction-deco)";
/** Cinzel — incised small caps, the plate's whole label voice. */
export const CAPS = "var(--font-faction-engraved)";
/** Spectral — running prose. */
export const READING = "var(--font-faction-spectral)";
/** EB Garamond — marginalia: glosses, bylines, quiet asides. */
export const MARGINALIA = "var(--faction-ephemerists-body-font)";

export const PLATE = "var(--faction-ephemerists-plate-bg)";
export const PAGE = "var(--faction-ephemerists-plate-page)";
export const INNER = "var(--faction-ephemerists-plate-inner)";
export const INK = "var(--faction-ephemerists-plate-ink)";
/** Quiet ink — measured AA on the page, the plate AND the panel cells. */
export const QUIET = "var(--faction-ephemerists-plate-quiet)";
export const CAPTION = "var(--faction-ephemerists-plate-caption)";
/** A rule colour. Never an ink, never behind text. */
export const BRASS = "var(--faction-ephemerists-plate-brass)";
export const BRASS_LIGHT = "var(--faction-ephemerists-plate-brass-light)";
export const GOLD = "var(--faction-ephemerists-plate-gold)";
export const BAND = "var(--faction-ephemerists-plate-band)";
export const BAND_INK = "var(--faction-ephemerists-plate-band-ink)";
/** The masthead's second tier — a measured quiet ink ON THE BAND, not an alpha. */
export const BAND_QUIET = "var(--faction-ephemerists-plate-band-quiet)";
export const DISC = "var(--faction-ephemerists-plate-disc)";
export const OCHRE = "var(--faction-ephemerists-plate-ochre)";
/** The summons band and its ink — the plate's one filled call to action. */
export const CTA_BG = "var(--faction-ephemerists-plate-cta-bg)";
export const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";
export const NILE = "var(--faction-ephemerists-plate-nile)";
export const RULE = "var(--faction-ephemerists-plate-rule)";
export const LINE = "var(--faction-ephemerists-plate-line)";
export const SHADOW = "var(--faction-ephemerists-plate-shadow)";
export const WASH = "var(--faction-ephemerists-plate-wash)";
/**
 * The EPHEMERIS GRID (#1635) — the surveyor's graticule, as a `background-image`.
 * A published ground rather than a colour: any surface shipping ruled notepaper
 * takes this instead of re-typing the crossed gradients, and it carries no
 * opacity of its own, so the mount decides how far back it sits. Cards want the
 * `.eph-grid-ground` class in `index.css`, which lays it in an inert layer under
 * the card's content; this constant is for the surfaces that draw it themselves.
 */
export const GRID = "var(--faction-ephemerists-grid)";

/**
 * The glyph's own voice, over whatever label voice it sits in (#1637).
 *
 * Three of the four properties exist to UNDO the surrounding voice rather than
 * to dress the glyph:
 *  • `textTransform` — {@link SMALL_CAPS} uppercases the plate's whole label
 *    tier, and uppercasing a kanji costs a `text-transform` and buys nothing.
 *  • `fontStyle` — the score stamp's tally line is set in italic Spectral, and a
 *    CJK fallback face has no italic, so the browser synthesises a slant.
 *  • `fontSize` — the label tier is `--text-md` (11px, #1608). A Latin label is scanned
 *    at that size; 基 is eleven strokes and simply fills in. `--text-xl` is the
 *    smallest token inside the 13–16px band #1637 names as legible, so it is the
 *    DEFAULT rather than the only value — a caller with its own ramp (the
 *    masthead's two scales) passes `size` and keeps the three undos.
 * `letterSpacing` is the design's 0.06em.
 */
const GLYPH_VOICE: CSSProperties = {
  lineHeight: 1,
  letterSpacing: "0.06em",
  textTransform: "none",
  fontStyle: "normal",
};

/**
 * A label the reader decodes (#1637): the kanji is what shows, and the English
 * is one gesture away on `title`.
 *
 * ONE attribute carries the whole reveal — a pointer opens it as a tooltip and
 * assistive tech reads it out — which is the owner's ruling and not an
 * incidental choice: a visually-hidden twin would be a second copy of the same
 * fact, free to drift from the one on screen. The gloss handed in here is always
 * the very string another surface prints in English, so the two cannot disagree
 * about what the mark is called.
 *
 * `<abbr>` is the element for "short form, expansion available", and it is what
 * draws the native dotted underline — the only hint that there is anything to
 * look up. `tabIndex` is what makes FOCUS one of the gestures; without it the
 * glyph is pointer-only and the ruling's keyboard half is a word.
 *
 * `.eph-gloss` in index.css is #1637's own ponytail taken up now that the
 * component has a second consumer: a `:focus-visible` panel reading
 * `attr(title)`, because the native tooltip is a POINTER affordance and a
 * sighted keyboard user got nothing from it.
 *
 * The caller's `style` is overridden by the voice, not the other way round —
 * every consumer hands in a label style whose casing, slant and size are exactly
 * what the three undos exist to cancel.
 */
export function GlossedGlyph({ glyph, gloss, size, style }: {
  glyph: string
  gloss: string
  /** The glyph's own optical size. Defaults to the smallest legible rung. */
  size?: string
  style?: CSSProperties
}) {
  return (
    <abbr
      className="eph-gloss"
      title={gloss}
      tabIndex={0}
      style={{ ...style, ...GLYPH_VOICE, fontSize: size ?? "var(--text-xl)" }}
    >
      {glyph}
    </abbr>
  );
}

/**
 * The plate's STEPPED CORNER — top-left and bottom-right chamfered, so a cell
 * reads as cut from stone rather than rounded. The design draws it on the score
 * box (7), the ratio chip inside it (5), the byline cartouche (7) and the vote
 * plate (7); `step` is the chamfer's leg in px, which is ornament geometry.
 */
export function stepClip(step: number): string {
  return `polygon(${step}px 0, 100% 0, 100% calc(100% - ${step}px), calc(100% - ${step}px) 100%, 0 100%, 0 ${step}px)`;
}

/** Incised small caps — the plate's label voice, everywhere. */
export const SMALL_CAPS: CSSProperties = {
  fontFamily: CAPS,
  fontWeight: 500,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
};

/**
 * THE FIVE METALS, and everything three surfaces need to strike one (#1638).
 *
 * Classical alchemical sigils on the plate's 24-unit square — Saturn for lead,
 * Venus for copper, the crescent for silver, the sun for gold, and the
 * moon-and-Mercury compound for platinum. They lived in `EphemeristsVote` while
 * the ladder was their only reader; #1660 gave them two more (the voters panel
 * strikes one per vote, and the sign-up summons strikes platinum), which is the
 * threshold the kit exists for.
 *
 * `burstStep` is the DEGREE PITCH of the conic ring around a reached disc, and
 * it is the ladder's whole legibility: the ring densifies as the metal improves
 * (60° → 22.5°), so rank reads off the spoke count without a numeral. Geometry
 * rather than style, which is why it is a number here and arrives at CSS as a
 * custom property.
 *
 * Ordered exactly as `VOTE_REFRAMES.ephemerists.tiers`: index is `value - 1`.
 *
 * This block sits ABOVE {@link GLYPHS} only because that table files the
 * platinum sigil under a sign name, and a const may not read a const declared
 * below it.
 */
export const METAL_SIGILS = [
  {
    name: "lead",
    color: "var(--faction-ephemerists-metal-lead)",
    glyph: "M6.2 7.4 C7.4 4.6 10.2 4.8 10.2 7.8 C10.2 10.8 9 14.6 9.4 17.6 C9.8 20.4 11.8 21 13.8 19.4 M6.4 10.8 H13.4",
    weight: 1.5,
    burstStep: 60,
  },
  {
    name: "copper",
    color: "var(--faction-ephemerists-metal-copper)",
    glyph: "M12 4.4 a4.4 4.4 0 1 0 0.01 0 Z M12 13.2 V20.6 M8.8 17.4 H15.2",
    weight: 1.5,
    burstStep: 45,
  },
  {
    name: "silver",
    color: "var(--faction-ephemerists-metal-silver)",
    glyph: "M15.8 4.4 A8 8 0 1 0 15.8 19.6 A6.3 6.3 0 1 1 15.8 4.4 Z",
    weight: 1.3,
    burstStep: 36,
  },
  {
    name: "gold",
    color: "var(--faction-ephemerists-metal-gold)",
    glyph: "M12 5 a7 7 0 1 0 0.01 0 Z M12 10.4 a1.7 1.7 0 1 0 0.01 0 Z",
    weight: 1.5,
    burstStep: 30,
  },
  {
    name: "platinum",
    color: "var(--faction-ephemerists-metal-platinum)",
    glyph: "M10.6 5.2 A7 7 0 1 0 10.6 18.8 A5.5 5.5 0 1 1 10.6 5.2 Z M15.6 7.6 a4.4 4.4 0 1 0 0.01 0 Z M15.6 11.2 a0.9 0.9 0 1 0 0.01 0 Z",
    weight: 1.3,
    burstStep: 22.5,
  },
] as const;

/** The top of the ladder — the mark the summons is struck with (#1638). */
export const PLATINUM = METAL_SIGILS[4];

/**
 * The glyph library — Egyptian signs beside later-era marks, drawn as deco
 * geometry on a 24-unit square, stroke-only so they read as incised rather than
 * illustrated.
 *
 * The ONE home for the set since #1654. The task card and the task page each
 * carried a transcription of it, so a sign could be redrawn in one file and
 * left standing in two with nothing failing; both now read this table.
 */
export const GLYPHS: Record<string, string> = {
  ankh: "M12 22 V10 M6 15 H18 M12 10 a4 4 0 1 0 0.001 0 Z",
  eye: "M3 12 C7 7 17 7 21 12 C17 16 7 16 3 12 M12 10.2 a1.8 1.8 0 1 0 .01 0 Z M15 15 L18 20 M8 15 L5 19",
  feather: "M12 22 V4 M12 6 C15 7 17 10 17 13 M12 6 C9 7 7 10 7 13 M12 12 C14.6 12.8 16 14.6 16 17 M12 12 C9.4 12.8 8 14.6 8 17",
  water: "M2 9 l4 3 4-3 4 3 4-3 4 3 M2 15 l4 3 4-3 4 3 4-3 4 3",
  djed: "M12 22 V8 M6 8 H18 M6 12 H18 M7.5 4.6 H16.5 M9 2 H15",
  reed: "M12 22 V7 C12 4 14 2.6 17 2.6 C17 6 15 7.4 12 7.4",
  sun: "M12 12 a5 5 0 1 0 .01 0 Z M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21",
  offering: "M4 8 H20 M6 8 V14 H18 V8 M9 14 V20 M15 14 V20 M4 20 H20",
  scarab: "M12 4 C15.5 4 17.5 7 17.5 11 C17.5 16.6 15 20 12 20 C9 20 6.5 16.6 6.5 11 C6.5 7 8.5 4 12 4 M12 4 V20 M6.5 9 L2.5 6 M17.5 9 L21.5 6 M6.5 15 L2.5 18 M17.5 15 L21.5 18",
  greekKey: "M2 20 V6 H16 V16 H8 V11 H12", // meander — Greek, c. 700 BC
  chevrons: "M3 8 L12 3 L21 8 M3 14 L12 9 L21 14 M3 20 L12 15 L21 20", // deco, 1925
  alchemy: "M12 3 L21 19 H3 Z M6.6 13.6 H17.4", // alchemical fire — medieval
  hourglass: "M5 3 H19 M5 21 H19 M6.5 3 L12 12 L6.5 21 M17.5 3 L12 12 L17.5 21",
  openEye: "M2 12 C6 5.4 18 5.4 22 12 M2 12 C6 18.6 18 18.6 22 12 M8.4 12 a3.6 3.6 0 1 0 7.2 0 a3.6 3.6 0 1 0 -7.2 0 M10.7 12 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 M12 2.8 V5 M5 4.6 L6.8 6.6 M19 4.6 L17.2 6.6",
  planet: "M5.8 12 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0 M1.8 16.2 A10.8 3.7 -22 0 1 22.2 7.8 A10.8 3.7 -22 0 1 1.8 16.2", // Saturn
  /* The summons mark since #1638 — the ladder's top metal, filed here under a
     sign name rather than re-drawn, so `Sign name="platinum"` resolves on every
     surface and the mark the vote plate strikes and the mark the summons wears
     cannot drift apart. Both consumers already kept this entry privately. */
  platinum: PLATINUM.glyph,
};

/** The order the signs march in — the design's own register. */
export const REGISTER = [
  "ankh", "water", "feather", "eye", "djed", "greekKey", "reed", "offering",
  "alchemy", "chevrons", "scarab", "sun", "ankh", "water", "djed", "eye",
];

/** Distance between two signs in a register, and their drawn size. Geometry. */
const GLYPH_PITCH = 27.5;
const GLYPH_SIZE = 13;

/**
 * One incised sign, at its own strength and its own phase in the cycle.
 *
 * Exported for the ONE caller that composes its own register rather than taking
 * {@link GlyphRegister}: the task card's masthead marches two named 12-sign
 * rows at its own pitch, which is the card design's drawing and not the page's.
 * Everything else wants the register.
 */
export function Glyph({ name, x, y, strength, delay, color }: {
  name: string
  x: number
  y: number
  strength: number
  delay: number
  color?: string
}) {
  return (
    <g
      className="epg-glyph"
      transform={`translate(${x} ${y}) scale(${GLYPH_SIZE / 24}) translate(-12 -12)`}
      style={{ ["--epg-op"]: strength, ["--epg-delay"]: `${delay}s` } as CSSProperties}
    >
      <path
        d={GLYPHS[name]}
        fill="none"
        stroke={color ?? GOLD}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * A register of signs marching the full width of a band. The count follows the
 * viewBox rather than a fixed number, so the register reaches the edge at any
 * width instead of stopping short or blowing every sign up under `slice`.
 *
 * `color` defaults to the gold every masthead band strikes its register in.
 * {@link RuneRule} is the one caller that overrides it: a rune band rules a
 * PAGE rather than a night band, and gold on papyrus is a stain where brass is
 * a rule.
 */
export function GlyphRegister({ width, y, strength, keyPrefix, color }: {
  width: number
  y: number
  strength: number
  keyPrefix: string
  color?: string
}) {
  const count = Math.ceil(width / GLYPH_PITCH);
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Glyph
          key={`${keyPrefix}${index}`}
          name={REGISTER[index % REGISTER.length]}
          x={18 + index * GLYPH_PITCH}
          y={y}
          strength={strength * (index % 3 === 0 ? 1 : 0.7)}
          delay={((index * 7) % 12) * 1.6}
          color={color}
        />
      ))}
    </>
  );
}

/* ── The gravity field (#1830) ──
 *
 * Every number below is the design's own `ephGravity()`. They are ornament
 * geometry on an SVG canvas, not layout spacing (§4a).
 */
/** The leading of the unbent rows, at the top and bottom of the sheet. */
const GRAVITY_PITCH = 52;
/** Where the mass sits: `WELL_X` past the sheet's right edge, `WELL_Y` down. */
const WELL_X = 12;
const WELL_Y = 520;
/** How far the canvas overruns the sheet, so the well itself is drawn. */
const WELL_MARGIN = 40;
/** Strongest sag, at the well's own latitude, and the falloff either side. */
const PULL_MAX = 0.42;
const PULL_FALLOFF = 620;

/**
 * THE GRAVITY FIELD — the plate's ground, and NOT lined paper (#1830).
 *
 * The composer used to rule this sheet with a `repeating-linear-gradient` at
 * 25px, which is a notebook. The design replaced it with a field: fixed-pitch
 * brass rows bowed toward a well sitting just off the sheet's right edge, each
 * row sagging by its distance from the mass, plus three ochre rings marking
 * where the mass is. Its own comment is *"the plate's field, not lined paper"* —
 * the Ephemerists read the world, they do not take minutes on it. The curvature
 * is also doing a job: it is strongest in the open right-hand margin and
 * flattest where a field or a panel covers the ground, so what you see of the
 * field is exactly what the layout does not use.
 *
 * `width` is the sheet's nominal width — the well's position is measured from
 * its right edge. The canvas is anchored to that edge (`xMaxYMin slice`), so a
 * viewport wider than the nominal keeps the well where it belongs and scales
 * the rows up rather than stranding them mid-sheet.
 *
 * DEVIATION, named: the design's canvas stops at 1500px because its own preview
 * sheet does. A composer's sheet grows with what you write, and a field that
 * stops two thirds of the way down is worse than no field, so `height` runs to
 * the caller's number with the same formula on every row. Nothing else moves.
 */
export function GravityField({ width, height }: { width: number; height: number }) {
  const span = width + WELL_MARGIN;
  const rows = [];
  for (let y = -GRAVITY_PITCH; y < height; y += GRAVITY_PITCH) {
    const pull = PULL_MAX / (1 + Math.pow((y - WELL_Y) / PULL_FALLOFF, 2));
    const end = y + (WELL_Y - y) * pull;
    rows.push(
      <path
        key={y}
        d={`M-6 ${y} C ${width * 0.42} ${y} ${width * 0.66} ${end} ${span + 6} ${end}`}
        fill="none"
        stroke={BRASS}
        strokeWidth={0.8}
        opacity={0.1 + pull * 0.34}
      />,
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${span} ${height}`}
      preserveAspectRatio="xMaxYMin slice"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: -WELL_MARGIN,
        height,
        pointerEvents: "none",
      }}
    >
      {rows}
      <circle cx={width + WELL_X} cy={WELL_Y} r={4} fill={OCHRE} opacity={0.55} />
      <circle
        cx={width + WELL_X}
        cy={WELL_Y}
        r={26}
        fill="none"
        stroke={OCHRE}
        strokeWidth={0.7}
        opacity={0.28}
      />
      <circle
        cx={width + WELL_X}
        cy={WELL_Y}
        r={52}
        fill="none"
        stroke={OCHRE}
        strokeWidth={0.6}
        opacity={0.16}
      />
    </svg>
  );
}

/* `Wing` and `WingedDisc` stood here — the winged sun disc, the mark that headed
   every Ephemerists band and crowned the task detail's action panel.

   #1634 retired it: the engraved masthead carries the kite SIGIL, and the kit
   shows one mark rather than two. Its last caller was the feed row's band, which
   is the shape WORLD_ZERO_STYLE §6 names — a device is drawn once and consumed
   everywhere, so retiring it is one delete rather than five.

   `WingedDiscSign` below is NOT this mark scaled down and does not go with it:
   it is a separate drawing on the plate's 24-unit square, read by
   `EmblemOctagon` for the metatask seal's indigo disc (#1207). That surface is
   the seal epic's, not this one's. */

/**
 * The cavetto cornice: fluted strokes under a stepped double rule.
 *
 * `glow` washes a slow gold bloom along the band — the praxis record's one piece
 * of motion. The pigment, the cycle and the reduced-motion gate all live on
 * `.eph-cornice-glow` in index.css; this only reserves the layer.
 *
 * `flutes` is the number of strokes, and it is a PROP because the two designs
 * this cornice came out of drew different densities: the task-card design
 * (#1023) struck 40 across a 384px card and the task-details design (#1041)
 * struck 52 across the page. The flutes are `flex: 1`, so the count is the
 * fluting's pitch — 52 on a card would close it up. Neither number drifted from
 * the other; they were never the same drawing, and #1654 collapsed the two
 * transcriptions without picking a winner.
 */
export function Cornice({ glow, flutes = 52 }: { glow?: boolean; flutes?: number }) {
  return (
    // `overflow: hidden` is load-bearing when `glow` is on: the bloom drifts on
    // a translate, so an unclipped band would wash gold past the sheet's edges.
    <div
      aria-hidden="true"
      style={{ position: "relative", zIndex: 3, overflow: "hidden", background: BAND }}
    >
      {glow && <span className="eph-cornice-glow" />}
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between cornice flutes; rounding it to a rung reflows the fluting. */}
      <div style={{ position: "relative", display: "flex", height: 7, alignItems: "flex-end", gap: 3, padding: "0 var(--space-sm)", overflow: "hidden" }}>
        {Array.from({ length: flutes }).map((_, i) => (
          <span
            key={i}
            style={{ flex: 1, height: i % 2 ? 6 : 3.5, background: BRASS_LIGHT, opacity: i % 2 ? 0.5 : 0.28 }}
          />
        ))}
      </div>
      <div style={{ position: "relative", height: 2, background: BRASS, opacity: 0.9 }} />
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the gap in the cornice's stepped double rule. */}
      <div style={{ position: "relative", height: 1, marginTop: 2, background: BRASS_LIGHT, opacity: 0.55 }} />
    </div>
  );
}

/**
 * THE RUNE BAND — the divider under every section head (#1638).
 *
 * It replaces `FlutedRule`, which was the cavetto band reused as a rule: 48
 * brass strokes at alternating heights. The plate's own register of incised
 * signs takes its place, so a section is divided by the kit's SIGNS rather than
 * by a second drawing of its cornice — one ornament vocabulary reaching down
 * from the masthead instead of two doing the same job.
 *
 * The band SHIFTS on `.epg-glyph`, the register's shared opacity cycle, already
 * opt-in under `prefers-reduced-motion: no-preference`. Nothing here declares
 * motion, so a stilled reader gets the signs rather than a blank strip.
 *
 * NO `viewBox`, deliberately, and this is the whole reason the band fits every
 * column at one size. A viewBox plus `slice` scales by `max(w/vbW, h/vbH)`, and
 * the height here is fixed, so `h/vbH` is 1 and any column WIDER than the
 * viewBox blows every sign up — a 16px band of 32px glyphs on the 1200px task
 * page, which is precisely the failure `EphemeristsTaskDetail` documented when
 * it stopped using a fixed sign count. Without a viewBox, user units are CSS
 * pixels, the signs are drawn at their own size at every width, and the SVG
 * viewport crops the overspill for free. {@link RUNE_SPAN} is therefore a
 * CEILING — enough signs to reach the widest column the site has (the 1200px
 * page cap), not a count anyone reads.
 *
 * `rule` pairs the band with the brass hairline the write-up header carries
 * above it (`sectionHead` draws its own). A rune band mounted WITHOUT a heading
 * reads as a loose row of marks; the composer is the surface that does that, so
 * it asks for the rule and gets the same two-part divider the record has.
 */
const RUNE_SPAN = 1280;
const RUNE_HEIGHT = 16;

export function RuneRule({ rule }: { rule?: boolean }) {
  return (
    <div aria-hidden="true">
      {rule && <div style={{ height: 1, background: BRASS, opacity: 0.5 }} />}
      <svg width="100%" height={RUNE_HEIGHT} aria-hidden="true" style={{ display: "block" }}>
        <GlyphRegister
          width={RUNE_SPAN}
          y={RUNE_HEIGHT / 2}
          strength={0.42}
          keyPrefix="rune"
          color={BRASS}
        />
      </svg>
    </div>
  );
}

/**
 * The lotus — the plate's closing mark, drawn on its own 18×13 field. It sits
 * under the total's medallion (the octagon's base) and closes the vote section's
 * head; the design draws the same three strokes in both places.
 */
export function LotusSign({ width, color }: { width: number; color: string }) {
  return (
    <svg
      width={width}
      height={(width * 13) / 18}
      viewBox="0 0 18 13"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M9 13 V6 M9 6 C9 2.4 11.6 0.8 14.4 0.6 C14.4 4 12 6 9 6 M9 6 C9 2.4 6.4 0.8 3.6 0.6 C3.6 4 6 6 9 6"
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The winged sun disc at SIGN scale — redrawn on the plate's 24-unit square so
 * it can sit in a badge. Never a scaled-down copy of the masthead's disc: that
 * one was 176 units wide and would have come out a hairline at 24, so the wings
 * are cut to three stepped bars a side.
 *
 * Its one reader is the metatask seal's indigo disc (#1207), and that is why it
 * survived #1634's retirement of the full-size disc: the seal's mark is a
 * different drawing on a surface this issue does not own.
 */
export function WingedDiscSign({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      {[
        { x: 13.4, mirror: 8.0, y: 10.2, width: 2.6, height: 3.4, opacity: 0.95 },
        { x: 16.5, mirror: 4.9, y: 10.7, width: 2.6, height: 2.5, opacity: 0.77 },
        { x: 19.6, mirror: 1.8, y: 11.2, width: 2.6, height: 1.6, opacity: 0.59 },
      ].flatMap((bar, index) =>
        [bar.x, bar.mirror].map((x, side) => (
          <rect
            key={`${index}-${side}`}
            x={x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={0.7}
            fill={color}
            opacity={bar.opacity}
          />
        )),
      )}
      <circle cx={12} cy={12} r={3.4} fill="none" stroke={color} strokeWidth={1.4} />
      <circle cx={12} cy={12} r={1.6} fill={color} />
    </svg>
  );
}

/** One incised sign at label scale, set beside a line of type. */
export function Sign({ name, size, color, weight }: {
  name: string
  size: number
  color: string
  weight?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d={GLYPHS[name]}
        fill="none"
        stroke={color}
        strokeWidth={weight ?? 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The level, struck as TALLY MARKS — every fifth stroke in ochre. The design
 * draws it under the level numeral in the header and again at the end of every
 * roster row, which is what makes it kit rather than page furniture.
 */
export function Tally({ level }: { level: number }) {
  const strokes = Math.min(9, Math.max(1, Math.round(level)));
  return (
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the pitch of the tally strokes, drawn 1.6px wide.
    <span aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 11 }}>
      {Array.from({ length: strokes }).map((_, index) => (
        <span
          key={index}
          style={{
            width: 1.6,
            height: 11 - (index % 3) * 2,
            opacity: 0.85,
            background: index === 4 ? OCHRE : BRASS,
          }}
        />
      ))}
    </span>
  );
}

/** Initials for a player with no uploaded avatar. */
export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

/**
 * One player's monogram, struck in a stepped octagon cartouche — the design's
 * ONLY drawing of a person in a list. The roster row, the comment row and the
 * byline all take it, at three sizes, so the Ephemerists never show a circle
 * where the plate's geometry is a cut corner.
 *
 * `fontSize` is the monogram's optical size inside the cartouche: it scales with
 * the drawn octagon rather than with the type ramp, so it is geometry.
 */
export function AuthorOctagon({ name, size, fontSize }: {
  name: string
  size: number
  fontSize: number
}) {
  return (
    <span
      aria-hidden
      style={{ position: "relative", display: "block", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <Octagon inset={0} stroke={BRASS} width={2} fill={DISC} />
        <Octagon inset={7} stroke={BRASS_LIGHT} width={0.8} />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: CAPS,
          fontWeight: 500,
          // ornament: the monogram is sized from the octagon it is cut into, not
          // from the type ramp. A prop rather than a literal, so the rule never
          // fires here — the note is for the reader, not the linter.
          fontSize,
          letterSpacing: "0.08em",
          color: INK,
        }}
      >
        {initialsOf(name)}
      </span>
    </span>
  );
}

/**
 * The faction's emblem struck in a stepped octagon — the winged disc at sign
 * scale inside the same double-ruled cartouche {@link AuthorOctagon} cuts for a
 * person. It is what a faction-branded surface shows where the codex used to
 * press a wax seal: a roundel is the one shape this geometry never makes.
 */
export function EmblemOctagon({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      style={{ position: "relative", display: "block", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <Octagon inset={0} stroke={BRASS} width={2.4} fill={DISC} />
        <Octagon inset={8} stroke={BRASS_LIGHT} width={0.8} />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <WingedDiscSign size={size * 0.56} color={BRASS} />
      </span>
    </span>
  );
}

/**
 * THE COMPASS ROSE — the plate's points medallion (#2037, task cards v3).
 *
 * A brass-ruled disc with four needles on the cardinals, the north one struck
 * solid in the plate's gold and the other three left open in one ink at one
 * weight (#2067). It replaces the stepped octagon the score sat in: the plate is
 * a FIELD JOURNAL out of the Valley, and the instrument a surveyor's plate
 * reaches for is a rose.
 *
 * IT IS A SHARED MARK, and that is why `size` is a prop rather than a constant.
 * The octagon medallion it replaces is drawn identically on two surfaces — the
 * task card and the praxis card's score stamp — and the owner has ruled the two
 * unify, so #2042 mounts THIS from the stamp rather than transcribing it. The
 * module's standing rule applies (#1654): redraw the rose here and both
 * surfaces move; transcribe it and only one does, silently, forever.
 *
 * WHAT IT DOES NOT HOLD is the figure. `CovenCauldron` typesets its total
 * inside its own viewBox, and this deliberately does not: both mounts overlay
 * the score and its unit as HTML on the type ramp, and the Ephemerists label is
 * the one the script rotation (#2038) has to swap — a `<text>` node inside an
 * SVG would put that behind a pinned box it cannot measure. So this is the
 * PLATE only, positioned to fill its host box, with the figure laid over it.
 *
 * THE NEEDLES CLEAR THE FIGURE. North and south reach in to y=26 and y=74, east
 * and west to x=26 and x=74, so the inner disc (r=29) is the clear field and the
 * host has to be big enough that the figure fits inside 48 of the 100 units.
 * That is why the design grows the box to 128px where the octagon was 104.
 */
export function CompassRose({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <circle cx="50" cy="50" r="47" fill={DISC} stroke={BRASS} strokeWidth="1.6" />
      <circle cx="50" cy="50" r="41" fill="none" stroke={BRASS_LIGHT} strokeWidth="0.7" />
      {/* The ordinals, struck as ticks between the two rims rather than as
          needles — the design gives the quarter winds a mark, not a point. */}
      <g stroke={BRASS_LIGHT} strokeWidth="0.7" opacity="0.7">
        <path d="M16.8 16.8 L21 21" />
        <path d="M83.2 16.8 L79 21" />
        <path d="M16.8 83.2 L21 79" />
        <path d="M83.2 83.2 L79 79" />
      </g>
      {/* North alone is filled, which is how a rose says which way is up — and
          the other three are ONE ink at ONE weight, so the rose says it exactly
          once (#2067). It shipped saying it three ways: north in the register's
          teal, south in `-brass` at 0.9, east and west in `-brass-light` at 0.7.
          North is `-plate-gold` now, which is the ink the winged disc and the
          registers are drawn in and the brightest mark the plate has: 13.07:1 on
          the rose's own disc against the teal's 7.36:1, so the one point that
          carries meaning is also the one that reads first.

          A SECOND DESIGN FILE DRAWS THIS NEEDLE NAVY (`ephCompassBadge()`, as
          `var(--faction-ephemerists-plate-nile, #1e3a6e)`) and it is not the one
          to follow: that navy measures 1.64:1 on `-plate-disc` and the needle
          would be invisible. The two files disagree, the gold one is the one
          naming a variable, and the navy is most likely the eventual LIGHT-mode
          value being carried into that epic (#1627/#1636 keep this register
          theme-invariant until then). */}
      <path d="M50 8 L55.5 26 L44.5 26 Z" fill={GOLD} />
      <path d="M50 92 L55.5 74 L44.5 74 Z" fill="none" stroke={BRASS_LIGHT} strokeWidth="0.9" />
      <path d="M8 50 L26 44.5 L26 55.5 Z" fill="none" stroke={BRASS_LIGHT} strokeWidth="0.9" />
      <path d="M92 50 L74 44.5 L74 55.5 Z" fill="none" stroke={BRASS_LIGHT} strokeWidth="0.9" />
      {/* The card the figure is struck on. */}
      <circle cx="50" cy="50" r="29" fill={DISC} stroke={BRASS_LIGHT} strokeWidth="0.7" />
    </svg>
  );
}

/** A stepped octagon, inset from its box's edge. */
export function Octagon({ inset, stroke, width, fill }: {
  inset: number
  stroke: string
  width: number
  fill?: string
}) {
  return (
    <path
      d="M30 4 L70 4 L96 30 L96 70 L70 96 L30 96 L4 70 L4 30 Z"
      fill={fill ?? "none"}
      stroke={stroke}
      strokeWidth={width}
      transform={`translate(50,50) scale(${(100 - inset * 2) / 100}) translate(-50,-50)`}
    />
  );
}
