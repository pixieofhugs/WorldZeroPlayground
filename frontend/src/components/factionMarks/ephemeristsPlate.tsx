/**
 * THE EPHEMERISTS — the v2 VALLEY PLATE vocabulary (Deco × Egypt field journal).
 *
 * The faction's only vocabulary: a full metaphor swap (ADR-0055) on
 * `--faction-ephemerists-plate-*`. Never mix with `--eph-*` on one surface: those
 * have no dark override tuned for the plate, and the plate's brass is a rule colour,
 * never an ink. No second declaration of any of this may exist in `src/`
 * (`ephemeristsPlateSurfaces.test.tsx` pins it against the source tree).
 *
 * Every colour is a token, never a ternary, and the register DOES flip in dark
 * (vellum #eadcb6 by day, #171a26 by night) — measure dark too. Absences from the
 * dark block are deliberate, don't "complete" them: `-band*` (the masthead is the
 * faction, not a mode), `-plate-disc`, `-brass-rule` (one value on all grounds),
 * `-plate-gold`/`-plate-wash`. Reasoning beside both halves in `index.css`.
 */
import type { CSSProperties } from "react";
import { mediaUrl } from "../../utils/media";
import { useGroundIsBusy } from "../backdrop/BackdropContext";

/* ── The plate's palette ── */

/** Cinzel title face, via the shared engraved token (not the codex's card font). */
export const DECO = "var(--font-faction-engraved)";
/** Cinzel — incised small caps, the plate's whole label voice. */
export const CAPS = "var(--font-faction-engraved)";
/** Poiret One — running prose. */
export const READING = "var(--font-faction-deco)";
/** Poiret One — marginalia: glosses, bylines, quiet asides. */
export const MARGINALIA = "var(--font-faction-deco)";

export const PLATE = "var(--faction-ephemerists-plate-bg)";
export const PAGE = "var(--faction-ephemerists-plate-page)";
export const INNER = "var(--faction-ephemerists-plate-inner)";
export const INK = "var(--faction-ephemerists-plate-ink)";
/** Quiet ink — measured AA on the page, the plate and the panel cells. */
export const QUIET = "var(--faction-ephemerists-plate-quiet)";
export const CAPTION = "var(--faction-ephemerists-plate-caption)";
/** A rule colour. Never an ink, never behind text. */
export const BRASS = "var(--faction-ephemerists-plate-brass)";
/** Links/affirmations — text, so 4.5:1 (5.09 vellum / 9.68 night). The rule brass
 *  below is only 3.58:1 on vellum: a line's floor, not a word's. */
export const BRASS_LIGHT = "var(--faction-ephemerists-plate-brass-light)";
/** Rule brass — borders, ticks, hairlines, mounts. One value on all three grounds
 *  (3.73 blue / 3.58 vellum / 3.55 night) so a crossing line never changes colour.
 *  NEVER behind or as text. */
export const BRASS_RULE = "var(--faction-ephemerists-plate-brass-rule)";
export const GOLD = "var(--faction-ephemerists-plate-gold)";
export const BAND = "var(--faction-ephemerists-plate-band)";
export const BAND_INK = "var(--faction-ephemerists-plate-band-ink)";
/** The masthead's second tier — a measured quiet ink ON THE BAND, not an alpha. */
export const BAND_QUIET = "var(--faction-ephemerists-plate-band-quiet)";
export const DISC = "var(--faction-ephemerists-plate-disc)";
export const OCHRE = "var(--faction-ephemerists-plate-ochre)";
/** The summons band's ink — the plate's one filled call to action. */
export const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";
export const RULE = "var(--faction-ephemerists-plate-rule)";
export const LINE = "var(--faction-ephemerists-plate-line)";
export const SHADOW = "var(--faction-ephemerists-plate-shadow)";
export const WASH = "var(--faction-ephemerists-plate-wash)";
/**
 * The ephemeris grid (#1635), as a `background-image`; carries no opacity, so the
 * mount decides. Cards use `.eph-grid-ground` in `index.css` instead.
 */
export const GRID = "var(--faction-ephemerists-grid)";

/**
 * The stepped corner: top-left and bottom-right chamfered; `step` is the leg in px.
 *
 * Module-private on purpose (#2150): callers painted a `border` beside it, and the
 * clip shaves a border away. Use {@link chamferMount} + {@link chamferSheet}.
 */
