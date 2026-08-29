/**
 * THE REDACTION MARK MUST OUTRANK A SLOT THAT NAMES ITS OWN INK (#2646).
 *
 * `.redacted, .redacted * { color: transparent }` is a stylesheet rule, and a
 * slot that declares `color` in the STYLE ATTRIBUTE outranks it by
 * specification — as surely as an inline value outranks an inherited one. The
 * directory tile draws five such slots, so before this guard the mark painted
 * the one slot that inherits (the display name) and lost to the other four:
 * four visible `[REDACTED]` markers and one blank gap, which reads as a
 * rendering bug rather than as a device. The owner ruled shape 1 — `!important`
 * on the rule, matching `.control-off`'s precedent (#2478, the same wall).
 *
 * ── THE SEAM, AND WHY IT IS THIS ONE ────────────────────────────────────────
 *
 * The seam is THE SHEET AND THE MOUNTS, READ FROM SOURCE — the `.redacted` rule
 * as authored in `index.css`, against every component that puts that class on
 * an element.
 *
 * It is not a render, and that is forced rather than lazy: the harness runs
 * `renderToStaticMarkup` in node, which records the class and the style
 * attribute side by side and never resolves which of them wins. The exact
 * question this issue turns on is the one a static render cannot answer, so a
 * mounted test would go green on the broken sheet and on the fixed one alike. A
 * computed-style assertion would answer it and needs a real layout engine;
 * ADR-0082's own e2e path is closed too, because `e2e/contrastScan.ts` skips
 * `data-redacted="true"` by design.
 *
 * So the guard asserts the PAIRING instead, which is the thing that can rot:
 * for as long as any mount declares its ink inline, the rule must carry the
 * `!important` that reaches it. Delete the `!important` as a tidy-up and this
 * goes red naming the mounts it just stopped covering; add a sixth inline slot
 * and it stays green, because `!important` already covers it.
 *
 * `sourceFiles()` skips `__tests__` and `readStripped` drops comments, so the
 * inventory below reads draw calls only — the prose in `DefaultSelectCard` and
 * in `index.css` names `.redacted` a dozen times and none of it counts.
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

/**
 * Where a string literal carries the class token: `"redacted"` on its own, or
 * `' redacted'` appended inside a template. The lookarounds are what keep
 * `getAttribute("data-redacted")` and the `[REDACTED]` marker out of it.
 */
const classTokenSites = (source: string): number[] =>
  [...source.matchAll(/(['"`])([^'"`]*)\1/g)]
    .filter(([, , body]) => CLASS_TOKEN.test(body))
    .map((match) => match.index)

/**
 * The top-level component that encloses `at` — from its own declaration to the
 * next `}` in column one.
 *
 * Scoping to the component and not to the file is the whole difference between
 * a useful answer and a misleading one here: `DesktopPlayers.tsx` is a page with
 * a dozen inline inks on surfaces that have nothing to do with the mark, and
 * only `FactionLaneName` wears `.redacted`.
 */
const enclosingComponent = (source: string, at: number): string => {
  const starts = [...source.slice(0, at).matchAll(/\n(?=(?:export )?(?:default )?(?:function|const) )/g)]
  const from = starts.length > 0 ? starts[starts.length - 1].index : 0
  const closed = source.indexOf('\n}', at)
  return source.slice(from, closed === -1 ? source.length : closed)
}

/** Every shipped mount of the mark: its file, and whether it declares its own ink. */
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
    // Both arms in one rule, so both take the flag. The descendant arm plus the
    // flag is what lets ONE mark redact a whole surface — the arm alone catches
    // the subtree in the cascade and still loses to it in the style attribute.
    expect(redactionRule().replace(/\s+/g, ' ').trim()).toBe('color: transparent !important;')
    expect(CSS).toContain('.redacted,\n.redacted * {')
  })

  it('covers every mount there is, and says which of them needs the flag', () => {
    // Three mounts: the directory tile, and the players-page faction lane on
    // each form factor. `true` is what makes the `!important` above load-bearing
    // rather than decorative; `false` is the issue body's feared blast radius,
    // asserted absent rather than assumed — the lane declares `fontSize` and
    // nothing else, so `.redacted` already won there and the flag moves nothing.
    //
    // A fourth entry means a surface started wearing the mark: check its slots
    // before editing this list. An entry flipping to `false` means a mount moved
    // onto classes (shape 2 of the issue) — the flag has stopped earning its
    // keep on that one, which is a decision, not a tidy-up.
    expect(Object.fromEntries(mounts().map(({ path, inlineInk }) => [path, inlineInk]))).toEqual({
      'components/selectCard/DefaultSelectCard.tsx': true,
      'pages/players/DesktopPlayers.tsx': false,
      'pages/players/MobilePlayers.tsx': false,
    })
  })

  it('leaves the selection reveal alone — a pseudo-element has its own cascade', () => {
    // Drag across a redacted tile and `[REDACTED]` lifts out inverted; that
    // device is ADR-0082's whole aesthetic. `color: transparent !important` on
    // the element cannot reach it, because importance is not inherited and
    // `.redacted *` does not match `*::selection`. Forcing these two would be
    // the fix eating the thing it exists to protect.
    for (const selector of ['.redacted ::selection', '.redacted::selection']) {
      const at = CSS.indexOf(selector)
      expect(at, selector).toBeGreaterThan(-1)
      expect(CSS.slice(at, CSS.indexOf('}', at))).not.toContain('!important')
    }
  })
})
