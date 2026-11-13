/**
 * The one guard standing behind every source-reading CSS test in the repo.
 *
 * #2891 cut `src/index.css` into `src/css/*.css`. Fifty-odd guards read that
 * sheet off disk to answer questions no render can, and after the split the
 * loud failure is the lucky one: a guard that filters the text for matching
 * rules and asserts over the survivors finds nothing, survives nothing, and
 * reports a perfect board. So the floors below are deliberately about SIZE and
 * PRESENCE — a `readIndexCss()` that ever comes back thin fails here, once,
 * instead of turning fifty suites vacuously green.
 *
 * The other half is the cascade. CSS is order-dependent, so the import order in
 * `index.css` is not documentation, it is the paint; and a `@layer` block cut
 * across two parts would be a different sheet even with every byte preserved.
 * Both are asserted here because neither is visible in a source diff.
 */
import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { stripComments } from '../../utils/__tests__/cssVars'
import { INDEX_CSS_MAP, indexCssParts, readIndexCss } from '../indexCss'
import { sourceFiles } from '../sourceScan'

const CSS_DIR = join(INDEX_CSS_MAP, '..', 'css')
const MAP = readFileSync(INDEX_CSS_MAP, 'utf8')

describe('the assembled stylesheet', () => {
  it('is the whole sheet, so no guard can pass by reading an import map', () => {
    // The sheet is ~250 KB. The floor is not a measurement, it is the distance
    // below which something has gone wrong — eleven `@import` lines are 400 B.
    expect(readIndexCss().length).toBeGreaterThan(150_000)
  })

  it('still declares the token dictionary the contrast guards resolve against', () => {
    // ~1,070 today. A half-assembled sheet can clear the size floor and every
    // landmark below; this count is what catches it.
    const declarations = readIndexCss().match(/^\s*--[a-z0-9-]+\s*:/gm) ?? []
    expect(declarations.length).toBeGreaterThan(900)
  })

  it('still contains the landmarks the guards actually look for', () => {
    // Comment-stripped first: prose about a landmark satisfies a substring search just as well.
    const css = stripComments(readIndexCss())
    for (const landmark of [
      // The one line that pulls in preflight, the layers and the utility engine.
      "@import 'tailwindcss'",
      '@layer base',
      '@layer components',
      '[data-theme="dark"]',
      '--faction-ua-card-bg',
      '--faction-coven-card-bg',
      '.alb-prism',
    ]) {
      expect(css, `${landmark} is missing from the assembled sheet`).toContain(landmark)
    }
  })

  it('still pins the border colour 43 width-only utilities inherit (#2918)', () => {
    // 43 sites name a border width and no colour; without the compat block they take the text colour.
    // Pinned to the selector list, not just the byte: drop `::before`/`::after` and pseudo-elements lose it.
    const css = stripComments(readIndexCss())
    const rule = css.match(/([^{}]*)\{[^{}]*border-color:\s*#e5e7eb[^{}]*\}/)
    expect(rule, 'the v3 border-colour compat block is gone from the sheet').not.toBeNull()
    expect(css.match(/border-color:\s*#e5e7eb/g)).toHaveLength(1)
    expect(
      rule![1]
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean),
    ).toEqual(['*', '::after', '::before', '::backdrop', '::file-selector-button'])
  })

  it('still gives 448 buttons a pointer cursor v4 stopped emitting (#2918)', () => {
    // v3's preflight set the pointer on buttons; v4 drops it and most buttons set none by hand.
    const css = stripComments(readIndexCss())
    const rule = css.match(/([^{}]*)\{[^{}]*cursor:\s*pointer[^{}]*\}/)
    expect(rule, 'the pointer-cursor compat block is gone from the sheet').not.toBeNull()
    // `:not(:disabled)` is deliberate: a disabled button promises no press.
    expect(rule![1]).toContain('button:not(:disabled)')
    expect(rule![1]).toContain("[role='button']:not(:disabled)")
  })

  it('still leaves form controls the look v3 left them (#2918)', () => {
    // v4 preflight restyles three controls v3 left alone; each is one rule in 00-prelude.css.
    const css = stripComments(readIndexCss())

    const ground = css.match(/([^{}]*)\{\s*background-color:\s*revert;?\s*\}/)
    expect(ground, 'the v3 field-ground compat rule is gone from the sheet').not.toBeNull()
    // Buttons stay transparent, as they were in v3: the exclusion is the rule.
    expect(ground![1]).toContain("input:where(:not([type='button'], [type='reset'], [type='submit']))")
    expect(ground![1]).toContain('select')
    expect(ground![1]).toContain('textarea')

    const chooser = css.match(/([^{}]*)\{[^{}]*all:\s*revert[^{}]*\}/)
    expect(chooser, 'the v3 file-chooser compat rule is gone from the sheet').not.toBeNull()
    expect(chooser![1].trim()).toBe('::file-selector-button')
    // v3 gave it the page's face and nothing else.
    expect(chooser![0]).toMatch(/font:\s*inherit/)
    // `all: revert` also reverts the `appearance: button` v4's own preflight sets, and v3 kept it.
    expect(chooser![0]).toMatch(/appearance:\s*button/)

    const search = css.match(/([^{}]*)\{[^{}]*appearance:\s*textfield[^{}]*\}/)
    expect(search, 'the v3 search-field compat rule is gone from the sheet').not.toBeNull()
    expect(search![1].trim()).toBe("[type='search']")
    expect(search![0]).toMatch(/outline-offset:\s*-2px/)
  })

  it('keeps the rail display face out of every layer, where the utility it overrides would outrank it (#2918)', () => {
    // In `@layer components` this lost to the utility in v4; an unlayered rule outranks every layer.
    const selector = '[data-rail-face] .font-display'
    const homes = indexCssParts()
      .map((path) => ({ name: basename(path), text: stripComments(readFileSync(path, 'utf8')) }))
      .filter((part) => part.text.includes(selector))
    expect(homes.map((part) => part.name), 'the rail display-face rule should exist exactly once').toHaveLength(1)

    let depth = 0
    for (const character of homes[0].text.slice(0, homes[0].text.indexOf(selector))) {
      if (character === '{') depth += 1
      else if (character === '}') depth -= 1
    }
    expect(depth, `${selector} sits inside a block in ${homes[0].name} — in a layer, a utility beats it`).toBe(0)
  })

  it('pins every repo token whose NAME is one of Tailwind v4 theme keys (#2918)', () => {
    // The repo's label tier `--text-xs`..`--text-xl` shadowed v4's scale and halved the type, with CI
    // green. Read from Tailwind's theme.css so the set cannot rot on upgrade.
    const stockTheme = readFileSync(
      join(INDEX_CSS_MAP, '..', '..', 'node_modules', 'tailwindcss', 'theme.css'),
      'utf8',
    )
    const stock = new Set(
      [...stockTheme.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1]),
    )
    // Not blind, not passing: an unresolvable or empty theme would make every
    // collision invisible and this guard vacuous.
    expect(stock.size, 'Tailwind theme.css read as empty — this guard is blind').toBeGreaterThan(100)

    const prelude = stripComments(
      readFileSync(join(CSS_DIR, '00-prelude.css'), 'utf8'),
    )
    const themeBlock = prelude.match(/@theme\s+inline\s+reference\s*\{([^{}]*)\}/)
    expect(themeBlock, '`@theme inline reference` block is gone from 00-prelude.css').not.toBeNull()
    const pinned = new Set(
      [...themeBlock![1].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
    )

    // Every part EXCEPT the prelude: the prelude's declarations are the pins.
    const unpinned = indexCssParts()
      .filter((path) => basename(path) !== '00-prelude.css')
      .flatMap((path) => {
        const text = stripComments(readFileSync(path, 'utf8'))
        return [...text.matchAll(/(--[a-z0-9-]+)\s*:/g)]
          .map((match) => match[1])
          .filter((name) => stock.has(name) && !pinned.has(name))
          .map((name) => `${basename(path)} declares ${name}`)
      })

    expect(
      [...new Set(unpinned)].sort(),
      `A token here shares its NAME with a Tailwind v4 theme key, so the matching
utility resolves to the repo's value instead of Tailwind's. Pin it in
00-prelude.css's \`@theme inline\` block with the value the utility should carry
(and leave the repo token exactly as it is), or rename the repo token.`,
    ).toEqual([])
  })

  it('leaves the shell font sheet as a literal import, the way callers saw it', () => {
    const css = readIndexCss()
    // Expanding it would drop three `@font-face` blocks into every rule count
    // in the suite and move assertions that were never about fonts.
    expect(css.match(/@import '\.\.\/fonts\.css';/g)).toHaveLength(1)
    expect(css).not.toMatch(/@font-face\s*\{/)
    // ...while the parts themselves are inlined, not left as import lines.
    expect(css).not.toContain("@import './css/")
  })
})

describe('a utility v4 kept the name of and changed the meaning of (#2918)', () => {
  it('hides a focus ring with the `-hidden` spelling, never the `-none` one', () => {
    // v4 made `outline-none` a literal `outline-style: none`, dropping the forced-colors ring v3's had.
    // Neither name is spelled in this file: Tailwind scans tests as text and would emit it.
    const removed = ['outline', 'none'].join('-')
    const written = new RegExp(`(^|[\\s"'\`:])${removed}(?![\\w-])`)
    const offenders = sourceFiles()
      .filter((path) => !/\.test\.tsx?$/.test(path))
      .filter((path) => written.test(readFileSync(path, 'utf8')))
      .map((path) => path.slice(path.indexOf('/src/') + 1))
    expect(offenders, `write the -hidden spelling instead of ${removed}`).toEqual([])
  })
})

describe('the import map', () => {
  it('carries no rule of its own, so nothing outranks the parts', () => {
    // `@import` must precede every rule. One declaration here would push all
    // eleven parts — Tailwind's output included — behind it.
    expect(stripComments(MAP)).not.toContain('{')
  })

  it('imports every part in `src/css/`, exactly once, in filename order', () => {
    // Through the shared walk, not a private one (#2887) — `src/css/` is flat,
    // and a part hidden in a subdirectory would show up here as an unimported
    // file, which is exactly the answer this assertion wants.
    const onDisk = sourceFiles({ dir: CSS_DIR, match: /\.css$/ })
      .map((path) => basename(path))
      .sort()
    expect(onDisk.length).toBeGreaterThan(1)
    // The numeric prefixes ARE the cascade: filename order must be import order,
    // or a reader sorting by name gets a different sheet than the browser paints.
    expect(indexCssParts().map((path) => basename(path))).toEqual(onDisk)
  })
})

describe('each part stands alone', () => {
  it('closes every block it opens, so no `@layer` is cut across two files', () => {
    const unbalanced = indexCssParts()
      .map((path) => {
        const text = stripComments(readFileSync(path, 'utf8'))
        let depth = 0
        let lowest = 0
        for (const character of text) {
          if (character === '{') depth += 1
          else if (character === '}') {
            depth -= 1
            lowest = Math.min(lowest, depth)
          }
        }
        return { name: basename(path), depth, lowest }
      })
      .filter((part) => part.depth !== 0 || part.lowest < 0)

    expect(
      unbalanced,
      `A part that opens a block it does not close — or closes one it never
opened — is a \`@layer\` or \`@media\` split across the seam. The concatenation
still parses, so the build stays green and the cascade quietly changes.`,
    ).toEqual([])
  })

  it('emits no custom property that is a var() of itself (#2918)', async () => {
    // A theme row that reads its own repo token is a cycle held off only by an unlayered :root.
    const { css } = await postcss([tailwindcss({ base: join(CSS_DIR, '..', '..') })]).process(
      readFileSync(INDEX_CSS_MAP, 'utf8'),
      { from: INDEX_CSS_MAP },
    )
    expect(css.length).toBeGreaterThan(100_000)
    const selfRef = [...css.matchAll(/(--[\w-]+)\s*:\s*var\(\1\)/g)].map((m) => m[1])
    expect(selfRef).toEqual([])
  })
})
