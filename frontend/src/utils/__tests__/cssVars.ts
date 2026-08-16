/**
 * A tiny CSS custom-property resolver for the contrast test (#651).
 *
 * Not a general CSS parser and not shipped to the browser — it exists so a
 * node-environment test can answer "what does `--everymen-paper` actually
 * evaluate to under `[data-theme="dark"]`?" without booting a DOM.
 *
 * The one subtlety it must get right: a var can be declared once in `:root`
 * and still differ per theme, because it POINTS at another var that the dark
 * block rebinds — `--faction-everymen-card-bg: var(--everymen-paper)` is
 * declared only in `:root`, yet flips in dark. So resolution is recursive and
 * theme-scoped: every hop re-reads the dark map first, root second.
 *
 * (This example used to be `--faction-ephemerists-card-bg: var(--eph-vellum)`.
 * It stopped demonstrating the point in #1627: that contract now aliases the
 * Valley plate, which is theme-invariant, so the name no longer flips at all.)
 *
 * That reasoning holds only where `:root` and `[data-theme]` are the same
 * element. Inside a NESTED theme wrapper they are not, so every alias in the
 * file is declared on `:root, [data-theme]` instead (#1839) — which is a second
 * light-cascade selector this parser has to read, or the light map loses them.
 */

/** A resolved theme: custom-property name (with `--`) → raw declared value. */
export type VarMap = Map<string, string>;

export type Theme = "light" | "dark";

const COMMENT = /\/\*[\s\S]*?\*\//g;
const CUSTOM_PROP = /(--[\w-]+)\s*:\s*([^;]+);/g;
const VAR_REF = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/;

/** Strip comments so `/* … *​/` text can't be mistaken for a declaration. */
export function stripComments(css: string): string {
  return css.replace(COMMENT, "");
}

/**
 * Collect the bodies of every rule whose selector is exactly `selector`.
 * index.css declares `:root` and `[data-theme="dark"]` in several passes
 * (base, then the per-faction blocks), so all of them must merge — later
 * declarations win, as the cascade does.
 */
export function ruleBodies(css: string, selector: string): string[] {
  return matchRules(css, selector).map((rule) => rule.body);
}

/** A matched rule and where in the source it started — the cascade's tiebreak. */
interface Rule {
  at: number;
  body: string;
}

function matchRules(css: string, selector: string): Rule[] {
  const rules: Rule[] = [];
  let cursor = 0;
  while (cursor < css.length) {
    const start = css.indexOf(selector, cursor);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    if (open === -1) break;
    // Reject `[data-theme="dark"] input` / `:root .foo` / `:root, [data-theme]`
    // — selector must be the whole thing, not a prefix of a longer one.
    const between = css.slice(start + selector.length, open).trim();
    const before = start === 0 ? "\n" : css[start - 1];
    if (between !== "" || !/[\s;{}]/.test(before)) {
      cursor = start + selector.length;
      continue;
    }
    let depth = 1;
    let index = open + 1;
    while (index < css.length && depth > 0) {
      if (css[index] === "{") depth += 1;
      else if (css[index] === "}") depth -= 1;
      index += 1;
    }
    rules.push({ at: start, body: css.slice(open + 1, index - 1) });
    cursor = index;
  }
  return rules;
}

/**
 * The selector every alias block carries (#1839): a value that resolves through
 * `var()` has to be re-declared on any element that carries a theme, or a
 * nested `[data-theme]` wrapper inherits its already-substituted value.
 */
export const THEME_SCOPED = ":root, [data-theme]";

/** Bodies of every rule matching one of `selectors`, in source order. */
function bodiesInSourceOrder(css: string, selectors: string[]): string[] {
  return selectors
    .flatMap((selector) => matchRules(css, selector))
    .sort((a, b) => a.at - b.at)
    .map((rule) => rule.body);
}

export function declarationsIn(bodies: string[]): VarMap {
  const map: VarMap = new Map();
  for (const body of bodies) {
    for (const match of body.matchAll(CUSTOM_PROP)) {
      map.set(match[1], match[2].trim());
    }
  }
  return map;
}

/**
 * Parse index.css into the light and dark var maps.
 *
 * The light cascade has two selectors, not one: `:root` for a value that stands
 * on its own, and `:root, [data-theme]` for an alias, which must also be
 * declared on a nested theme wrapper so it re-substitutes there (#1839). Both
 * match `documentElement`, so the light map is their merge in source order.
 */
export function readThemes(css: string): Record<Theme, VarMap> {
  const clean = stripComments(css);
  return {
    light: declarationsIn(bodiesInSourceOrder(clean, [":root", THEME_SCOPED])),
    dark: declarationsIn(ruleBodies(clean, '[data-theme="dark"]')),
  };
}

/**
 * Resolve a custom property to a literal value under `theme`, following
 * `var()` hops. Returns null if the name is undeclared or the chain is
 * circular — a caller that sees null has a broken token, not a passing one.
 */
export function resolveVar(
  name: string,
  theme: Theme,
  themes: Record<Theme, VarMap>,
  seen: Set<string> = new Set(),
): string | null {
  if (seen.has(name)) return null;
  seen.add(name);

  const declared = theme === "dark" ? themes.dark.get(name) ?? themes.light.get(name) : themes.light.get(name);
  if (declared === undefined) return null;
  return resolveValue(declared, theme, themes, seen);
}

/** Resolve every `var()` inside a declared value (may be plain text already). */
function resolveValue(
  value: string,
  theme: Theme,
  themes: Record<Theme, VarMap>,
  seen: Set<string>,
): string | null {
  let current = value.trim();
  let guard = 0;
  let match = VAR_REF.exec(current);
  while (match) {
    if (guard++ > 32) return null;
    const inner = resolveVar(match[1], theme, themes, new Set(seen));
    const replacement = inner ?? (match[2] !== undefined ? match[2].trim() : null);
    if (replacement === null) return null;
    current = current.slice(0, match.index) + replacement + current.slice(match.index + match[0].length);
    match = VAR_REF.exec(current);
  }
  return current;
}
