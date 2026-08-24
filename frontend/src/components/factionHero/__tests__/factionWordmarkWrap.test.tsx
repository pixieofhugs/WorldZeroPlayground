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
 * break-anywhere wrap (see FORBIDDEN). Whether the name then FITS is layout, and
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
      slug={slug}
      name={factionName(slug)}
      members={214}
      tasks={9}
      praxes={1489}
    />,
  )

/**
 * The two declarations a wordmark may not carry, spelled so Tailwind's content
 * scanner cannot read them. It scans THIS FILE — comments included — for class
 * candidates, and the hyphenated spelling of word-break's break/all value is one
 * of its own utilities. Written as a plain literal anywhere in this file it
 * emits that utility into the BLOCKING stylesheet and moves the initial-load CSS
 * budget 17 B, onto its WARN line, for the sake of a test string. Hence the
 * join() below, and hence no bare occurrence in this docblock either.
 * `anywhere` and `break-word` are not utilities and are safe spelled out.
 */
const FORBIDDEN = [
  /overflow-wrap:\s*(anywhere|break-word)/,
  new RegExp(`word-break:\\s*${['break', 'all'].join('-')}`),
]

/** The wordmark is the only h1 each hero draws. */
function wordmarkTag(html: string): string {
  const open = html.indexOf('<h1')
  expect(open, 'the hero draws an h1 wordmark').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('>', open) + 1)
}

describe('a faction wordmark never breaks mid-word', () => {
  it.each(HEROES)('%s hero', (slug, Hero) => {
    const tag = wordmarkTag(render(Hero, slug))
    for (const rule of FORBIDDEN) {
      expect(tag, 'wordmark must not license a break at any character').not.toMatch(rule)
    }
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

  /**
   * Singularity is the second name long enough to trip the geometry, and the one
   * #2222 was filed on: eleven characters of a MONOSPACE face set at a flat 56px
   * is ~370px of unbreakable mark, and the hero clips its own overflow, so on a
   * phone the name printed as "Singularit" plus a sheared descender.
   *
   * The arm is `cqw` and not the `vw` the Everymen mark takes, because this
   * hero's track is not a fraction of the viewport. A fixed 240px readout column
   * sits beside it and the 320px desktop rail sits outside it, so one viewport
   * width yields three different track widths — and a `vw` arm long since capped
   * at its ceiling cannot see any of them. The two failing bands a `vw` arm
   * leaves behind are ~768-800px, and ~1024-1160px with the rail open.
   *
   * Both halves are pinned because either alone re-opens #2222: the container
   * declaration is what gives `cqw` something to resolve against (and what stops
   * the `1fr` track being floored by the mark's own min-content), and the cap is
   * what keeps the poster size on a wide screen.
   */
  it('scales the Singularity wordmark to its own column, not the viewport', () => {
    const html = render(SingularityFactionHero, 'singularity')
    expect(html, "the wordmark's column is its own inline-size container").toContain(
      'container-type:inline-size',
    )
    expect(wordmarkTag(html), 'the mark scales with its track instead of overflowing').toMatch(
      /font-size:min\(56px, [\d.]+cqw\)/,
    )
  })
})
