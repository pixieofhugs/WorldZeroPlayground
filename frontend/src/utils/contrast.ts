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

  return null;
}

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
 * This is not a nicety: several faction inks ARE alpha
 * (`--faction-albescent-ink: rgba(28, 28, 26, 0.72)`), and measuring them
 * un-composited is what let #594's 2.78:1 muted ink ship.
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
 * surface first; the surface itself must already be opaque (resolve it against
 * whatever is behind it before calling).
 */
export function contrastRatio(text: Rgba, surface: Rgba): number {
  const composited = compositeOver(text, surface);
  const lighter = Math.max(relativeLuminance(composited), relativeLuminance(surface));
  const darker = Math.min(relativeLuminance(composited), relativeLuminance(surface));
  return (lighter + 0.05) / (darker + 0.05);
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
