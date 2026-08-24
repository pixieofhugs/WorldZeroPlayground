/**
 * The in-page half of the rendered contrast sweep (#651).
 *
 * This module is serialized into the browser by `contrast.spec.ts` — it may
 * not import anything (Playwright's `page.evaluate` ships the function source,
 * not its module graph), so the WCAG math it needs is inlined inside
 * `scanPageForContrast`. `src/utils/contrast.ts` remains the source of truth
 * for the node-side math; the duplication here is a constraint of the evaluate
 * boundary, not a second opinion.
 */

/** One measured text node. `background: null` means "could not resolve to a solid". */
export type Finding = {
  /** `rgb(r, g, b)` of the text, alpha already folded in from ancestor opacity. */
  text: string;
  /** The nearest resolved opaque backdrop, or null if it could not be resolved. */
  background: string | null;
  /** Why it could not resolve — only set when `background` is null. */
  unresolved: string | null;
  /**
   * What KIND of unresolvable backdrop this is:
   *  - `opaque-gradient` — a gradient with an opaque stop: a real fill whose
   *                        colour genuinely varies under the text.
   *  - `other`           — an image, or a background-color we cannot parse.
   * A gradient whose stops are ALL translucent is a texture, not a fill: it is
   * composited and measured rather than reported here (see `textureOf`).
   */
  unresolvedKind: 'opaque-gradient' | 'other' | null;
  /**
   * The raw CSS that defeated resolution (the gradient / image / colour).
   * This — not the DOM path — is what identifies an unresolved finding: the
   * CSS is stable across copy edits and re-layouts, a `div > div > span` path
   * is not.
   */
  backdropCss: string | null;
  /**
   * The two halves of the sandwich `backdropCss` sits in, so the node side can
   * try to resolve the fill without a browser (#1727):
   *  - `backdropBase`    — the fill-painting element's own background-color,
   *                        which every `background-image` layer paints OVER.
   *  - `backdropOverlay` — everything already accumulated ABOVE the fill
   *                        (translucent cards, washes), or null if the text
   *                        sits directly on it.
   * Facts, not a verdict: `resolveFillBand` in `contrastBaseline.ts` decides
   * what they add up to, and vitest can reach that. Only set when `background`
   * is null — a resolved backdrop needs no reconstruction.
   */
  backdropBase: string | null;
  backdropOverlay: string | null;
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
 *  1. **An unmeasurable backdrop is a FAILURE, not a skip.** axe returns
 *     "incomplete" there, which reads as green — and this app's flavor
 *     surfaces are exactly that shape.
 *
 *     "Unmeasurable" is narrower than "is a gradient", though. #651 originally
 *     assumed gradients only ever sit *behind* opaque cards; the first sweep
 *     disproved that — the text-bearing surfaces paint a translucent paper
 *     grain (`radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)`) over
 *     their own solid fill, which made 134 perfectly legible nodes
 *     "unresolvable". So we distinguish (Molly's call on #651):
 *
 *       - every stop translucent  → a TEXTURE over the element's own
 *         background-color. Composite the most-opaque stop over that colour
 *         and measure. Worst-case by construction; the accepted error is <2%.
 *       - any stop opaque         → a FILL (gilt wordmark, WOW title bar, the
 *         unaffiliated rainbow). It genuinely hides what is beneath it, so it
 *         still fails loudly.
 *
 *  2. **`aria-hidden="true"` text is ignored.** WCAG exempts incidental /
 *     decorative content, and at least one such element (the Albescent mono
 *     masthead, `AlbescentFeedFrame.tsx`) is intentionally ghosted — design
 *     confirmed it stays.
 *
 *     Text inside an INACTIVE control is ignored for the same reason (#1675) —
 *     see {@link inertControl}. That one is WCAG's own words, not a judgement
 *     call: 1.4.3 names inactive components as exempt.
 *
 * Behaviour 1 was AMENDED by #1675 — an unmeasurable backdrop is no longer a
 * failure. It is reported, loudly, and ratcheted. The reasoning lives on the
 * assertions in `contrast.spec.ts`; nothing in THIS file changed, because the
 * scanner's job is to say honestly that it could not measure, and it still does.
 *
 * AND AMENDED AGAIN by #1727 — but still not here. "Any stop opaque → a FILL"
 * turned out to be too coarse a refusal: a paper stock is a ramp between two
 * near-identical creams, and it only hides text whose own luminance falls
 * between its stops'. That distinction needs the whole stop list, arithmetic,
 * and a real test suite, so it is NOT in this file. `resolveFillBand` in
 * `contrastBaseline.ts` does it node-side, from `backdropCss` / `backdropBase`
 * / `backdropOverlay` below. This module gained three reported facts and no
 * new judgement — deliberately, because nothing typechecks the inside of a
 * `page.evaluate` payload (#1780) and no PR runs it.
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
   * General source-over compositing — `back` may itself be translucent, and
   * the result carries the combined alpha. (The simpler "assume the backdrop
   * is opaque" shortcut silently resolves a translucent card against the first
   * tinted panel it meets, which is wrong.)
   */
  function srcOver(fore: Rgba, back: Rgba): Rgba {
    const alpha = fore.a + back.a * (1 - fore.a);
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (front: number, behind: number) =>
      (front * fore.a + behind * back.a * (1 - fore.a)) / alpha;
    return { r: mix(fore.r, back.r), g: mix(fore.g, back.g), b: mix(fore.b, back.b), a: alpha };
  }

  function luminance(color: Rgba): number {
    const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
      const srgb = channel / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function ratioOf(text: Rgba, surface: Rgba): number {
    const composited = srcOver(text, surface);
    const high = Math.max(luminance(composited), luminance(surface));
    const low = Math.min(luminance(composited), luminance(surface));
    return (high + 0.05) / (low + 0.05);
  }

  /**
   * Serialize a colour for the baseline key. The alpha MUST survive: text at
   * `rgba(28,28,26,1)` and the same ink ghosted to `rgba(28,28,26,0.22)` are
   * different pairs (17.07:1 vs 1.66:1 on white), and printing both as
   * `rgb(28, 28, 26)` collapses them into one entry that is simultaneously
   * passing and failing.
   */
  function show(color: Rgba): string {
    const [r, g, b] = [color.r, color.g, color.b].map((channel) => Math.round(channel));
    if (color.a >= 1) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${Number(color.a.toFixed(3))})`;
  }

  /**
   * If `image` is a texture (a gradient whose every colour stop is
   * translucent), return its most-opaque stop — the worst case it can
   * contribute. Returns `undefined` for a fill, whose colour genuinely varies,
   * and `null` when a stop can't be parsed (never guess).
   */
  function textureOf(image: string): Rgba | null | undefined {
    if (!/gradient\(/.test(image)) return undefined;
    const stops = image.match(/(?:rgba?|color)\([^)]*\)/g);
    if (!stops) return undefined;
    const parsed: Rgba[] = [];
    for (const stop of stops) {
      const color = parse(stop);
      if (color === null) return null;
      if (color.a >= 1) return undefined; // an opaque stop makes this a fill
      parsed.push(color);
    }
    if (parsed.length === 0) return undefined;
    return parsed.reduce((worst, stop) => (stop.a > worst.a ? stop : worst));
  }

  function ariaHidden(element: Element): boolean {
    let node: Element | null = element;
    while (node) {
      if (node.getAttribute("aria-hidden") === "true") return true;
      node = node.parentElement;
    }
    return false;
  }

  /**
   * Text inside an INACTIVE control. WCAG 1.4.3 exempts it by name — "text or
   * images of text that are part of an inactive user interface component have
   * no contrast requirement" — and a dimmed `:disabled` button is the shape the
   * exemption was written for. `RosterTable`'s pagination arrows are ours: a
   * `disabled ? 0.4 : 1` wash the scanner was reading as two AA failures on
   * every faction and theme, for a control nobody can reach.
   *
   * Walked up the tree, not read off the node, because the wash and the text
   * are rarely the same element.
   */
  function inertControl(element: Element): boolean {
    let node: Element | null = element;
    while (node) {
      if (node.matches("button:disabled, input:disabled, select:disabled, textarea:disabled, fieldset:disabled, [aria-disabled='true']")) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  /**
   * A REDACTION MARK (#2409, ADR-0082). The third exemption, and the only one
   * of the three where the 1:1 pairing is the intended output rather than a
   * bug or a WCAG carve-out.
   *
   * TWO SURFACES, NOT THE WHOLE SITE. Only the `/factions` Albescent select
   * tile and the leaderboard's eighth lane redact; every ordinary label still
   * says "Unaffiliated" and is scanned normally (ADR-0082 §2). So this
   * exemption should stay rare — if it starts skipping large parts of a page,
   * the redaction has spread beyond its ruling and THAT is the bug to file.
   *
   * On those two surfaces Albescent's strings render as `[REDACTED]` painted in
   * their own ground's colour for a viewer who has not been revealed to the
   * society, so the line reads as blank until it is selected. That is a
   * deliberate 1.00:1 and it can never be "fixed" — which is exactly why it is
   * exempted HERE and not added to `contrastBaseline.ts`. That list is debt
   * awaiting a child issue and only ever shrinks; an entry that is never going
   * to be deleted would rot it.
   *
   * NOT `aria-hidden`, which is the exemption it superficially resembles. A
   * screen reader announces "REDACTED" plainly and that is the ruling: the
   * secret is equally discoverable to a screen-reader user and to a sighted one
   * who drags a cursor across the line. Hiding it from assistive tech would
   * hand sighted players a tease and blind players nothing, and would also let
   * this scanner pass for the wrong reason.
   *
   * Walked up the tree for the same reason `inertControl` is: the `.redacted`
   * span and the text node under measurement are rarely the same element.
   */
  function redactionMark(element: Element): boolean {
    let node: Element | null = element;
    while (node) {
      if (node.getAttribute("data-redacted") === "true") return true;
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
      const classes =
        typeof node.className === "string"
          ? node.className.trim().split(/\s+/).slice(0, 2).filter(Boolean)
          : [];
      steps.unshift(node.tagName.toLowerCase() + classes.map((name) => `.${name}`).join(""));
      node = node.parentElement;
    }
    return steps.join(" > ");
  }

  /**
   * Resolve the backdrop under `element` by walking ancestors until the
   * accumulated colour is opaque. At each node the paint order is
   * background-color first, then background-image over it.
   */
  function backdropOf(element: Element): {
    color: Rgba | null;
    why: string | null;
    kind: Finding["unresolvedKind"];
    css: string | null;
    base: string | null;
    overlay: string | null;
  } {
    let stack: Rgba | null = null;
    let node: Element | null = element;

    while (node) {
      const style = window.getComputedStyle(node);

      let layer = parse(style.backgroundColor);
      if (layer === null) {
        return {
          color: null,
          why: `${pathOf(node)} background-color "${style.backgroundColor}" is not a solid color`,
          kind: "other",
          css: style.backgroundColor,
          base: null,
          overlay: null,
        };
      }

      if (style.backgroundImage && style.backgroundImage !== "none") {
        const texture = textureOf(style.backgroundImage);
        if (texture === undefined || texture === null) {
          const isGradient = /gradient\(/.test(style.backgroundImage);
          return {
            color: null,
            why: `${pathOf(node)} paints ${style.backgroundImage.slice(0, 80)}`,
            kind: isGradient && texture === undefined ? "opaque-gradient" : "other",
            css: style.backgroundImage,
            // `layer` is still the element's own background-color here: the
            // reassignment below is the texture path, which we did not take.
            base: show(layer),
            overlay: stack === null ? null : show(stack),
          };
        }
        layer = srcOver(texture, layer);
      }

      if (layer.a > 0) {
        stack = stack === null ? layer : srcOver(stack, layer);
        if (stack.a >= 0.999) {
          return { color: { ...stack, a: 1 }, why: null, kind: null, css: null, base: null, overlay: null };
        }
      }
      node = node.parentElement;
    }

    // Nothing opaque all the way up: the canvas is the browser default white.
    const canvas: Rgba = { r: 255, g: 255, b: 255, a: 1 };
    return {
      color: stack === null ? canvas : srcOver(stack, canvas),
      why: null,
      kind: null,
      css: null,
      base: null,
      overlay: null,
    };
  }

  const findings: Finding[] = [];

  for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
    const text = ownText(element);
    if (!text) continue;
    if (ariaHidden(element)) continue;
    if (inertControl(element)) continue;
    if (redactionMark(element)) continue;

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

    findings.push({
      text: show(inked),
      background: backdrop.color === null ? null : show(backdrop.color),
      unresolved: backdrop.why,
      unresolvedKind: backdrop.kind,
      backdropCss: backdrop.css,
      backdropBase: backdrop.base,
      backdropOverlay: backdrop.overlay,
      ratio: backdrop.color === null ? 0 : ratioOf(inked, backdrop.color),
      required,
      fontSizePx,
      fontWeight,
      where: pathOf(element),
      sample,
    });
  }

  return findings;
}
