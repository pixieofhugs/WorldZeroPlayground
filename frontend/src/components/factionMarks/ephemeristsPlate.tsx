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
 * Every colour is a `--faction-ephemerists-plate-*` token, never a ternary — and
 * the register DOES flip. It used to say the opposite here: "THEME-INVARIANT BY
 * DESIGN (#1627 + #1636)", every plate var declared once at `:root` and
 * `[data-theme="dark"]` declaring "no plate token at all". That was true when it
 * was written and #2141 reversed it; the dark block declares FIFTEEN of them
 * today. The sheet is the vellum #eadcb6 by day and #171a26 by night, and the
 * inks flip with it. Corrected in #2323, because anyone trusting the old
 * sentence skips a dark measurement that matters — and skipping it is exactly
 * how the faction's directory tile spent this epic grounded on a band.
 *
 * FOUR ABSENCES FROM THE DARK BLOCK ARE STILL THE POINT and must not be
 * "completed": `-band` / `-band-ink` / `-band-quiet` are the compass blue and
 * its two inks, theme-invariant because the masthead is the faction rather than
 * a mode; `-plate-disc` is the dark chip the metals are struck on; `-brass-rule`
 * is one value across all three grounds by construction; and `-plate-gold` and
 * `-plate-wash` have no light value to differ from. The full reasoning is beside
 * both halves in `index.css`.
 */
import type { CSSProperties } from "react";
import { mediaUrl } from "../../utils/media";
import { useGroundIsBusy } from "../backdrop/BackdropContext";

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
/** Links and affirmations on the sheet — text, so it owes 4.5:1 and pays
 *  5.09:1 on the vellum / 9.68:1 on the night plate. This is what #2141 gave
 *  the sites that read the deleted NILE: a link is a WORD, and the rule brass
 *  below is 3.58:1 on the vellum, which is a line's floor and not a word's. */
export const BRASS_LIGHT = "var(--faction-ephemerists-plate-brass-light)";
/** THE RULE BRASS (#2141) — borders, ticks, hairlines, double rules, the vote
 *  plate's mount, idle disc rims. One value across all three grounds (3.73 on
 *  the compass blue, 3.58 on the vellum, 3.55 on the night plate), so a line
 *  crossing between them never changes colour. NEVER behind or as text. */
export const BRASS_RULE = "var(--faction-ephemerists-plate-brass-rule)";
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
 *
 * MODULE PRIVATE SINCE #2150, and the privacy is the fix rather than tidiness.
 * Every surface that called this directly also painted a `border` beside it, and
 * a border is shaved away by its own clip — four plates, four open corners. The
 * door out of this module is {@link chamferMount} + {@link chamferSheet}, and
 * neither can emit a border.
 */
function stepClip(step: number): string {
  return `polygon(${step}px 0, 100% 0, 100% calc(100% - ${step}px), calc(100% - ${step}px) 100%, 0 100%, 0 ${step}px)`;
}

/**
 * How far the sheet is laid inside the brass, in px. It is the RULE'S STROKE
 * WIDTH rather than spacing — the rule is what shows through the inset — which
 * is why it is a bare number and not a `--space-*` rung.
 */
const MOUNT_INSET = 1;

/**
 * The SHEET'S chamfer leg, for a sheet laid `inset` px inside a `step`-legged
 * mount (#1638, #2150). The one piece of arithmetic in the treatment below, and
 * the part a future edit gets wrong.
 *
 * An inset chamfer with an EQUAL leg puts the sheet's cut corner ON the mount's
 * and the frame opens at both corners — exactly the defect the clipped border
 * had. `stepClip(s)` cuts along `x + y = s`; the same clip on a box inset by `i`
 * cuts along `x + y = t + 2i` in the mount's own coordinates, and the two lines
 * are `|t + 2i − s| / √2` apart. Setting that equal to `i` — so the brass reads
 * the same width across the diagonal as it does down the straights — gives
 *
 *     t = s − i·(2 − √2)     ≈ s − 0.5858·i
 *
 * which is the figure the design's `chamferFrames()` pass arrived at
 * independently. `EphemeristsVote` shipped the rounded-down 6 against `stepClip(7)`
 * and its own comment names the cost: a 0.7px hairline where the straights draw
 * 1px. Computing it removes the reason to round, so the taper goes with it.
 */
export function chamferSheetLeg(step: number, inset: number = MOUNT_INSET): number {
  return step - inset * (2 - Math.SQRT2);
}

/**
 * THE FRAME, AS A GROUND RATHER THAN A BORDER (#1638, extracted by #2150).
 *
 * `stepClip` chamfers the top-left and bottom-right corners, and `clip-path`
 * cuts the element at its BORDER BOX — so a `border` is shaved away along both
 * diagonals and the plate ships with two open corners and a rule that stops
 * short. Every chamfered plate in this kit had that bug; the vote plate fixed it
 * once, in a comment, and this is that fix with a name.
 *
 * A chamfered plate is therefore TWO elements: a brass MOUNT and, one pixel
 * inside it, the SHEET carrying the panel's real ground. The clip then carries
 * the rule instead of shaving it, because the rule is the mount showing through.
 *
 *     <div style={chamferMount(7)}>
 *       <div style={{ ...chamferSheet(7, INNER), padding: "var(--space-sm)" }}>
 *
 * Both take the MOUNT's leg, so the two clips cannot drift apart. The mount is
 * the RULE brass since #2141's mark/rule split (#2142): a frame is a line, and
 * the mark brass is reserved for things that are read.
 *
 * NOTHING ABOUT THE PLATE'S SIZE MOVES. The mount's 1px padding is the border's
 * 1px, so the outer box and the content box are where they were.
 *
 * The `padding: 1` carried an `eslint-disable local/no-raw-style-values` at the
 * vote plate and carries none here — not because the value stopped being raw,
 * but because that rule's only visitor is `JSXAttribute` and this is a
 * `CSSProperties` factory. The justification stands on its own: the padding IS
 * the rule's stroke width, not spacing, and the smallest `--space-*` rung is 4px,
 * which would draw a four-pixel mount.
 */
export const chamferMount = (step: number): CSSProperties => ({
  background: BRASS_RULE,
  padding: MOUNT_INSET,
  clipPath: stepClip(step),
});

/** The sheet inside a {@link chamferMount}. `step` is the MOUNT's leg. */
export const chamferSheet = (step: number, ground: string): CSSProperties => ({
  background: ground,
  clipPath: stepClip(chamferSheetLeg(step)),
});

/**
 * A SEEDED GENERATOR — the faction's one source of random-looking ornament.
 *
 * Two devices draw an unpatterned row of mathematical marks: the masthead's
 * notation band (#2143) and the CTA's rune strips (#2146). Both need the same
 * two properties and neither may have `Math.random()` at render.
 *
 *  • **Unpatterned.** A row built from a coprime stride over the index reads as
 *    a machine counting, which is what the strips did before the owner asked
 *    for a seeded draw.
 *  • **Stable.** A row redrawn on every render twitches whenever anything
 *    unrelated moves on the page — a vote lands, a filter changes, a hover
 *    fires — and a screenshot of it never reproduces, which is exactly what
 *    this epic's visual QA needs. Seed from something stable about the SURFACE
 *    (`task:${id}`, `praxis:${id}`) and one seed draws one row forever.
 *
 * It lives in the kit rather than in either consumer because a second copy of a
 * PRNG is a copy that can be tuned in one file and not the other, and the drift
 * would be invisible: both rows would still look random. #2143 wrote it, #2146
 * moved it here on the second reader — the same threshold this module exists
 * for.
 *
 * FNV-1a over the seed's code units for the state, mulberry32 for the stream:
 * a hash, not a checksum, and a generator short enough to read in one sitting
 * with no dependency. Nothing here is cryptographic and nothing depends on the
 * distribution beyond "looks unpatterned at a few dozen draws".
 */
export function seededRandom(seed: string): () => number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  let a = hash >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
 * sun-and-moon compound for platinum. They lived in `EphemeristsVote` while
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
    // SATURN, REDRAWN (#2235). Saturn is the right metal for lead and was never
    // in question; the DRAWING was wrong. Rank 1 shipped as a single scythe
    // stroke with a bar through it, and it was reported from outside as reading
    // "a lowercase t" — a letter, not a sigil. This is the letterform Saturn
    // instead: a straight stem, a crossbar crossing it near the top, and a bowl
    // hanging off the stem to the right. Structure over flourish, because the
    // rung is struck as small as 15-16px on the voters panel and the summons.
    color: "var(--faction-ephemerists-metal-lead)",
    glyph: "M10.4 4.4 V19.6 M7 8.2 H13.8 M10.4 13 C11.2 10.4 16.8 10.6 16.4 14.2 C16.1 16.6 14.4 18 14.4 19.6",
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
    // THE HAND, REVERSED (#2235 reverses #2142). #2142 found this sigil drawn
    // mirrored (dotted sun on the RIGHT at x=15.6), checked it against a
    // reference, and pinned it here as sun-with-dot LEFT, crescent RIGHT.
    // THAT RULING IS WITHDRAWN. The classical platinum compound is
    // crescent-LEFT, its back against a sun-with-dot on the right, per the
    // reference image on #2235; the owner reversed her own call on the report.
    // The path below is #2142's geometry mirrored about x=12 — every x becomes
    // 24-x and both crescent sweep flags invert with it, which is why they read
    // 1 and 0 where they used to read 0 and 1. Do not "restore" #2142: it is
    // the earlier answer, not the current one.
    color: "var(--faction-ephemerists-metal-platinum)",
    glyph: "M7.2 7.2 A4.8 4.8 0 1 1 7.2 16.8 A6.5 6.5 0 0 0 7.2 7.2 Z M17.6 7.2 a4.8 4.8 0 1 0 0.01 0 Z M17.6 10.85 a1.15 1.15 0 1 0 0.01 0 Z",
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

/*
 * THE INCISED REGISTER IS GONE (#2210) — `REGISTER`, `Glyph` and `GlyphRegister`
 * were here, marching the astro/alchemical signs across a masthead band.
 *
 * #2143 gave the masthead the NOTATION BAND (mathematical marks, ruled top and
 * bottom) and retired none of this, so both vocabularies drew at once and
 * overlapped: the register rows were positioned to clear a datum row the band
 * had already replaced, and the band's lead had opened from 5px to 9px. The
 * owner's ruling is that the register retires ENTIRELY rather than moving out
 * of the way — the band is the faction's only ornament row, carried by the
 * masthead wherever there is one, and nothing takes its place on the surfaces
 * that head themselves by hand.
 *
 * {@link GLYPHS} above SURVIVES: the signs are still the kit's vocabulary for a
 * single mark, drawn one at a time by {@link Sign} and read directly by the task
 * card. What retired is the ROW, not the drawings.
 */

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
 * `width` is the sheet's NOMINAL width, and only that: it sets the viewBox span
 * and measures the well in from the canvas's right edge. It is not the width
 * the element renders at — `width: calc(100% + WELL_MARGIN)` takes that from
 * the container, so the canvas is anchored to the sheet's right edge
 * (`xMaxYMin slice`) and a sheet wider than the nominal keeps the well where it
 * belongs and scales the rows up rather than stranding them mid-sheet.
 *
 * THAT EXPLICIT WIDTH IS LOAD-BEARING (#2957), and it is one declaration you
 * cannot drop back to an offset pair. An `<svg>` is a REPLACED element, so
 * `width: auto` resolves to its INTRINSIC width — the viewBox span — rather
 * than from `left`/`right`, which are then over-constrained and `right` is
 * dropped. This element used to be laid out that way, and every consequence
 * above failed silently: measured in prod a 394-nominal field drew 434px wide
 * on a 624px card (0.696 of it, the rest bare ground), `slice` never scaled
 * anything because the element always matched its own viewBox, and on a card
 * narrower than the span the well was cropped off entirely.
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
        width: `calc(100% + ${WELL_MARGIN}px)`,
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

/**
 * How far down a card the field is drawn. Geometry, so a raw number (§4a).
 *
 * The rows are struck at absolute px — the field is the same drawing on a card
 * as on the composer's sheet, not a scaled copy — so the mount has to say how
 * much sheet there is, and a card's height is its content's. Twenty rows covers
 * every card the kit renders, and the frame's own `overflow: hidden` crops the
 * rest; the alternative, a field that stops two thirds of the way down, is what
 * `GravityField`'s own note calls worse than no field.
 *
 * ponytail: the ceiling is a card taller than this — a praxis entry with a long
 * body and a media well could reach it, and the field would stop short rather
 * than misdraw. The upgrade path is a measured height (`ResizeObserver` on the
 * frame) or a viewBox in percentage units; neither is worth a hook for an
 * ornament nobody can see the bottom of.
 */
const CARD_FIELD_HEIGHT = 1040;

/**
 * THE CARD'S GRAVITY FIELD — the kit's ornament, and the alternation (#2398).
 *
 * The law (#2195, owner 2026-08-17): a card on an ornamented ground drops its
 * background texture; a card on a plain ground wears its faction's ornament.
 * The Ephemerists' ornament is {@link GravityField}, and this is the whole of
 * the branch for both cards — one mount, so the two cannot drift and there is
 * one place to invert if the law changes.
 *
 * It is the SAME DRAWING the composer strikes, not a card-sized second copy
 * (§6): only the mount differs, and it differs in two ways the composer's sheet
 * does not need.
 *
 * • `z-index: 1` — a GROUND, above the plate's own fill and below every piece of
 *   chrome. Both frames stack their band at 2 and their cornice at 3, so this
 *   number is read against those and not chosen freely.
 * • the weight. The rows are struck at the design's own opacity on a page-sized
 *   sheet; a card's ground sits behind 12px reading copy, which is the same
 *   reason the chart net has three weights and takes the lowest on a card
 *   (#2144). 0.62 lands the strongest row at ~0.15, a shade over the net's 0.10.
 *
 * `width` is the card's NOMINAL width: the well is measured in from the right
 * edge and the canvas is anchored there, so a wider card scales the rows up
 * rather than stranding the well mid-sheet.
 */
export function CardGravityField({ width }: { width: number }) {
  const groundIsBusy = useGroundIsBusy();
  if (groundIsBusy) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        opacity: 0.62,
      }}
    >
      <GravityField width={width} height={CARD_FIELD_HEIGHT} />
    </div>
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

/*
 * THE RUNE BAND IS GONE (#2210) — `RUNE_SPAN`, `RUNE_HEIGHT` and `RuneRule`
 * stood here. It was the divider under every section head, and it drew exactly
 * one thing: a `GlyphRegister` in brass. With the register retired the band had
 * nothing left to draw, so it goes with it rather than staying as an empty box.
 *
 * Its seven mounts lose a row of marks and no structure: every section head
 * that carried it already rules itself off with the brass hairline that flexes
 * across the heading row, and the composer — the one mount with no heading —
 * keeps that hairline through the shared `ComposerRule`.
 */

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
 * The INNER (`inset={7}`) octagon of the cartouche below, restated in percent so
 * a portrait can be clipped to it: {@link Octagon}'s path over a 100-unit box,
 * scaled 0.86 about the centre — p' = 50 + 0.86 × (p − 50). Geometry, not dress.
 *
 * Clipping to the inner rule and not the outer one is what leaves the brass ring
 * whole: the photo stops inside the cartouche instead of painting over its own
 * frame. `EphemeristsPraxisDetail` cut the same polygon locally until #2228
 * needed it a second time — and a restated derivation of a kit path is the exact
 * duplication #1654 swept out of this vocabulary, so it lives here now.
 */
export const OCTAGON_CLIP =
  "polygon(32.8% 10.44%, 67.2% 10.44%, 89.56% 32.8%, 89.56% 67.2%, 67.2% 89.56%, 32.8% 89.56%, 10.44% 67.2%, 10.44% 32.8%)";

/**
 * One player's portrait — or, failing that, their monogram — struck in a stepped
 * octagon cartouche. The design's ONLY drawing of a person in a list: the roster
 * row, the comment row and the byline all take it, at three sizes, so the
 * Ephemerists never show a circle where the plate's geometry is a cut corner.
 *
 * `avatarUrl` is the character's `avatar_url`, which is `''` and never null when
 * nothing has been uploaded — so the empty string IS the fallback signal. The
 * monogram was ALL this drew until #2228: the faction page passed a name and
 * nothing else, which is not a fallback misfiring but a surface with no image
 * path to fall back from, and a photographed keeper rendered as two letters.
 *
 * The photo replaces the cartouche's inner content and nothing else — it is
 * clipped to {@link OCTAGON_CLIP} and laid over the disc, so the brass ring and
 * the inner rule are the same two strokes either way.
 *
 * `fontSize` is the monogram's optical size inside the cartouche: it scales with
 * the drawn octagon rather than with the type ramp, so it is geometry.
 */
export function AuthorOctagon({ name, size, fontSize, avatarUrl }: {
  name: string
  size: number
  fontSize: number
  avatarUrl?: string
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
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            clipPath: OCTAGON_CLIP,
          }}
        />
      ) : (
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
      )}
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
 * THE LIMB'S GRADUATION (#2145) — 48 ticks at 7.5°, long every sixth, i.e. one
 * long tick on each 45°. It is what turns an ornament into an instrument, and
 * it is the detail that earns the faction its name.
 *
 * Built once at module load rather than mapped per render: the geometry is a
 * constant, the mark is drawn on two surfaces, and forty `<path>` nodes is a
 * silly amount of markup for a figure that never moves. Two `d` strings, two
 * weights.
 */