function stepClip(step: number): string {
  return `polygon(${step}px 0, 100% 0, 100% calc(100% - ${step}px), calc(100% - ${step}px) 100%, 0 100%, 0 ${step}px)`;
}

/** Sheet inset inside the brass, in px — the rule's stroke width, not spacing. */
const MOUNT_INSET = 1;

/**
 * The sheet's chamfer leg for a sheet `inset` px inside a `step`-legged mount.
 *
 * An equal leg opens the frame at both corners. Matching the diagonal's brass width
 * to the straights' gives t = s − i·(2 − √2) ≈ s − 0.5858·i (the design's
 * `chamferFrames()` figure). Don't round it: rounding draws a thinner diagonal.
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
 * Seeded PRNG for unpatterned ornament rows (notation band #2143, rune strips #2146).
 * Never `Math.random()` at render: rows would twitch on unrelated re-renders and
 * screenshots wouldn't reproduce. Seed from something stable (`task:${id}`).
 * One copy only, so it can't be tuned in one consumer and not the other.
 * FNV-1a seed hash + mulberry32 stream; not cryptographic.
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
 * The five metals (#1638): alchemical sigils on the 24-unit square — Saturn/lead,
 * Venus/copper, crescent/silver, sun/gold, sun-and-moon/platinum.
 *
 * `burstStep` is the conic ring's degree pitch: it densifies with rank (60° → 22.5°)
 * so rank reads off spoke count. Arrives at CSS as a custom property.
 *
 * Ordered as `VOTE_REFRAMES.ephemerists.tiers`: index is `value - 1`. Sits above
 * {@link GLYPHS} because that table reads the platinum entry.
 */
export const METAL_SIGILS = [
  {
    name: "lead",
    // Saturn as a letterform (#2235): stem, crossbar near the top, bowl right. The
    // old scythe read as "a lowercase t". Kept structural: struck at 15-16px.
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
    // Crescent LEFT, sun-with-dot RIGHT (#2235, owner ruling, reversing #2142).
    // Do not "restore" the mirrored #2142 drawing.
    color: "var(--faction-ephemerists-metal-platinum)",
    glyph: "M7.2 7.2 A4.8 4.8 0 1 1 7.2 16.8 A6.5 6.5 0 0 0 7.2 7.2 Z M17.6 7.2 a4.8 4.8 0 1 0 0.01 0 Z M17.6 10.85 a1.15 1.15 0 1 0 0.01 0 Z",
    weight: 1.3,
    burstStep: 22.5,
  },
] as const;

/** The top of the ladder — the mark the summons is struck with (#1638). */
export const PLATINUM = METAL_SIGILS[4];

/**
 * The glyph library: Egyptian and later-era signs as stroke-only deco geometry on a
 * 24-unit square. The one home for the set (#1654).
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
  /* The summons mark: the top metal, filed under a sign name so `Sign name="platinum"`
     and the vote plate can't drift apart. */
  platinum: PLATINUM.glyph,
};

