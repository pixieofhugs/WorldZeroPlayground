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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { sourceFiles } from '../test/sourceScan'
import { readIndexCss } from '../test/indexCss'

const SRC = fileURLToPath(new URL('..', import.meta.url))
/** Every shipped `.ts`/`.tsx` under `src/`, tests included — a test fixture may
 *  not resurrect the class either, and this file names it only in prose. */
function sources(): { path: string; source: string }[] {
  return sourceFiles({ dir: SRC, includeTests: true, match: /\.tsx?$/ }).map((path) => ({
    path,
    source: readFileSync(path, 'utf8'),
  }))
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
    const css = readIndexCss()
    expect(css).not.toMatch(/^\s*\.eyebrow\s*\{/m)
  })

  it('still declares both tiers as LITERALS, which is what survives the purge', () => {
    // These live in `@layer components`, so Tailwind emits each rule only once
    // it sees the literal name in a scanned file. The sweep below is what keeps
    // them alive in the bundle now that `factionContrast.test.ts` is no longer
    // the only file quoting `.label-heading`; asserting the declarations here
    // means a rename that misses one shows up as a failure and not as a rule
    // that silently stops shipping.
    const css = readIndexCss()
    expect(css).toMatch(/^\s*\.label-heading\s*\{/m)
    expect(css).toMatch(/^\s*\.label-caption\s*\{/m)
  })
})

/**
 * #1783 — button and card-meta chrome joins the label-tier floor.
 *
 * THE SEAM IS `index.css`, because that is where the size actually lives. Every
 * `.btn-primary` / `.btn-outline` / `.card-meta` on the site takes its size from
 * one of three declarations, so a per-site test would assert 22 files' worth of
 * the same fact and still not catch the one edit that matters. This reads the
 * declaration.
 *
 * The three sat at the tier's two SMALLEST steps — buttons at `--text-sm` (9px),
 * card meta at `--text-xs` (8px) — while #1307 had already moved the tier's two
 * role classes up: `.label-heading` to `--text-md` (11px), `.label-caption` to
 * `--text-lg` (12px). All three of these rules are uppercase and letter-spaced,
 * which is the HEADING register, so `--text-md` is the step they join. Not
 * `--text-lg`: the caption is nominally larger only because it drops the casing,
 * and the reasoning is written out at `.label-caption`'s declaration.
 *
 * The guard below (#1608) is the other half and it is what makes this stick. It
 * counts the two smallest steps in the SOURCE TREE, and 19 of the sites it was
 * allow-listing were components restating one of these three class values
 * inline. Moving the class without deleting those restatements would have moved
 * nothing on screen — an inline style wins — so the two assertions are one
 * change: the declaration goes up here, the restatements come out of the
 * allow-list there.
 */
const LABEL_TIER_FLOOR = 'var(--text-md)'
const CHROME_RULES = ['.btn-primary', '.btn-outline', '.card-meta'] as const

/** The `font-size` a single-level rule declares, or undefined if it declares none. */
function declaredFontSize(css: string, selector: string): string | undefined {
  const rule = new RegExp(`^\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'm').exec(css)
  return /font-size:\s*([^;]+);/.exec(rule?.[1] ?? '')?.[1]
}

describe('button and card-meta chrome sits on the label-tier floor (#1783)', () => {
  it('declares all three at the floor, in one place, so none of them can fork', () => {
    const css = readIndexCss()
    expect(CHROME_RULES.map((selector) => [selector, declaredFontSize(css, selector)])).toEqual(
      CHROME_RULES.map((selector) => [selector, LABEL_TIER_FLOOR]),
    )
  })
})

/**
 * #1608 — the half of the tier the census above CANNOT see.
 *
 * The guard at the top counts `className` values, and that is the right
 * instrument for a class. It is the wrong one for the second population doing
 * the same job: a local `const eyebrow: CSSProperties` declared inside an
 * archetype and spread onto elements, which never names any class. 213 such
 * declarations across 99 files carried the tier's two smallest steps while
 * #1307 closed green, because a value laundered through a data structure is
 * invisible to a sweep that greps a NAME.
 *
 * So this one greps the SIZE TOKEN instead, which is the one thing every member
 * of that population has in common. It deliberately counts the raw string
 * rather than parsing a `fontSize:` property, because the shapes vary — a
 * ternary, a spread override, a plain declaration — and a parser tuned to the
 * shapes we happened to find is the same mistake one layer down.
 *
 * The allow-list is the point of the file, not an exemption from it. Each entry
 * is a site where the two steps survive for a reason that is NOT "we missed
 * it", and the reason is written next to it. Adding a row here should feel like
 * an argument you have to make.
 */
const SMALLEST_STEPS = /var\(--text-(?:sm|xs)\)/g

/** file → how many hits are there on purpose, and why. */
const ALLOWED: Record<string, { readonly hits: number; readonly why: string }> = {
  'pages/praxisDetail/shared.tsx': {
    hits: 2,
    why:
      'The report card\'s notice body, twice, under a --text-base title — raising ' +
      'it alone would invert the pair. Content tier, not the label tier, so it is ' +
      'not what #1783 moved. The fourteen button restatements above it are gone.',
  },
  'components/duel/shared.tsx': {
    hits: 1,
    why:
      'Prose only. It records what #769 FIXED — rail wrappers that used to force ' +
      'this size onto the slots inheriting from them. The two seal-button ' +
      'restatements it also used to describe went with #1783.',
  },
  'components/collab/CollabSuccess.tsx': {
    hits: 1,
    why:
      'One paragraph of body copy — content, not a label, so the label tier is ' +
      'not where its size comes from. Its `.btn-primary` restatement is gone.',
  },
  'components/praxisCard/desktop/EphemeristsPraxisCard.tsx': {
    hits: 1,
    why:
      'The glyph strip alternates two sizes as ornament. It is drawing, not ' +
      'label text, and the sizes are a rhythm rather than a tier.',
  },
  'components/praxisCard/__tests__/cardChrome.test.tsx': {
    hits: 1,
    why: 'A NEGATIVE assertion — it exists to prove the token is absent.',
  },
  'components/vote/EphemeristsVote.tsx': {
    hits: 1,
    why:
      'The seven planetary metals orbiting rank 5 (#2142) — twelve astro glyphs ' +
      'at 9px, `aria-hidden`, which is the size the owner specified. They are ' +
      'the DRAWING that six 3px gold dots used to be: ornament struck around a ' +
      'disc, never read, and the disc\'s own aria-label carries the meaning. ' +
      'The same argument as the Ephemerists praxis card\'s glyph strip above.',
  },
  'components/vote/__tests__/ephemeristsVote.test.tsx': {
    hits: 1,
    why:
      'Pins the row above: that the planets are a TOKEN at all. The alternative ' +
      'to `var(--text-sm)` on an ornament this small is a raw `9`, which the ' +
      'no-raw-style-values ratchet would take instead — so the assertion is what ' +
      'keeps the exemption from becoming a raw value later.',
  },
}

describe('the label tier left its two smallest steps, objects included (#1608)', () => {
  it('names --text-sm/--text-xs only where a reason is written down', () => {
    const here = fileURLToPath(import.meta.url)
    const carrying = sources()
      .filter(({ path }) => path !== here)
      .map(({ path, source }) => ({
        file: path.slice(SRC.length).replace(/\\/g, '/'),
        hits: source.match(SMALLEST_STEPS)?.length ?? 0,
      }))
      .filter(({ hits }) => hits > 0)

    const unexplained = carrying.filter(({ file, hits }) => ALLOWED[file]?.hits !== hits)
    expect(unexplained).toEqual([])
  })
})
