/**
 * #1307 — `.eyebrow` is retired. This is the guard that says so.
 *
 * THE SEAM IS THE SOURCE TREE, not any rendered markup. A surviving `.eyebrow`
 * renders perfectly: the class was deleted from `index.css` by the last sweep,
 * so the site simply loses its treatment and inherits whatever the container
 * sets. Nothing throws, nothing warns, and no per-surface render test can see
 * it, because a render test asserts what a component says and not which of two
 * retired-vs-live class names it says it in. That is the same reason
 * `ephemeristsPlateSurfaces.test.tsx` greps the tree for `FlutedRule`.
 *
 * WHY THIS COUNTS `className` VALUES AND NOT THE STRING
 * ----------------------------------------------------
 * `eyebrow` is three different things in this tree and only one of them is the
 * retired class:
 *
 *   - the CSS class (retired here);
 *   - a component PROP — `praxisCard/desktop/shared.tsx` and
 *     `factionMarks/wowMobile.tsx` both take an `eyebrow` slot, which is a
 *     layout position and keeps its name;
 *   - i18n keys (`feed:factionHero.*.eyebrow`) and prose comments recording
 *     that the treatment was retired.
 *
 * A whole-file `includes('eyebrow')` therefore reports ~369 hits against 124
 * real ones, which is the same over-count that put "461 sites" in the issue
 * title. So this parses out `className` attribute values and looks only inside
 * them — the quoted form, the braces form and template literals all count; a
 * prop, a key and a comment do not. (Which is also why this file may not spell
 * the attribute out next to the word: the parser cannot tell a comment's
 * example from a real one, and the guard would then fail on itself.)
 *
 * The check on `index.css` is the other half. Without it the sweep could be
 * "finished" with the rule still declared, waiting for the next hand-rolled
 * site to reach for it — and the two-tier split (`.label-heading` /
 * `.label-caption`) would be a third option rather than the only one.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC = fileURLToPath(new URL('..', import.meta.url))
const CSS = fileURLToPath(new URL('../index.css', import.meta.url))

/** Every shipped `.ts`/`.tsx` under `src/`, tests included — a test fixture may
 *  not resurrect the class either, and this file names it only in prose. */
function sources(): { path: string; source: string }[] {
  const found: { path: string; source: string }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) {
        found.push({ path: full, source: readFileSync(full, 'utf8') })
      }
    }
  }
  walk(SRC)
  return found
}

/**
 * The text of every `className=` value in a file. Handles the three forms JSX
 * allows: a quoted string, a template literal, and a braced expression (which
 * is brace-matched rather than matched to the next `}`, since the common shape
 * here is a nested ternary or a template with `${}` in it).
 */
export function classNameValues(source: string): string[] {
  const values: string[] = []
  const attribute = /className\s*=\s*/g
  let match: RegExpExecArray | null
  while ((match = attribute.exec(source))) {
    const start = match.index + match[0].length
    const opener = source[start]
    if (opener === '"' || opener === "'" || opener === '`') {
      const end = source.indexOf(opener, start + 1)
      if (end === -1) continue
      values.push(source.slice(start + 1, end))
    } else if (opener === '{') {
      let depth = 0
      let cursor = start
      for (; cursor < source.length; cursor++) {
        if (source[cursor] === '{') depth++
        else if (source[cursor] === '}' && --depth === 0) break
      }
      values.push(source.slice(start + 1, cursor))
    }
  }
  return values
}

describe('the label tier is two classes, and `.eyebrow` is not one of them (#1307)', () => {
  it('applies `eyebrow` as a class nowhere in the tree', () => {
    const surviving = sources()
      .map(({ path, source }) => ({
        path,
        hits: classNameValues(source).filter((value) => value.includes('eyebrow')).length,
      }))
      .filter(({ hits }) => hits > 0)
    expect(surviving).toEqual([])
  })

  it('no longer declares the rule, so nothing can reach for it again', () => {
    const css = readFileSync(CSS, 'utf8')
    expect(css).not.toMatch(/^\s*\.eyebrow\s*\{/m)
  })

  it('still declares both tiers as LITERALS, which is what survives the purge', () => {
    // These live in `@layer components`, so Tailwind emits each rule only once
    // it sees the literal name in a scanned file. The sweep below is what keeps
    // them alive in the bundle now that `factionContrast.test.ts` is no longer
    // the only file quoting `.label-heading`; asserting the declarations here
    // means a rename that misses one shows up as a failure and not as a rule
    // that silently stops shipping.
    const css = readFileSync(CSS, 'utf8')
    expect(css).toMatch(/^\s*\.label-heading\s*\{/m)
    expect(css).toMatch(/^\s*\.label-caption\s*\{/m)
  })
})
