/**
 * THE REDACTION MARK MUST OUTRANK A SLOT THAT NAMES ITS OWN INK (#2646).
 *
 * An inline `color` outranks the `.redacted` stylesheet rule, so the rule
 * carries `!important` (owner ruling, as `.control-off`, #2478).
 *
 * Read from source, not rendered: static markup never resolves which wins, and
 * `e2e/contrastScan.ts` skips redacted nodes. So this pins the pairing — while
 * any mount declares an inline ink, the rule must keep `!important`.
 */

import { describe, expect, it } from 'vitest'

import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'
import { stripComments } from '../utils/__tests__/cssVars'
import { readIndexCss } from '../test/indexCss'

const CSS = stripComments(readIndexCss())

/** The class token as a className string writes it — never `data-redacted`. */
const CLASS_TOKEN = /(?<![-\w])redacted(?![-\w])/

/** A `color:` in a style object. Not `backgroundColor`, not `--x-ink`. */
const INLINE_INK = /(?<![-\w])color\s*:/

/** The body of the one rule whose selector is `.redacted, .redacted *`. */
const redactionRule = (): string => {
  const at = CSS.indexOf('.redacted,')
  expect(at, 'the `.redacted, .redacted *` rule is gone from index.css').toBeGreaterThan(-1)
  return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at))
}

/** String literals carrying the class token (lookarounds exclude `data-redacted`). */
const classTokenSites = (source: string): number[] =>
  [...source.matchAll(/(['"`])([^'"`]*)\1/g)]
    .filter(([, , body]) => CLASS_TOKEN.test(body))
    .map((match) => match.index)

/**
 * The top-level component enclosing `at` (to the next column-one `}`). Scoped
 * by component, not file: `DesktopPlayers.tsx` has unrelated inline inks.
 */
const enclosingComponent = (source: string, at: number): string => {
  const starts = [...source.slice(0, at).matchAll(/\n(?=(?:export )?(?:default )?(?:function|const) )/g)]
  const from = starts.length > 0 ? starts[starts.length - 1].index : 0
  const closed = source.indexOf('\n}', at)
  return source.slice(from, closed === -1 ? source.length : closed)
}

const mounts = (): { path: string; inlineInk: boolean }[] =>
  sourceFiles()
    .map((path) => ({ path: toRelative(path), source: readStripped(path) }))
    .filter(({ source }) => classTokenSites(source).length > 0)
    .map(({ path, source }) => ({
      path,
      inlineInk: classTokenSites(source).some((at) =>
        INLINE_INK.test(enclosingComponent(source, at)),
      ),
    }))

describe('the redaction mark reaches a slot that declares its own ink (#2646)', () => {
  it('paints `transparent !important`, on the root and on the subtree', () => {
    expect(redactionRule().replace(/\s+/g, ' ').trim()).toBe('color: transparent !important;')
    expect(CSS).toContain('.redacted,\n.redacted * {')
  })

  it('covers every mount there is, and says which of them needs the flag', () => {
    // `true` makes the `!important` load-bearing. A new entry: check its slots
    // first. All `false`: the flag stopped earning its keep — a decision, not a tidy-up.
    expect(Object.fromEntries(mounts().map(({ path, inlineInk }) => [path, inlineInk]))).toEqual({
      'components/selectCard/DefaultSelectCard.tsx': true,
      'pages/players/DesktopPlayers.tsx': false,
      'pages/players/MobilePlayers.tsx': false,
    })
  })

  it('leaves the selection reveal alone — a pseudo-element has its own cascade', () => {
    // Selecting reveals `[REDACTED]` inverted (ADR-0082); importance isn't
    // inherited into `::selection`, so these must stay unforced.
    for (const selector of ['.redacted ::selection', '.redacted::selection']) {
      const at = CSS.indexOf(selector)
      expect(at, selector).toBeGreaterThan(-1)
      expect(CSS.slice(at, CSS.indexOf('}', at))).not.toContain('!important')
    }
  })
})
