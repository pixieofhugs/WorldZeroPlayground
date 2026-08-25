/**
 * WCAG contrast math (#651).
 *
 * Hand-rolled on purpose. axe-core punts on gradient and image backgrounds —
 * it returns "incomplete" rather than pass/fail — and this app's flavor
 * surfaces (`.em-backdrop`, the S.N.I.D.E. flyposted wall, the unaffiliated
 * `repeating-conic-gradient`) are exactly that shape. A dependency that
 * reports green over the riskiest surfaces is worse than no dependency; the
 * math below is ~40 lines and we control what happens over a gradient
 * (`parseColor` returns null, and the callers must fail loudly).
 *
 * Two consumers:
 *   - the token-value test (`__tests__/factionContrast.test.ts`) — resolves
 *     index.css vars and measures the documented (surface, text) pairs.
 *   - the rendered sweep (`e2e/contrast.spec.ts`) — measures computed styles.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

/** WCAG 1.4.3 AA thresholds. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

/**
 * WCAG 1.4.6 AAA for normal text (#1715).
 *
 * Not a blanket target — the faction sheets are hand-mixed paper stocks and
 * several of their inks have nowhere to go. It is the floor the app's own
 * NEUTRAL text tiers are held to, because those two tokens print on every
 * surface in the app and had settled onto the AA floor (dark secondary was
 * 4.87:1 on the composited `--color-bg-surface-alt`). AA is the line below
 * which text is a defect; it is not where the most-painted ink in the repo
 * should live.
 */
export const AAA_NORMAL = 7;

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_LONG_ALPHA = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_FUNC = /^rgba?\(([^)]+)\)$/i;
// Chromium serializes a resolved `color-mix()` in the modern `color(srgb …)`
// syntax, so computed styles hand us `color(srgb 0.129 0.102 0.063 / 0.82)`.
const COLOR_SRGB = /^color\(\s*srgb\s+([^)]+)\)$/i;

/**
 * Parse a solid CSS color into RGBA. Returns null for anything that is NOT a
 * single solid color — gradients, `color-mix()`, `url()` images, keywords we
 * don't model. Callers decide what null means; the sweep treats it as a
 * failure, never a skip.
 *
 * `transparent` parses as a real value (alpha 0) because "see through to the
 * ancestor" is a meaningful answer, not an unknown one.
 */
