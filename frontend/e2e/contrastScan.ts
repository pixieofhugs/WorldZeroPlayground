/**
 * The in-page half of the rendered contrast sweep (#651).
 *
 * This module is serialized into the browser by `contrast.spec.ts` — it may
 * not import anything (Playwright's `page.evaluate` ships the function source,
 * not its module graph), so the small amount of WCAG math it needs is inlined
 * inside `scanPageForContrast`. `src/utils/contrast.ts` remains the source of
 * truth for the node-side math; the duplication here is a constraint of the
 * evaluate boundary, not a second opinion.
 */

/** One measured text node. `background: null` means "could not resolve to a solid". */
export type Finding = {
  /** `rgb(r, g, b)` of the text, alpha already folded in from ancestor opacity. */
  text: string;
  /** The nearest resolved opaque backdrop, or null if it was a gradient/image. */
  background: string | null;
  /** Why it could not resolve — only set when `background` is null. */
  unresolved: string | null;
  /**
   * What KIND of unresolvable backdrop this is (#651 audit):
   *  - `texture`         — a gradient whose every color stop is translucent
   *                        (paper grain, ruled lines). It sits ON a solid
   *                        background-color and perturbs it by a few percent.
   *  - `opaque-gradient` — a gradient with an opaque stop: a real fill whose
   *                        color genuinely varies under the text.
   *  - `other`           — an image, or a background-color we cannot parse.
   */
  unresolvedKind: 'texture' | 'opaque-gradient' | 'other' | null;
  ratio: number;
  required: number;
  fontSizePx: number;
  fontWeight: number;
  /** A human-findable pointer: tag chain + a snippet of the offending text. */
  where: string;
  sample: string;
};

/**
 * Walk every visible text node on the page, resolve the backdrop each one
 * actually sits on, and measure the contrast.
 *
 * Two deliberate behaviours, both of them the reason this exists rather than
 * an axe-core dependency:
 *
 *  1. **A gradient/image backdrop is a FAILURE, not a skip.** axe returns
 *     "incomplete" there, which reads as green — and this app's flavor
 *     surfaces (`.em-backdrop`, the S.N.I.D.E. flyposted wall, the
 *     unaffiliated `repeating-conic-gradient`) are exactly that shape. Today
 *     the broken text happens to sit on cards with solid fills and the
 *     gradients are only *behind* those cards; that is luck, and the sweep
 *     asserts it instead of assuming it.
 *
 *  2. **`aria-hidden="true"` text is ignored.** WCAG exempts incidental /
 *     decorative content, and at least one such element (the Albescent mono
 *     masthead, `AlbescentFeedFrame.tsx`) is intentionally ghosted — design
 *     confirmed it stays.
 */
