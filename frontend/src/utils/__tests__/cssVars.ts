/**
 * Tiny CSS custom-property resolver for node contrast tests (#651).
 *
 * A var declared only in `:root` can still flip in dark if it points at a var
 * the dark block rebinds, so every hop re-reads dark first, root second.
 * Aliases live on `:root, [data-theme]` (#1839), a second light selector.
 */

import { compositeOver, parseColor, type Rgba } from "../contrast";

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

/** Bodies of every rule whose selector is exactly `selector` (several passes merge). */
export function ruleBodies(css: string, selector: string): string[] {
  return matchRules(css, selector).map((rule) => rule.body);
}

/** `at` is the cascade tiebreak. */
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
    // Whole selector only, not a prefix (`:root .foo`, `:root, [data-theme]`).
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

/** Alias selector (#1839): else a nested theme wrapper inherits the substituted value. */
export const THEME_SCOPED = ":root, [data-theme]";

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

/** Light and dark var maps; light merges `:root` and THEME_SCOPED in source order. */
export function readThemes(css: string): Record<Theme, VarMap> {
  const clean = stripComments(css);
  return {
    light: declarationsIn(bodiesInSourceOrder(clean, [":root", THEME_SCOPED])),
    dark: declarationsIn(ruleBodies(clean, '[data-theme="dark"]')),
  };
}

/** Resolve through `var()` hops; null = undeclared or circular (a broken token). */
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

/*
 * The na aurora, composited (#2993): the na composer surfaces draw on a
 * `ComposerGround` wash (saturate filter, screen in dark, at aurora-opacity),
 * so their contrast needs the composite, not the token. All values come from
 * `index.css`; helpers throw so a malformed sheet names itself.
 */

/** `saturate()` as `filter` applies it, sRGB, from the SVG colour matrix. */
export function saturate(colour: Rgba, amount: number): Rgba {
  const channel = (r: number, g: number, b: number) =>
    r * colour.r + g * colour.g + b * colour.b;
  return {
    r: channel(0.213 + 0.787 * amount, 0.715 - 0.715 * amount, 0.072 - 0.072 * amount),
    g: channel(0.213 - 0.213 * amount, 0.715 + 0.285 * amount, 0.072 - 0.072 * amount),
    b: channel(0.213 - 0.213 * amount, 0.715 - 0.715 * amount, 0.072 + 0.928 * amount),
    a: colour.a,
  };
}

/** `mix-blend-mode: screen`. */
export function screenOver(top: Rgba, back: Rgba): Rgba {
  const lift = (x: number, y: number) => 255 - ((255 - x) * (255 - y)) / 255;
  return { r: lift(top.r, back.r), g: lift(top.g, back.g), b: lift(top.b, back.b), a: top.a };
}

function required(token: string, theme: Theme, themes: Record<Theme, VarMap>): string {
  const raw = resolveVar(token, theme, themes);
  if (raw === null) throw new Error(`${token} does not resolve in ${theme}`);
  return raw;
}

function colour(token: string, theme: Theme, themes: Record<Theme, VarMap>): Rgba {
  const parsed = parseColor(required(token, theme, themes));
  if (parsed === null) throw new Error(`${token} is not a colour in ${theme}`);
  return parsed;
}

/**
 * One ground per aurora stop at its peak. Callers take the MINIMUM ratio
 * ("hotspots are the measurement", WORLD_ZERO_STYLE.md). Bare sheet excluded.
 */
export function naWashedSheet(theme: Theme, themes: Record<Theme, VarMap>): Rgba[] {
  const sheet = colour("--faction-default-card-bg", theme, themes);
  const alpha = Number(required("--faction-default-aurora-opacity", theme, themes));
  if (!Number.isFinite(alpha)) throw new Error(`the aurora opacity is not a number in ${theme}`);
  const filter = required("--faction-default-aurora-filter", theme, themes);
  const amount = /saturate\(([\d.]+)\)/.exec(filter);
  if (!amount) throw new Error(`the aurora filter names no saturate() in ${theme}`);
  const blend = resolveVar("--faction-default-aurora-blend", theme, themes);
  const stops = [...required("--faction-default-aurora", theme, themes)
    .matchAll(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)]
    .map((match) => parseColor(match[0]))
    .filter((stop): stop is Rgba => stop !== null);
  if (stops.length < 2) throw new Error(`the aurora is not a ramp in ${theme}`);
  return stops.map((stop) => {
    const filtered = saturate(stop, Number(amount[1]));
    const painted = blend?.trim() === "screen" ? screenOver(filtered, sheet) : filtered;
    return compositeOver({ ...painted, a: alpha }, sheet);
  });
}
