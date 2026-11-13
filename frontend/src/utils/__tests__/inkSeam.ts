/**
 * The rendered-ink seam shared by every "does this surface paint a faction FILL
 * as type?" guard (#1932, #2077). One copy so `INK_PROPS` cannot drift. Reads
 * emitted `style=`, so it catches hues arriving as props, which the lint rule
 * `local/no-faction-hue-as-ink` cannot trace; neither subsumes the other.
 */

/**
 * Every inline `style` declaration as `[property, value]`. Splitting on the
 * FIRST `:` keeps `color-mix(` washes from reading as a `color` ink.
 */
export function declarations(html: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const match of html.matchAll(/style="([^"]*)"/g)) {
    for (const decl of match[1].split(';')) {
      const colon = decl.indexOf(':')
      if (colon === -1) continue
      out.push([decl.slice(0, colon).trim(), decl.slice(colon + 1).trim()])
    }
  }
  return out
}

/**
 * Properties that end up as an ink. `--gem-ink` is `.level-gem-number`'s
 * `color` one indirection away (#1932); the label/link seams are repointable
 * on a faction root (#1754), so a bare hue there hits every label (#2077).
 */
export const INK_PROPS = new Set([
  'color',
  '-webkit-text-fill-color',
  'text-decoration-color',
  'caret-color',
  '--gem-ink',
  '--label-ink',
  '--link-ink',
  '--link-ink-hover',
])

/**
 * The BARE spine hue (`var(--faction-wow)`). Suffixed members are inks measured
 * against a ground (#651), so `[a-z]+` stops at the first hyphen.
 */
export const FACTION_TOKEN = /var\(\s*--faction-[a-z]+\s*\)/

/** Ink-role declarations resolving to a bare spine hue: the defect, listed. */
export function inkOffenders(html: string): string[] {
  return declarations(html)
    .filter(([property, value]) => INK_PROPS.has(property) && FACTION_TOKEN.test(value))
    .map(([property, value]) => `${property}: ${value}`)
}

/** Non-ink declarations still carrying the hue: guards against stripping it. */
export function fillUses(html: string): string[] {
  return declarations(html)
    .filter(([property, value]) => !INK_PROPS.has(property) && FACTION_TOKEN.test(value))
    .map(([property, value]) => `${property}: ${value}`)
}