export function scanPageForContrast(): Finding[] {
  type Rgba = { r: number; g: number; b: number; a: number };

  function parse(input: string): Rgba | null {
    const value = input.trim().toLowerCase();
    if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

    // Chromium serializes a resolved color-mix() as `color(srgb …)`, whose
    // channels are 0–1 floats rather than 0–255.
    const srgb = /^color\(\s*srgb\s+([^)]+)\)$/.exec(value);
    if (srgb) {
      const parts = srgb[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
      if (parts.length < 3) return null;
      const [r, g, b] = parts.slice(0, 3).map((token) => Number.parseFloat(token) * 255);
      const a = parts.length > 3 ? Number.parseFloat(parts[3]) : 1;
      if ([r, g, b, a].some((channel) => Number.isNaN(channel))) return null;
      return { r, g, b, a };
    }

    const match = /^rgba?\(([^)]+)\)$/.exec(value);
    if (!match) return null;
    const parts = match[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map((token) => Number.parseFloat(token));
    const a = parts.length > 3 ? Number.parseFloat(parts[3]) : 1;
    if ([r, g, b, a].some((channel) => Number.isNaN(channel))) return null;
    return { r, g, b, a };
  }

  /**
   * Classify a `background-image`. A gradient made only of translucent stops
   * is a TEXTURE laid over the element's own background-color; a gradient with
   * an opaque stop is a FILL that genuinely hides what's beneath it.
   */
  function classifyImage(image: string): 'texture' | 'opaque-gradient' | 'other' {
    if (!/gradient\(/.test(image)) return 'other';
    const stops = image.match(/(?:rgba?|color)\([^)]*\)/g);
    if (!stops) return 'opaque-gradient';
    const parsed = stops.map(parse);
    if (parsed.some((stop) => stop === null)) return 'other';
    return parsed.every((stop) => (stop as Rgba).a < 1) ? 'texture' : 'opaque-gradient';
  }

  function over(fore: Rgba, back: Rgba): Rgba {
    return {
      r: fore.r * fore.a + back.r * (1 - fore.a),
      g: fore.g * fore.a + back.g * (1 - fore.a),
      b: fore.b * fore.a + back.b * (1 - fore.a),
      a: 1,
    };
  }

  function luminance(color: Rgba): number {
    const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
      const srgb = channel / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function ratioOf(text: Rgba, surface: Rgba): number {
    const composited = over(text, surface);
    const high = Math.max(luminance(composited), luminance(surface));
    const low = Math.min(luminance(composited), luminance(surface));
    return (high + 0.05) / (low + 0.05);
  }

  function show(color: Rgba): string {
    const round = (channel: number) => Math.round(channel);
    return `rgb(${round(color.r)}, ${round(color.g)}, ${round(color.b)})`;
  }

  function ariaHidden(element: Element): boolean {
    let node: Element | null = element;
    while (node) {
      if (node.getAttribute("aria-hidden") === "true") return true;
      node = node.parentElement;
    }
    return false;
  }

  function ownText(element: Element): string {
    let text = "";
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? "";
    }
    return text.trim();
  }

  function pathOf(element: Element): string {
    const steps: string[] = [];
    let node: Element | null = element;
    for (let depth = 0; node && depth < 4; depth += 1) {
      const classes = typeof node.className === "string" ? node.className.trim().split(/\s+/).slice(0, 2) : [];
      steps.unshift(node.tagName.toLowerCase() + classes.map((name) => `.${name}`).join(""));
      node = node.parentElement;
    }
    return steps.join(" > ");
  }

  /**
   * Resolve the backdrop under `element`. Returns the solid color, or an
   * explanation of why it isn't one. `backgroundImage` is checked BEFORE
   * `backgroundColor` on purpose: `.em-backdrop` carries both, and its
   * gradients paint over its solid fill, so the fill is not the answer.
   */
  function backdropOf(element: Element): {
    color: Rgba | null;
    why: string | null;
    kind: Finding['unresolvedKind'];
  } {
    let stack: Rgba | null = null;
    let node: Element | null = element;

    while (node) {
      const style = window.getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== "none") {
        return {
          color: null,
          why: `${pathOf(node)} paints ${style.backgroundImage.slice(0, 80)}`,
          kind: classifyImage(style.backgroundImage),
        };
      }
      const background = parse(style.backgroundColor);
      if (background === null) {
        return {
          color: null,
          why: `${pathOf(node)} background-color "${style.backgroundColor}" is not a solid color`,
          kind: 'other',
        };
      }
      if (background.a > 0) {
        stack = stack === null ? background : over(stack, background);
        if (stack.a >= 1) return { color: stack, why: null, kind: null };
      }
      node = node.parentElement;
    }

    // Nothing opaque all the way up: the canvas is the browser default white.
    const canvas: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    return { color: stack === null ? canvas : over(stack, canvas), why: null, kind: null };
  }

  const findings: Finding[] = [];

  for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    const text = ownText(element);
    if (!text) continue;
    if (ariaHidden(element)) continue;

    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;

    const style = window.getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none") continue;

    // Fold ancestor opacity into the text's alpha — a ghosted label is a
    // contrast problem even though its declared `color` looks fine.
    let opacity = Number.parseFloat(style.opacity);
    let ancestor = element.parentElement;
    while (ancestor) {
      opacity *= Number.parseFloat(window.getComputedStyle(ancestor).opacity);
      ancestor = ancestor.parentElement;
    }
    if (opacity <= 0.01) continue;

    const foreground = parse(style.color);
    if (foreground === null || foreground.a * opacity <= 0.01) continue;
    const inked: Rgba = { ...foreground, a: Math.min(1, foreground.a * opacity) };

    const backdrop = backdropOf(element);
    const fontSizePx = Number.parseFloat(style.fontSize);
    const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
    const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
    const required = large ? 3 : 4.5;
    const sample = text.replace(/\s+/g, " ").slice(0, 40);

    if (backdrop.color === null) {
      findings.push({
        text: show(inked),
        background: null,
        unresolved: backdrop.why,
        unresolvedKind: backdrop.kind,
        ratio: 0,
        required,
        fontSizePx,
        fontWeight,
        where: pathOf(element),
        sample,
      });
      continue;
    }

    findings.push({
      text: show(inked),
      background: show(backdrop.color),
      unresolved: null,
      unresolvedKind: null,
      ratio: ratioOf(inked, backdrop.color),
      required,
      fontSizePx,
      fontWeight,
      where: pathOf(element),
      sample,
    });
  }

  return findings;
}