/* ── The gravity field (#1830): numbers are the design's `ephGravity()`, ornament
 *    geometry rather than layout spacing (§4a). ── */
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
 * The gravity field — the plate's ground, NOT lined paper (#1830): brass rows bowed
 * toward a well just off the sheet's right edge, plus three ochre rings. Curvature is
 * strongest in the open right margin, flattest under content.
 *
 * `width` is the NOMINAL width (viewBox span; well measured from the right edge).
 * The explicit `width: calc(100% + WELL_MARGIN)` is load-bearing (#2957): an `<svg>`
 * is replaced, so `left`/`right` alone resolve to the viewBox width, and `slice`
 * then never scales and narrow cards crop the well.
 *
 * Deviation: `height` runs to the caller's number (the design stopped at 1500px).
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
 * How far down a card the field is drawn (geometry, §4a). Rows are absolute px, so
 * the mount must say how much sheet there is; the frame's `overflow: hidden` crops.
 *
 * ponytail: a card taller than this gets a field that stops short. Upgrade: a
 * measured height (`ResizeObserver`) or a percentage viewBox.
 */
const CARD_FIELD_HEIGHT = 1040;

/**
 * The card's gravity field (#2398). The law (#2195): a card on an ornamented ground
 * drops its texture; on a plain ground it wears its faction's ornament. One mount
 * for both cards, so there is one place to invert.
 *
 * Same drawing as the composer's. `z-index: 1` sits under the frames' band (2) and
 * cornice (3). Opacity 0.62 puts the strongest row at ~0.15 behind 12px copy
 * (cf. the chart net's 0.10, #2144).
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

/**
 * The cavetto cornice: fluted strokes under a stepped double rule.
 *
 * `glow` reserves the layer for `.eph-cornice-glow` (pigment, cycle and
 * reduced-motion gate live in index.css). `flutes` is a prop because the card
 * design struck 40 and the detail design 52; flutes are `flex: 1`, so the count is
 * the pitch.
 */
export function Cornice({ glow, flutes = 52 }: { glow?: boolean; flutes?: number }) {
  return (
    // `overflow: hidden` clips the glow's translating bloom to the sheet.
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

/** The lotus — the plate's closing mark, on an 18×13 field. */
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
 * The winged sun disc redrawn at sign scale on the 24-unit square (wings cut to
 * three bars a side). Read by the metatask seal's disc (#1207).
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

/** The level as tally marks, every fifth stroke in ochre. */
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
 * The inner (`inset={7}`) octagon of {@link Octagon} in percent, for clipping a
 * portrait: p' = 50 + 0.86 × (p − 50). Clipping to the inner rule keeps the brass
 * ring whole.
 */
export const OCTAGON_CLIP =
  "polygon(32.8% 10.44%, 67.2% 10.44%, 89.56% 32.8%, 89.56% 67.2%, 67.2% 89.56%, 32.8% 89.56%, 10.44% 67.2%, 10.44% 32.8%)";

/**
 * A player's portrait, or monogram, in a stepped octagon cartouche — the plate never
 * draws a circle for a person.
 *
 * `avatarUrl` is `''` (never null) when nothing is uploaded, so empty IS the
 * fallback. The photo is clipped to {@link OCTAGON_CLIP} over the disc; the rings
 * stay. `fontSize` scales with the octagon, not the type ramp.
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
            // ornament: sized from the octagon, not the type ramp.
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

/** The faction's emblem (winged disc) in the same double-ruled octagon cartouche. */
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
 * The limb's graduation (#2145): 48 ticks at 7.5°, a long one every 45°. Built once
 * at module load — the geometry never moves.
 */
const TICK_STEP_DEG = 7.5;
const TICK_OUTER = 47.2;
/** Where a long tick starts — ON the inner rim — and where a short one does. */
const TICK_LONG_INNER = 43;
const TICK_SHORT_INNER = 45.4;
/** The inner rim (#2145): the north needle's tip is r42, so r41 would cut it. */
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
 * Below this the short ticks aren't drawn (#2145): at 84px they're ~0.4px and blur
 * into a grey wash; the long ones still read as graduated.
 */
const FULL_LIMB_MIN_PX = 100;

/**
 * The compass rose — the plate's points medallion (#2037).
 *
 * Shared by the task card and the praxis score stamp (#2042), so `size` is a prop:
 * redraw it here and both move (#1654).
 *
 * It holds no figure: mounts overlay score + unit as HTML, because the label is
 * swapped by the script rotation (#2038), which can't measure SVG `<text>`. Needles
 * stop at 26/74, leaving the inner disc (r=29) clear — hence the 128px host.
 *
 * Lines are `-plate-brass-rule` (#2145): the disc is theme-invariant but
 * `-brass-light` flips, which read 2.63:1 by day. Rule brass is 3.73:1 in both.
 * North is `-plate-band-ink` (7.59:1), not gold — the faction mark is brass (#2140).
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
      {/* The graduated limb (every 45° is already a long tick). */}
      <path d={LONG_TICKS} stroke={BRASS_RULE} strokeWidth="0.9" fill="none" />
      {size >= FULL_LIMB_MIN_PX && (
        <path d={SHORT_TICKS} stroke={BRASS_RULE} strokeWidth="0.6" fill="none" />
      )}
      {/* North alone is filled; the other three are one ink, one weight (#2067).
          Not navy: a design file's `#1e3a6e` measures 1.64:1 on the disc. */}
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