const TICK_STEP_DEG = 7.5;
const TICK_OUTER = 47.2;
/** Where a long tick starts — ON the inner rim — and where a short one does. */
const TICK_LONG_INNER = 43;
const TICK_SHORT_INNER = 45.4;
/**
 * The inner rim, moved r41 -> r43 by #2145. The north needle's tip is r42
 * (`M50 8` on a 100-unit box), so at r41 the rim ran straight through it.
 */
const INNER_RIM = 43;

function limb(long: boolean): string {
  const marks: string[] = [];
  const inner = long ? TICK_LONG_INNER : TICK_SHORT_INNER;
  for (let i = 0; i < 360 / TICK_STEP_DEG; i += 1) {
    if ((i % 6 === 0) !== long) continue;
    const radians = (i * TICK_STEP_DEG * Math.PI) / 180;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const at = (r: number) =>
      `${(50 + r * sin).toFixed(2)} ${(50 - r * cos).toFixed(2)}`;
    marks.push(`M${at(inner)}L${at(TICK_OUTER)}`);
  }
  return marks.join(" ");
}

const LONG_TICKS = limb(true);
const SHORT_TICKS = limb(false);

/**
 * Below this the short ticks are not drawn at all (#2145). At the praxis card's
 * 84px each of the forty renders about 0.4px wide and the browser resolves the
 * limb into a grey wash; the eight long ones survive and still read as
 * graduated. Above it — the task card's 128px plate, and the phone's 112px —
 * the full 48 come back.
 */
