/**
 * The seam: the `<h1>` wordmark every faction-page hero renders `name` into
 * (#2000).
 *
 * A faction name is a MARK, not copy. Four of the seven heroes set
 * `overflow-wrap: anywhere` on that h1, which licenses a break at any
 * character — so "Everymen", the only single-word name long enough to outgrow
 * its track, printed as "EVER / YMEN" on a phone. The rule is what was wrong,
 * not the name: the same declaration sat on Coven, UA and WOW, and would have
 * fired there the day one of those names grew or a webfont fell back to a wider
 * face.
 *
 * ONE DECLARATION, NOT SEVEN (#2997). This file used to sweep every registered
 * hero for the forbidden wrap, because there were seven `<h1>`s and each hero
 * only PROMISED, in a comment, not to set it. `heroFrame`'s `HeroWordmark`
 * renders the element now and pins the rule AFTER the kit's `style`, so the
 * promise is a declaration a kit cannot outrank — and the property is proved
 * where it is enforced rather than sampled nine times downstream of it. The
 * first case below is that proof: a kit passing the forbidden rules explicitly,
 * and losing.
 *
 * The population claim did not go away with the sweep. `heroFrameSlots` asserts
 * every registered kit's wordmark carries the frame's pinned rule, which is
 * what says all nine come through here.
 *
 * The harness is `renderToStaticMarkup` — no DOM, no layout — so no test here
 * can observe a line break. What it CAN hold is the declaration that permits
 * one. Whether the name then FITS is layout, and is visual QA at 340px; the two
 * per-kit cases below pin the properties that buy the fit so a later edit cannot
 * quietly take them back. Those stay per-kit because the fit IS per-kit: a
 * viewport arm for a full-width poster, a container arm for a fixed track.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { describe, it, expect } from 'vitest'

// Initialize the catalog so copy keys resolve to English text.
import '../../../i18n'
import { factionName } from '../../../utils/factions'
import type { FactionHeroProps } from '../../../pages/FactionDetail'
import { surfaceMap } from '../../../factions'
import { HeroWordmark } from '../heroFrame'

/**
 * Read off the manifest rather than typed (#2815). The whole-population SWEEP
 * moved to `heroFrameSlots` with the frame; what is left needs the map only to
 * reach the two kits whose FIT is asserted below by name.
 */
const FACTION_HEROES = surfaceMap('factionHero')

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
  /**
   * THE ONE DECLARATION (#2997). A kit passes both forbidden rules explicitly
   * and gets neither: the frame spreads `style` first and lands its own wrap
   * rule on top, so this is not "no kit happens to set it today" but "a kit
   * cannot set it". That is the difference between this and the seven-hero
   * sweep it replaces.
   */
  it('pins the wrap rule on the frame, over anything a kit passes', () => {
    const tag = wordmarkTag(
      routed(
        <HeroWordmark style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
          {factionName('everymen')}
        </HeroWordmark>,
      ),
    )
    for (const rule of FORBIDDEN) {
      expect(tag, 'the frame outranks a kit that licenses a break').not.toMatch(rule)
    }
    expect(tag, 'and says so positively, rather than by omission').toContain(
      'overflow-wrap:normal',
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
    const html = render(FACTION_HEROES.everymen, 'everymen')
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
    const html = render(FACTION_HEROES.singularity, 'singularity')
    expect(html, "the wordmark's column is its own inline-size container").toContain(
      'container-type:inline-size',
    )
    expect(wordmarkTag(html), 'the mark scales with its track instead of overflowing').toMatch(
      /font-size:min\(56px, [\d.]+cqw\)/,
    )
  })
})
