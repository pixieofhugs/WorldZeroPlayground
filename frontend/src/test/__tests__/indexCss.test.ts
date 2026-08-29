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
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { stripComments } from '../../utils/__tests__/cssVars'
import { INDEX_CSS_MAP, indexCssParts, readIndexCss } from '../indexCss'

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
    const css = readIndexCss()
    for (const landmark of [
      '@tailwind base;',
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
    const onDisk = readdirSync(CSS_DIR).filter((name) => name.endsWith('.css')).sort()
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
