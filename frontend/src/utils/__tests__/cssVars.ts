/**
 * A tiny CSS custom-property resolver for the contrast test (#651).
 *
 * Not a general CSS parser and not shipped to the browser — it exists so a
 * node-environment test can answer "what does `--everymen-paper` actually
 * evaluate to under `[data-theme="dark"]`?" without booting a DOM.
 *
 * The one subtlety it must get right: a var can be declared once in `:root`
 * and still differ per theme, because it POINTS at another var that the dark
 * block rebinds — `--faction-ephemerists-card-bg: var(--eph-vellum)` is
 * declared only in `:root`, yet flips in dark. So resolution is recursive and
 * theme-scoped: every hop re-reads the dark map first, root second.
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
  const bodies: string[] = [];
  let cursor = 0;
  while (cursor < css.length) {
    const start = css.indexOf(selector, cursor);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    if (open === -1) break;
    // Reject `[data-theme="dark"] input` / `:root .foo` — selector must be
    // the whole thing, not a prefix of a descendant selector.
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
    bodies.push(css.slice(open + 1, index - 1));
    cursor = index;
  }
  return bodies;
}

function declarationsIn(bodies: string[]): VarMap {
  const map: VarMap = new Map();
  for (const body of bodies) {
    for (const match of body.matchAll(CUSTOM_PROP)) {
      map.set(match[1], match[2].trim());
    }
  }
  return map;
}

/** Parse index.css into the light (`:root`) and dark (`[data-theme="dark"]`) var maps. */
export function readThemes(css: string): Record<Theme, VarMap> {
  const clean = stripComments(css);
  return {
    light: declarationsIn(ruleBodies(clean, ":root")),
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
