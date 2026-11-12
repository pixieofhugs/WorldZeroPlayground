/**
 * #1307 — `.eyebrow` is retired. This is the guard that says so.
 *
 * A surviving `.eyebrow` renders silently unstyled, so the seam is the source
 * tree. Only `className` values are scanned: `eyebrow` is also a prop slot, an
 * i18n key and prose. (This file is scanned too — never spell the attribute
 * next to the word in a comment.) `index.css` must also no longer declare it.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { sourceFiles } from '../test/sourceScan'
import { readIndexCss } from '../test/indexCss'

const SRC = fileURLToPath(new URL('..', import.meta.url))
/** Every `.ts`/`.tsx` under `src/`, tests included. */
function sources(): { path: string; source: string }[] {
  return sourceFiles({ dir: SRC, includeTests: true, match: /\.tsx?$/ }).map((path) => ({
    path,
    source: readFileSync(path, 'utf8'),
  }))
}

/** Every `className=` value: quoted, template, or brace-matched expression. */
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
    // `@layer components`: Tailwind emits a rule only once it sees the literal
    // name, so a rename that misses one would silently stop shipping it.
    const css = readIndexCss()
    expect(css).toMatch(/^\s*\.label-heading\s*\{/m)
    expect(css).toMatch(/^\s*\.label-caption\s*\{/m)
  })
})

/**
 * #1783 — button and card-meta chrome joins the label-tier floor, read from the
 * `index.css` declarations. `--text-md`, the heading step: these are uppercase
 * and letter-spaced (see `.label-caption`'s declaration for why not `--text-lg`).
 * The #1608 guard below keeps inline restatements, which would win, out.
 */
const LABEL_TIER_FLOOR = 'var(--text-md)'
const CHROME_RULES = ['.btn-primary', '.btn-outline', '.card-meta'] as const

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
 * #1608 — local `CSSProperties` objects name no class, so this greps the raw
 * size token (any shape: ternary, spread, plain). Each allow-list row needs a
 * written reason; adding one should be an argument you have to make.
 */
const SMALLEST_STEPS = /var\(--text-(?:sm|xs)\)/g

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
