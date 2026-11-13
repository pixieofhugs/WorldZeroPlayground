/**
 * The S.N.I.D.E. subhead clears the wordmark's plate (#2495). The plate is an
 * inline background covering the font's full content area, so it hangs below
 * the 0.8-leading h1 by
 *
 *     overhang = fontSize x (ascent + descent - lineHeight) / 2
 *
 * In light the subhead ink equals the plate, so overlap erases it. Asserted from
 * the hero's own declarations, so resizing the wordmark moves the floor. The
 * h1's rotation adds up to ~14px more; not covered, the rung carries the slack.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import { factionName } from '../../../utils/factions'
import SnideFactionHero from '../SnideFactionHero'
import { readIndexCss } from '../../../test/indexCss'

/** hhea (878 + 210) / 1000 upm from `archivo-black-400-latin.woff2`; a face constant. */
const ARCHIVO_BLACK_CONTENT_EM = (878 + 210) / 1000

const CSS = readIndexCss()

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
    const wordmark = styleOf('h1', /faction-snide-font-black/)
    // `min(82px, <fit>)`: the overhang is worst at the cap, so the cap is the size.
    const fontSize = Number(declaration(wordmark, 'font-size').match(/(\d+)px/)![1])
    const leading = Number(declaration(wordmark, 'line-height'))
    expect(Number.isFinite(fontSize) && Number.isFinite(leading)).toBe(true)

    const overhang = (fontSize * (ARCHIVO_BLACK_CONTENT_EM - leading)) / 2

    const subhead = styleOf('p', /faction-snide-font-marker/)
    const marginTop = declaration(subhead, 'margin').split(/\s+/)[0]
    const rung = marginTop.match(/var\(--(space-[a-z0-9]+)\)/)
    expect(rung, 'the subhead takes its clearance from the spacing scale').not.toBeNull()

    expect(
      spaceToken(rung![1]),
      `the subhead sits ${marginTop} under a plate that hangs ${overhang.toFixed(1)}px below the h1 — it is under the censor bar`,
    ).toBeGreaterThan(overhang)
  })
})
