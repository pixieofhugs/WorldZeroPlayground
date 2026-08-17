/**
 * The rendered-ink seam, shared by every guard that asks "does this surface
 * paint a faction FILL as type?" (#1932, extended by #2077).
 *
 * WHY A MODULE AND NOT A COPY. `playersFactionInk.test.tsx` grew these three
 * pieces for one page, and #2077 needed the identical question asked of the
 * faction cards, the two invitation rows, the task card's metatask chip and all
 * eight task-detail bylines. A second copy that must be kept in step with the
 * first is the failure this repo has already paid for twice (§3, #1269 on the
 * faction mirror table, #1661 on the restated spectrum) — and here the drift
 * would be silent in the worst possible way: a guard reading a stale
 * `INK_PROPS` reports green over exactly the property nobody added to it.
 *
 * WHY IT IS THE COMPANION OF THE LINT RULE AND NOT ITS DUPLICATE.
 * `local/no-faction-hue-as-ink` reads source and stops the shape at the point of
 * writing; it can only see a value it can trace inside one module, so a hue
 * arriving as a PROP, out of a `surfaceMap` dispatch or through a shared helper
 * is past it by construction. This reads the emitted `style=` attribute, so it
 * does not care how the value got there. Neither subsumes the other: the rule
 * catches the file the render never mounts, and this catches the route the rule
 * cannot follow.
 */

/**
 * Every declaration in every inline `style` attribute of the rendered markup,
 * as `[property, value]`.
 *
 * Split on `;` then on the FIRST `:`, which is what keeps `color-mix(` and
 * `linear-gradient(` out of the answer: they carry the substring `color` and no
 * colon after it, so a naive `/color:/` scan reads a faction wash as an ink. The
 * wash is a fill and is meant to stay.
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
 * Properties that end up as an ink.
 *
 * `--gem-ink` is here because it IS `.level-gem-number`'s `color`, one
 * indirection away in index.css — and the indirection is exactly what hid #1932.
 * `LevelGem`'s own docstring says the gem is "outlined rather than filled … so
 * the numeral sits on the surface the gem lands on … without per-faction
 * contrast tuning", and then handed the numeral the faction hue, which is the
 * per-faction tuning the outline was supposed to make unnecessary. A visitor
 * that only knows the CSS property name `color` never reaches it.
 *
 * `--label-ink` and the two link seams join it for #2077's reason: repointing a
 * seam on a faction root is the sanctioned move (#1754), and pointing one at a
 * bare hue is the defect wearing the fix's clothes — it lands on every label the
 * frame holds at once.
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
 * The BARE spine hue — `var(--faction-wow)`, never `var(--faction-wow-card-text)`.
 *
 * The suffixed members of the family are a different claim entirely: they are
 * inks measured against a named ground, and `FactionAvatar` correctly paints its
 * monogram in `--faction-{key}-card-text` on the faction's own circle, a pairing
 * `CARD_PAIRS` has gated since #651. A regex that swept the whole prefix would
 * report that as a defect and teach the next editor to strip a measured pairing.
 * `[a-z]+` stops at the first hyphen, which is exactly the line between "this
 * hue" and "this hue's ink for a ground".
 */
export const FACTION_TOKEN = /var\(\s*--faction-[a-z]+\s*\)/

/** Ink-role declarations resolving to a bare spine hue: the defect, listed. */
export function inkOffenders(html: string): string[] {
  return declarations(html)
    .filter(([property, value]) => INK_PROPS.has(property) && FACTION_TOKEN.test(value))
    .map(([property, value]) => `${property}: ${value}`)
}

/**
 * Non-ink declarations still carrying the hue — the other half of the fix.
 *
 * Asserted alongside `inkOffenders` wherever a surface is *meant* to be loudly
 * faction-coded, because the careless sweep is not "miss one ink", it is "strip
 * the colour". Borders, washes, bars, gem strokes and glows all keep the hue.
 */
export function fillUses(html: string): string[] {
  return declarations(html)
    .filter(([property, value]) => !INK_PROPS.has(property) && FACTION_TOKEN.test(value))
    .map(([property, value]) => `${property}: ${value}`)
}
