/**
 * The seam: the vertical gap between the S.N.I.D.E. wordmark's plate and the
 * subhead under it (#2495).
 *
 * The wordmark's censor plate (#2173) is a `background` on an INLINE span, and
 * an inline box's background covers the FONT's own content area — ascent plus
 * descent — not the line box. The h1 sets `line-height: 0.8`, so the plate
 * spills past the h1's box, top and bottom, by half the difference:
 *
 *     overhang = fontSize x (ascent + descent - lineHeight) / 2
 *
 * Anton's `hhea` gives ascent 2409 and descent -674 over a 2048 upm head, so
 * ascent + descent is 1.5054em — at 82px that is a 123.4px plate in a 65.6px
 * line box, and 28.9px of it hangs BELOW the h1. The subhead's `margin-top` was
 * `--space-md` (12px), less than half of that, so the bar landed on the
 * subhead's only line. In light the subhead's ink IS the plate (both resolve to
 * `#14110b`: `--faction-snide-note-ink` and `--faction-snide-ink`), so the line
 * read 1.00:1 and only the tail that escaped the plate's right edge — "FORTS" —
 * survived. In dark the ink flips to `#f4f1e8` and the same overlap reads fine,
 * which is why the report is light-only while the DEFECT is geometric.
 *
 * The harness is `renderToStaticMarkup` — no DOM, no layout, no font — so no
 * test here can observe the overlap. What it CAN hold is the arithmetic that
 * produces it, read off the hero's own declarations: whatever the wordmark's
 * size and leading become, the subhead's top margin must still clear the plate
 * the pair of them implies. That is the invariant #2495 broke, and it is the one
 * that re-breaks the day 82 becomes 96.
 *
 * Not covered here, and outstanding as visual QA: the rotation. The h1 carries
 * `rotate(-1.5deg)` about its own centre, so the plate's bottom-LEFT corner —
 * the one directly above the subhead's first word — dips a further
 * (columnWidth / 2) x sin(1.5deg) below the flat overhang this test measures,
 * up to ~14px on a full-width desktop column, partly offset by the subhead's own
 * `rotate(-0.4deg)`. Column width is layout; the chosen rung carries the slack.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

// Initialize the catalog so copy keys resolve to English text.
import '../../../i18n'
import { factionName } from '../../../utils/factions'
import SnideFactionHero from '../SnideFactionHero'

/**
 * Anton's content area, in ems: (hhea.ascender 2409 + |hhea.descender| 674) /
 * unitsPerEm 2048, read from `src/assets/fonts/anton-400-latin.woff2`, the file
 * this repo ships for `--faction-snide-font-impact`. It is a constant of the
 * FACE, not of the design — it moves only if the wordmark changes face, and
 * then this number moves with it.
 */
const ANTON_CONTENT_EM = (2409 + 674) / 2048

const CSS = readFileSync(fileURLToPath(new URL('../../../index.css', import.meta.url)), 'utf8')

/** Resolve a `--space-*` rung to its px number from the `:root` scale. */
function spaceToken(name: string): number {
  const match = CSS.match(new RegExp(`\\s--${name}:\\s*(\\d+(?:\\.\\d+)?)px`))
  expect(match, `${name} is declared in index.css`).not.toBeNull()
  return Number(match![1])
}

const html = renderToStaticMarkup(
  <MemoryRouter>
    <SnideFactionHero slug="snide" name={factionName('snide')} members={214} tasks={9} praxes={1489} />
  </MemoryRouter>,
)

/** The style attribute of the first tag of `kind` whose style matches `hint`. */
function styleOf(kind: string, hint: RegExp): string {
  const tags = html.match(new RegExp(`<${kind}[^>]*>`, 'g')) ?? []
  const tag = tags.find((t) => hint.test(t))
  expect(tag, `the hero draws a <${kind}> matching ${hint}`).toBeDefined()
  return tag!
}

function declaration(tag: string, prop: string): string {
  const match = tag.match(new RegExp(`${prop}:([^;"]+)`))
  expect(match, `${prop} is declared on ${tag.slice(0, 60)}`).not.toBeNull()
  return match![1].trim()
}

describe('the S.N.I.D.E. wordmark plate clears its subhead', () => {
  it('gives the subhead more top margin than the plate hangs below the h1', () => {
    const wordmark = styleOf('h1', /faction-snide-font-impact/)
    const fontSize = Number(declaration(wordmark, 'font-size').replace('px', ''))
    const leading = Number(declaration(wordmark, 'line-height'))
    expect(Number.isFinite(fontSize) && Number.isFinite(leading)).toBe(true)

    // Half the difference between the font's content area and the line box.
    const overhang = (fontSize * (ANTON_CONTENT_EM - leading)) / 2

    const subhead = styleOf('p', /faction-snide-font-cond/)
    const marginTop = declaration(subhead, 'margin').split(/\s+/)[0]
    const rung = marginTop.match(/var\(--(space-[a-z0-9]+)\)/)
    expect(rung, 'the subhead takes its clearance from the spacing scale').not.toBeNull()

    expect(
      spaceToken(rung![1]),
      `the subhead sits ${marginTop} under a plate that hangs ${overhang.toFixed(1)}px below the h1 — it is under the censor bar`,
    ).toBeGreaterThan(overhang)
  })
})
