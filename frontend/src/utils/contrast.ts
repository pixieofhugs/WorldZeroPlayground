/**
 * WCAG contrast math (#651). Hand-rolled because axe-core returns "incomplete"
 * over gradients, which is exactly this app's riskiest surfaces; here
 * `parseColor` returns null and callers fail loudly. Used by
 * `__tests__/factionContrast.test.ts` and `e2e/contrast.spec.ts`.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

/** WCAG 1.4.3 AA thresholds. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

/**
 * WCAG 1.4.6 AAA for normal text (#1715): the floor for the app's neutral text
 * tiers only, not faction inks.
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
 * Parse a solid CSS color into RGBA; null for anything else (gradients, most
 * `color-mix()`, images). The sweep treats null as a failure, never a skip.
 * `transparent` is a real value (alpha 0).
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

// `color-mix(in srgb, <opaque> <p>%, transparent)` is exactly `rgba(c, p/100)`
// (premultiplied mixing), e.g. the Albescent night ink (#2301). Strictly this
// shape; any other mix stays null. Only the node value sweep needs it.
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

/** Source-over composite onto an opaque backdrop (alpha inks, #594). */
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
 * Contrast ratio of `text` (composited) against an opaque `surface`. A
 * translucent surface throws (#1413): composite it over its ground first.
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

/** CIE L*a*b* of an opaque sRGB colour, D65; exported for `deltaE76` tests. */
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
 * CIE76 distance between two opaque colours (#1549): ink beside ink, which a
 * contrast ratio cannot see. CIE76 over CIEDE2000 on purpose: for desaturated
 * inks it is pessimistic, the safe direction for a floor.
 * Calibration: JND ~2.3; shipped neutral tiers 29.5-48.5; the #1549 bug was 3.4.
 */
export function deltaE76(first: Rgba, second: Rgba): number {
  const one = toLab(first);
  const two = toLab(second);
  return Math.hypot(one.L - two.L, one.a - two.a, one.b - two.b);
}

/** WCAG "large text" (owes only 3:1): >= 24px, or >= 18.66px at >= 700. */
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
