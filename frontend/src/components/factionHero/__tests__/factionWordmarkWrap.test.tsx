/**
 * The hero `<h1>` wordmark never breaks mid-word (#2000, "EVER / YMEN"). The
 * frame pins the rule (#2997); `heroFrameSlots` covers the population. Static
 * render sees declarations, not line breaks, so the per-kit FIT properties are
 * pinned below.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import { factionName } from '../../../utils/factions'
import type { FactionHeroProps } from '../../../pages/FactionDetail'
import { surfaceMap } from '../../../factions'
import { HeroWordmark } from '../heroFrame'

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
 * Spelled via join(): Tailwind scans this file (comments too), and the literal
 * hyphenated break/all value would emit a utility into the blocking CSS.
 */
const FORBIDDEN = [
  /overflow-wrap:\s*(anywhere|break-word)/,
  new RegExp(`word-break:\\s*${['break', 'all'].join('-')}`),
]

function wordmarkTag(html: string): string {
  const open = html.indexOf('<h1')
  expect(open, 'the hero draws an h1 wordmark').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('>', open) + 1)
}

describe('a faction wordmark never breaks mid-word', () => {
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

  // Both halves of the fit, track floor and scaling mark; either alone reopens #2000.
  it('gives the Everymen wordmark a track it fits in', () => {
    const html = render(FACTION_HEROES.everymen, 'everymen')
    // Read off the 300px column: the outer row also wraps.
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

  // #2222: `cqw`, not `vw` (the track isn't a viewport fraction). Container and
  // cap are both pinned; either alone reopens it.
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
