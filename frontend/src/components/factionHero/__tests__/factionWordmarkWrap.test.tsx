/**
 * The seam: the `<h1>` wordmark every faction-page hero renders `name` into
 * (#2000).
 *
 * A faction name is a MARK, not copy. Four of the seven heroes set
 * `overflow-wrap: anywhere` on that h1, which licenses a break at any
 * character — so "Everymen", the only single-word name long enough to outgrow
 * its track, printed as "EVER / YMEN" on a phone. The rule is what is wrong,
 * not the name: the same declaration sits on Coven, UA and WOW, and would fire
 * there the day one of those names grew or a webfont fell back to a wider face.
 *
 * The harness is `renderToStaticMarkup` — no DOM, no layout — so no test here
 * can observe a line break. What it CAN hold is the declaration that permits
 * one, which is the actual defect: assert no hero's wordmark ships a
 * break-anywhere (or break-all) wrap. Whether the name then FITS is layout, and
 * is visual QA at 340px; the Everymen case below pins the two properties that
 * buy the fit so a later edit cannot quietly take them back.
 *
 * Names are resolved through i18n rather than hardcoded — the wrapping rule
 * must hold for whatever the catalog says a faction is called.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { describe, it, expect } from 'vitest'

// Initialize the catalog so copy keys resolve to English text.
import '../../../i18n'
import { factionName } from '../../../utils/factions'
import type { FactionHeroProps } from '../../../pages/FactionDetail'
import CovenFactionHero from '../CovenFactionHero'
import EphemeristsFactionHero from '../EphemeristsFactionHero'
import EverymenFactionHero from '../EverymenFactionHero'
import SingularityFactionHero from '../SingularityFactionHero'
import SnideFactionHero from '../SnideFactionHero'
import UaFactionHero from '../UaFactionHero'
import WowFactionHero from '../WowFactionHero'

const HEROES: ReadonlyArray<[slug: string, Hero: ComponentType<FactionHeroProps>]> = [
  ['coven', CovenFactionHero],
  ['ephemerists', EphemeristsFactionHero],
  ['everymen', EverymenFactionHero],
  ['singularity', SingularityFactionHero],
  ['snide', SnideFactionHero],
  ['ua', UaFactionHero],
  ['wow', WowFactionHero],
]

const routed = (el: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

const render = (Hero: ComponentType<FactionHeroProps>, slug: string) =>
  routed(
    <Hero
      name={factionName(slug)}
      description="Reliable hands who do the work in front of them."
      members={214}
      tasks={9}
      praxes={1489}
    />,
  )

/** The wordmark is the only h1 each hero draws. */
function wordmarkTag(html: string): string {
  const open = html.indexOf('<h1')
  expect(open, 'the hero draws an h1 wordmark').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('>', open) + 1)
}

describe('a faction wordmark never breaks mid-word', () => {
  it.each(HEROES)('%s hero', (slug, Hero) => {
    const tag = wordmarkTag(render(Hero, slug))
    expect(tag, 'wordmark must not license a break at any character').not.toMatch(
      /overflow-wrap:\s*(anywhere|break-word)/,
    )
    expect(tag, 'wordmark must not license a break at any character').not.toMatch(
      /word-break:\s*break-all/,
    )
  })

  /**
   * Everymen is the case the issue was filed on, and the one where dropping the
   * break-anywhere rule is not enough on its own: its cog seal is an inline
   * flex sibling of the wordmark column, and with `min-width: 0` that column
   * collapsed to ~75px inside a 340px phone. Both halves of the fit are pinned
   * here because either one alone re-opens #2000 — a track with no floor, or a
   * 76px mark in a 222px track.
   */
  it('gives the Everymen wordmark a track it fits in', () => {
    const html = render(EverymenFactionHero, 'everymen')
    // The identity column is the only div carrying the 300px floor; the OUTER
    // row already wraps, so a bare `toContain('flex-wrap:wrap')` would pass on
    // main. Read the declaration off that column specifically.
    const column = html.slice(html.indexOf('min-width:300px'))
    expect(
      column.slice(0, column.indexOf('>')),
      'the seal/wordmark row wraps so the seal stacks above the name',
    ).toContain('flex-wrap:wrap')
    expect(html, 'the wordmark column keeps a real minimum track').toContain(
      'min-width:min(240px, 100%)',
    )
    expect(wordmarkTag(html), 'the mark scales with the viewport instead of breaking').toMatch(
      /font-size:min\(76px, [\d.]+vw\)/,
    )
  })
})
