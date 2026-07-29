/**
 * THE EPHEMERISTS — the v2 VALLEY PLATE vocabulary.
 *
 * Deco × Egypt: a papyrus field journal out of the Valley. The metaphor shipped
 * with the v2 task card (#1023) and grew to page size with task detail v2
 * (#1032); this module is the first time its ornament is shared rather than
 * copied, extracted for the praxis-detail skin (#1120).
 *
 * NOT the illuminated codex. `ephemeristsAtoms.tsx` beside this file holds the
 * OTHER Ephemerists vocabulary — the sigil, the foxing, the wax seal, the
 * concordance — and it paints in the `--eph-*` family. The plate is a full
 * metaphor swap (ADR-0055) on `--faction-ephemerists-plate-*`, and the two
 * grounds must not be mixed on one surface: `--eph-lapis` has no dark override
 * tuned for the plate's night-blue, and the plate's brass is a rule colour that
 * is never an ink.
 *
 * `EphemeristsTaskCard` and `EphemeristsTaskDetail` still carry their own copies
 * of the glyph library and the cornice; both are migration targets for a
 * follow-up whose whole diff is a delete and an import. They are deliberately
 * NOT rewired here — three faction skins are being built over the same shared
 * layout in parallel, and a same-wave edit to two files this issue does not own
 * is how a wave collides.
 *
 * Every colour is a `--faction-ephemerists-plate-*` token; light/dark flips
 * through the `[data-theme="dark"]` cascade, never a ternary.
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
export const DISC = "var(--faction-ephemerists-plate-disc)";
export const OCHRE = "var(--faction-ephemerists-plate-ochre)";
export const NILE = "var(--faction-ephemerists-plate-nile)";
export const RULE = "var(--faction-ephemerists-plate-rule)";
export const LINE = "var(--faction-ephemerists-plate-line)";
export const SHADOW = "var(--faction-ephemerists-plate-shadow)";
export const WASH = "var(--faction-ephemerists-plate-wash)";

/** Incised small caps — the plate's label voice, everywhere. */
export const SMALL_CAPS: CSSProperties = {
  fontFamily: CAPS,
  fontWeight: 500,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
};

/**
 * The glyph library — Egyptian signs beside later-era marks, drawn as deco
 * geometry on a 24-unit square, stroke-only so they read as incised rather than
 * illustrated.
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
};

/** The order the signs march in — the design's own register. */
export const REGISTER = [
  "ankh", "water", "feather", "eye", "djed", "greekKey", "reed", "offering",
  "alchemy", "chevrons", "scarab", "sun", "ankh", "water", "djed", "eye",
];

/** Distance between two signs in a register, and their drawn size. Geometry. */
const GLYPH_PITCH = 27.5;
const GLYPH_SIZE = 13;

/** One incised sign, at its own strength and its own phase in the cycle. */
function Glyph({ name, x, y, strength, delay }: {
  name: string
  x: number
  y: number
  strength: number
  delay: number
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
        stroke={GOLD}
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
 */
export function GlyphRegister({ width, y, strength, keyPrefix }: {
  width: number
  y: number
  strength: number
  keyPrefix: string
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
        />
      ))}
    </>
  );
}

/** One wing of the sun disc, drawn as deco stepped bars. */
function Wing({ flip }: { flip?: boolean }) {
  return (
    <g transform={flip ? "scale(-1,1)" : undefined}>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={13 + i * 11.4}
          y={-6 + i * 1.5}
          width={9.6}
          height={8.4 - i * 1.4}
          rx={1.4}
          fill={GOLD}
          opacity={0.9 - i * 0.13}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={`covert-${i}`}
          x={15 + i * 11.4}
          y={4.2 + i * 1.6}
          width={8}
          height={3.4 - i * 0.5}
          rx={1}
          fill={BRASS_LIGHT}
          opacity={0.62 - i * 0.11}
        />
      ))}
    </g>
  );
}

/** The winged sun disc, at whatever width it is asked for. */
export function WingedDisc({ width, height, className }: {
  width: number
  height: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="-88 -20 176 40"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <Wing />
      <Wing flip />
      <circle r={11} fill={DISC} stroke={BRASS} strokeWidth="1.6" />
      <circle r={5.5} fill={GOLD} opacity={0.85} />
    </svg>
  );
}

/**
 * The cavetto cornice: fluted strokes under a stepped double rule.
 *
 * `glow` washes a slow gold bloom along the band — the praxis record's one piece
 * of motion. The pigment, the cycle and the reduced-motion gate all live on
 * `.eph-cornice-glow` in index.css; this only reserves the layer.
 */
export function Cornice({ glow }: { glow?: boolean }) {
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
        {Array.from({ length: 52 }).map((_, i) => (
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

/** The cavetto band reused as a divider — the rule under every section head. */
export function FlutedRule() {
  return (
    <div
      aria-hidden="true"
      // eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between the fluted rule's strokes.
      style={{ display: "flex", alignItems: "flex-start", gap: 3, height: 7, overflow: "hidden" }}
    >
      {Array.from({ length: 48 }).map((_, i) => (
        <span
          key={i}
          style={{ flex: 1, height: i % 2 ? 7 : 4, background: BRASS, opacity: i % 2 ? 0.5 : 0.28 }}
        />
      ))}
    </div>
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
