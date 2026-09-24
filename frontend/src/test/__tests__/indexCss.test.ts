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
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { stripComments } from '../../utils/__tests__/cssVars'
import { INDEX_CSS_MAP, indexCssParts, readIndexCss } from '../indexCss'
import { sourceFiles } from '../sourceScan'

const CSS_DIR = join(INDEX_CSS_MAP, '..', 'css')
const MAP = readFileSync(INDEX_CSS_MAP, 'utf8')

describe('the assembled stylesheet', () => {
  it('is the whole sheet, so no guard can pass by reading an import map', () => {
    // The sheet is ~578 KB. The floor is not a measurement, it is the distance
    // below which something has gone wrong — eleven `@import` lines are 400 B.
    expect(readIndexCss().length).toBeGreaterThan(400_000)
  })

  it('still declares the token dictionary the contrast guards resolve against', () => {
    // ~1,070 today. A sheet that assembled only half its parts would still be
    // 400 KB and still contain every landmark below, and this is what catches it.
    const declarations = readIndexCss().match(/^\s*--[a-z0-9-]+\s*:/gm) ?? []
    expect(declarations.length).toBeGreaterThan(900)
  })

  it('still contains the landmarks the guards actually look for', () => {
    // COMMENTS STRIPPED FIRST, always. Every landmark here is a thing the sheet
    // must DO, and prose about it satisfies a substring search just as well as
    // the real declaration — so a guard read over comment-inclusive text can be
    // held up by the comment that documents it. This file's whole job is to
    // stop a check passing on something that is not there.
    const css = stripComments(readIndexCss())
    for (const landmark of [
      // v4's single entry directive (#2918), which replaced `@tailwind base;`
      // / `components;` / `utilities;`. It is the one line that pulls in
      // preflight, the layer declarations and the utility engine, so a sheet
      // missing it is a sheet with no Tailwind in it at all — exactly the
      // "passes by finding nothing" failure this file exists to prevent.
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
    // v4's preflight defaults `border-color` to `currentColor`; v3's was
    // `#e5e7eb`. 34 `border-2`, 5 bare `border`, 3 `border-b-2` and 1
    // `border-l-2` name a WIDTH and no colour, so deleting the compat block in
    // 00-prelude.css repaints every one of them to the element's text colour —
    // across nine faction kits, in both themes, with the build green and no
    // other test saying a word. This is that word.
    //
    // Read over comment-STRIPPED text and pinned to the SELECTOR LIST, not just
    // the byte. Counting `#e5e7eb` in raw source meant a comment explaining the
    // hex could satisfy this guard on its own, and a second comment mentioning
    // it could break a build that was perfectly correct — a check that both
    // lies and flaps. The selector list matters as much as the colour: drop
    // `::before`/`::after` and every decorative pseudo-element loses the
    // hairline while the plain elements keep theirs.
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
    // v3's preflight carried `button,[role="button"]{cursor:pointer}`; v4 drops
    // it for the browser default, which is an arrow. Only `.btn-primary`,
    // `.btn-outline`, `.chip`, one `cursor-pointer` utility and the filter-bar
    // family set it by hand, so without this block most of the app's buttons
    // stop looking clickable — on every page, in both themes, with nothing red.
    const css = stripComments(readIndexCss())
    const rule = css.match(/([^{}]*)\{[^{}]*cursor:\s*pointer[^{}]*\}/)
    expect(rule, 'the pointer-cursor compat block is gone from the sheet').not.toBeNull()
    // `:not(:disabled)` is deliberate: a disabled button promises no press.
    expect(rule![1]).toContain('button:not(:disabled)')
    expect(rule![1]).toContain("[role='button']:not(:disabled)")
  })

  it('pins every repo token whose NAME is one of Tailwind v4 theme keys (#2918)', () => {
    // THE FAILURE THIS EXISTS FOR HAS ALREADY HAPPENED ONCE. v3 baked its scale
    // into the utility (`.text-sm{font-size:.875rem}`); v4 emits
    // `.text-sm{font-size:var(--text-sm)}` and reads whatever `--text-sm`
    // resolves to. `03-faction-chrome-1.css` declares `--text-xs: 8px` through
    // `--text-xl: 14px` — the LABEL tier — unlayered, which outranks Tailwind's
    // own `@layer theme` copy. So five size utilities silently repointed at a
    // scale half their size, and every check in CI stayed green: the class set
    // was identical, because the collision is in what a class RESOLVES to.
    //
    // The defence is to pin the colliding name in `@theme inline`, where the
    // value substitutes into the utility as a literal and no variable is read.
    // This asserts that every such collision IS pinned, so the next one — a
    // `--text-2xl`, a `--radius-xs`, a `--spacing` — goes red on the commit
    // that introduces it rather than in a browser weeks later.
    //
    // Read from Tailwind's own `theme.css` rather than a list kept here, so the
    // set cannot rot against an upgrade that adds a namespace.
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
    const themeBlock = prelude.match(/@theme\s+inline\s*\{([^{}]*)\}/)
    expect(themeBlock, '`@theme inline` block is gone from 00-prelude.css').not.toBeNull()
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
})