export function parseColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (value === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (value === "black") return { r: 0, g: 0, b: 0, a: 1 };

  const short = HEX_SHORT.exec(value);
  if (short) {
    const [r, g, b] = short.slice(1, 4).map((digit) => parseInt(digit + digit, 16));
    return { r, g, b, a: 1 };
  }

  const longAlpha = HEX_LONG_ALPHA.exec(value);
  if (longAlpha) {
    const [r, g, b, a] = longAlpha.slice(1, 5).map((pair) => parseInt(pair, 16));
    return { r, g, b, a: a / 255 };
  }

  const long = HEX_LONG.exec(value);
  if (long) {
    const [r, g, b] = long.slice(1, 4).map((pair) => parseInt(pair, 16));
    return { r, g, b, a: 1 };
  }

  const srgb = COLOR_SRGB.exec(value);
  if (srgb) {
    // `color(srgb …)` channels are 0–1 floats, not 0–255.
    const parts = srgb[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const channels = parts.slice(0, 3).map((token) => {
      const numeric = Number.parseFloat(token);
      if (Number.isNaN(numeric)) return null;
      const unit = token.endsWith("%") ? numeric / 100 : numeric;
      return clamp(unit * 255, 0, 255);
    });
    const alpha = parts.length === 4 ? readAlpha(parts[3]) : 1;
    if (channels.some((channel) => channel === null) || alpha === null) return null;
    const [r, g, b] = channels as number[];
    return { r, g, b, a: alpha };
  }

  const func = RGB_FUNC.exec(value);
  if (func) {
    // Both legacy `rgb(1, 2, 3)` and modern `rgb(1 2 3 / 40%)` spellings.
    const parts = func[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const channels = parts.slice(0, 3).map(readChannel);
    const alpha = parts.length === 4 ? readAlpha(parts[3]) : 1;
    if (channels.some((channel) => channel === null) || alpha === null) return null;
    const [r, g, b] = channels as number[];
    return { r, g, b, a: alpha };
  }

  const faded = COLOR_MIX_FADE.exec(value);
  if (faded) {
    const base = parseColor(faded[1].trim());
    const percent = readAlpha(`${faded[2]}%`);
    if (base === null || percent === null || base.a !== 1) return null;
    return { ...base, a: percent };
  }

  return null;
}

// `color-mix(in srgb, <color> <p>%, transparent)` — fading a colour with
// `transparent` is the only way CSS lets a custom property carry "that token, at
// an alpha", and it is what the Albescent letter's night ink is written as
// (#2301). Because sRGB mixing is premultiplied, mixing an OPAQUE colour with
// `transparent` leaves the channels alone and lands the alpha at `p` — so this
// is exactly `rgba(<color>, p/100)` and needs no mixing math.
//
// STRICTLY THIS ONE SHAPE. A mix of two real colours, another colour space, or
// a second percentage still returns null, and null is a FAILURE to every caller
// (see the note on this function) — never a skip. So this only ever ADDS
// measurements: nothing that resolves through here could pass before, because
// before, every `color-mix()` was an unmeasurable hole.
//
// The rendered sweeps never needed it — Chromium hands them the resolved
// `color(srgb …)` above. It is the VALUE-level sweep, reading index.css in node
// with no browser to resolve anything, that could not see through it.
const COLOR_MIX_FADE =
  /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i;

function readChannel(token: string): number | null {
  const numeric = Number.parseFloat(token);
  if (Number.isNaN(numeric)) return null;
  const scaled = token.endsWith("%") ? (numeric / 100) * 255 : numeric;
  return clamp(scaled, 0, 255);
}

function readAlpha(token: string): number | null {
  const numeric = Number.parseFloat(token);
  if (Number.isNaN(numeric)) return null;
  const scaled = token.endsWith("%") ? numeric / 100 : numeric;
  return clamp(scaled, 0, 1);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Composite a (possibly translucent) color over an opaque backdrop —
 * standard source-over alpha blending.
 *
 * This is not a nicety: several faction inks ARE alpha — a quiet tier is
 * routinely its sheet's ink at 60–75% — and measuring one un-composited is what
 * let #594's 2.78:1 muted ink ship.
 */
export function compositeOver(fore: Rgba, back: Rgba): Rgba {
  return {
    r: fore.r * fore.a + back.r * (1 - fore.a),
    g: fore.g * fore.a + back.g * (1 - fore.a),
    b: fore.b * fore.a + back.b * (1 - fore.a),
    a: 1,
  };
}

/** WCAG relative luminance of an opaque color. */
export function relativeLuminance(color: Rgba): number {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio of `text` against `surface`. The text is composited over the
 * surface first; the surface itself must already be opaque.
 *
 * A TRANSLUCENT SURFACE THROWS (#1413). It used to be a doc comment — "resolve
 * it against whatever is behind it before calling" — and a doc comment is not a
 * guard. `--color-bg-surface` is `rgba(255,255,255,0.72)`, so `.sidebar-card`
 * has no ground of its own; measured as if the alpha were not there it reads
 * near-white and every ink on it passes, while over Singularity's always-dark
 * praxis-detail wall the same 72% white resolves to a mid-grey and
 * `--color-danger` is 2.54:1. That bug survived both guards and was reported by
 * eye. `compositeOver` is right there; a caller that has not decided what is
 * behind the surface has not finished asking the question.
 */
export function contrastRatio(text: Rgba, surface: Rgba): number {
  if (surface.a !== 1) {
    throw new Error(
      `contrastRatio: the surface is translucent (alpha ${surface.a}). ` +
        "A translucent surface has no single value to measure — composite it " +
        "over the ground it is mounted on first (compositeOver).",
    );
  }
  const composited = compositeOver(text, surface);
  const lighter = Math.max(relativeLuminance(composited), relativeLuminance(surface));
  const darker = Math.min(relativeLuminance(composited), relativeLuminance(surface));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * CIE L*a*b* of an opaque sRGB colour, D65 white point.
 *
 * Exported only for `deltaE76` below and its tests. Contrast maths lives in
 * relative luminance; this is the other axis, and the reason the file needs
 * both is #1549: two inks can be a hair apart in luminance and a whole hue
 * apart, or a hair apart in both, and a ratio cannot tell you which.
 */
export function toLab(color: Rgba): { L: number; a: number; b: number } {
  const linear = (channel: number): number => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [color.r, color.g, color.b].map(linear);
  // sRGB -> XYZ (D65), normalised by the D65 white point.
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ].map((value) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116));
  const [x, y, z] = xyz;
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

/**
 * CIE76 perceptual distance between two opaque colours (#1549).
 *
 * WHY THIS EXISTS. `contrastRatio` measures an ink against the GROUND it sits
 * on. It is blind to the ink sitting BESIDE it — the gap #1449 named when the
 * card family's alarm and notice roles collapsed onto one hue with every ratio
 * in the manifest still green. That gap was papered over with a hex inequality
 * ("these two tokens are not literally the same string"), and the ponytail
 * there said the upgrade was a distance floor, once a repaint walked two inks
 * apart. #1549 is that repaint: `--color-text-secondary` and
 * `--color-text-tertiary` were a hex inequality apart in light and nothing
 * more, at ΔE 3.4.
 *
 * CIE76 ON PURPOSE. It is the crude one — it over-reports distance in
 * saturated regions and under-reports near-neutral hue swings, and CIEDE2000
 * is the accurate answer. But every pairing this repo asks about is a
 * desaturated ink against another desaturated ink, where CIE76 is *pessimistic*
 * rather than flattering, and a guard that errs toward "these are too close"
 * is the safe direction for a floor. Forty lines of ΔE2000 to make a threshold
 * marginally kinder is not a trade worth making.
 *
 * Calibration, so a future floor is not picked out of the air: ~2.3 is the
 * classic just-noticeable difference for adjacent patches, and text tiers are
 * never adjacent patches — they are small type separated by layout. The shipped
 * neutral tiers run 29.5 (light secondary/tertiary) to 48.5 (dark
 * primary/tertiary); the pair this issue fixed was 3.4.
 */
export function deltaE76(first: Rgba, second: Rgba): number {
  const one = toLab(first);
  const two = toLab(second);
  return Math.hypot(one.L - two.L, one.a - two.a, one.b - two.b);
}

/**
 * WCAG "large text": >= 24px, or >= 18.66px when bold (>= 700). Large text
 * only owes 3:1. Several faction surfaces use big display type and would
 * false-positive against the 4.5:1 floor.
 */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  if (fontSizePx >= 24) return true;
  return fontSizePx >= 18.66 && fontWeight >= 700;
}

/** The AA floor that applies to text of this size/weight. */
export function requiredRatio(fontSizePx: number, fontWeight: number): number {
  return isLargeText(fontSizePx, fontWeight) ? AA_LARGE : AA_NORMAL;
}

/** Round for stable, readable reporting (2dp — the precision issue #651 quotes). */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