const FULL_LIMB_MIN_PX = 100;

/**
 * THE COMPASS ROSE — the plate's points medallion (#2037, task cards v3).
 *
 * A brass-ruled disc with a graduated limb and four needles on the cardinals,
 * the north one struck solid in the faction's mark and the other three left
 * open in one ink at one weight (#2067). It replaces the stepped octagon the
 * score sat in: the plate is a FIELD JOURNAL out of the Valley, and the
 * instrument a surveyor's plate reaches for is a rose.
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
 *
 * EVERY LINE ON IT IS `-plate-brass-rule` NOW (#2145, #2141), and that is a
 * contrast fix as much as a repaint. The disc is `-plate-disc` #12151f in BOTH
 * cascades and `-brass-light` FLIPS (#6f5620 by day, #e6c877 by night), so the
 * rims and the three open needles read 2.63:1 in light and ~11:1 in dark — the
 * theme-invariant-ground-with-a-flipping-ink shape this repo has shipped once
 * before and caught an hour later. The rule brass does not flip: 3.73:1 on the
 * compass blue, in both, clear of the 3:1 a non-text mark owes. The outer rim
 * keeps `-brass`, which is the same #8a6d2c by day and brighter by night.
 *
 * NORTH IS `-plate-band-ink` (#2145). It was `-plate-gold`, which reads 13.07:1
 * on the disc and was never the problem; the faction's mark is brass now
 * (#2140), and gold on the one drawing that carries the total would have been
 * the last place the old identity survived. 7.59:1, in both cascades.
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
      <circle cx="50" cy="50" r={INNER_RIM} fill="none" stroke={BRASS_RULE} strokeWidth="0.7" />
      {/* The graduated limb. The FOUR ORDINAL TICKS STOOD HERE and are retired
          rather than kept: every 45° is already a long tick, so the old
          diagonal marks were the same statement twice. */}
      <path d={LONG_TICKS} stroke={BRASS_RULE} strokeWidth="0.9" fill="none" />
      {size >= FULL_LIMB_MIN_PX && (
        <path d={SHORT_TICKS} stroke={BRASS_RULE} strokeWidth="0.6" fill="none" />
      )}
      {/* North alone is filled, which is how a rose says which way is up — and
          the other three are ONE ink at ONE weight, so the rose says it exactly
          once (#2067). It shipped saying it three ways: north in the register's
          teal, south in `-brass` at 0.9, east and west in `-brass-light` at 0.7.

          A SECOND DESIGN FILE DREW THIS NEEDLE NAVY (`ephCompassBadge()`, as
          the register's aqua with a `#1e3a6e` fallback) and it was never the one
          to follow: that navy measures 1.64:1 on `-plate-disc` and the needle
          would be invisible. #2141 settled it by deleting the aqua outright.
          The design fills all four needles in gold with north one unit longer,
          which is not a difference anyone can see at 84px and which stops the
          needle leading — #2067's ruling stands and #2145 restates it. */}
      <path d="M50 8 L55.5 26 L44.5 26 Z" fill={BAND_INK} />
      <path d="M50 92 L55.5 74 L44.5 74 Z" fill="none" stroke={BRASS_RULE} strokeWidth="0.9" />
      <path d="M8 50 L26 44.5 L26 55.5 Z" fill="none" stroke={BRASS_RULE} strokeWidth="0.9" />
      <path d="M92 50 L74 44.5 L74 55.5 Z" fill="none" stroke={BRASS_RULE} strokeWidth="0.9" />
      {/* The card the figure is struck on. */}
      <circle cx="50" cy="50" r="29" fill={DISC} stroke={BRASS_RULE} strokeWidth="0.7" />
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
