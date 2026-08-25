/**
 * #1950 — A CARD'S TITLE MAY NOT SKIP A HEADING LEVEL.
 *
 * THE SEAM: the join between a page's chrome and a card mounted on it. A card
 * is rendered by a component that cannot see the page, and the page is written
 * by someone who cannot see inside the card, so the outline they produce
 * TOGETHER is nobody's file — which is exactly how it broke. Lighthouse read a
 * Coven task card's `<h3>` on a surface whose only other heading was the page
 * `<h1>` and flagged the jump.
 *
 * THE RULE PINNED HERE: mounted under a page that carries exactly one `<h1>`
 * and nothing else, a card must add no skipped level. A card carries one
 * heading, so under a lone `<h1>` that rule has exactly one solution — the
 * card's title is an `<h2>` — and stating it as "no skip" rather than "is h2"
 * is deliberate: the property a screen reader cares about is the outline, and a
 * skin that later grows a SECOND heading inside itself is caught by the same
 * assertion without anyone editing it.
 *
 * WHY THE FIX IS THE CARD AND NOT THE PAGE. The alternative reading — cards stay
 * `<h3>` and every list surface grows an `<h2>` section heading above them — was
 * measured and rejected. Fourteen surfaces mount a card with no `<h2>` in front
 * of it (`/tasks` in both form factors, `/praxis` in both, `/updates`, the eight
 * task-detail archetypes' praxis galleries, and the Coven + Snide faction
 * bodies, whose section heads are `<div>`s), against ten that do. That fix is
 * fourteen files plus fourteen invented section strings and stays broken the
 * day a fifteenth surface mounts a card. This one is a tag swap per card family
 * and holds for every surface that will ever exist.
 *
 * The slug list is derived from `FACTION_MANIFESTS`, not typed out, so a TENTH
 * faction is covered on the day it registers rather than the day someone
 * remembers this file.
 *
 * `renderToStaticMarkup`; this repo has no jsdom. These are markup assertions.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

// Task cards read the form factor; SSR runs no effects, so it has to be stubbed
// rather than measured. Registered before the card modules are imported.
vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
// `useTheme` throws outside its provider by design (#701), and the Coven card
// mounts `CovenVote`, which reads it to pick sun or moon (#2020). Dark is what
// an unconfigured visitor gets (`DEFAULT_THEME`); the headings this file counts
// are the same under either motif.
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark' as const, toggle: () => {} }),
}))

import { FACTION_MANIFESTS, surfaceMap } from '../../factions'
import { resolveVariant } from '../../utils/factionDispatch'
import type { AdminProps } from '../praxisCard/shared'
import FeedCardEraAnnouncement from '../feed/FeedCardEraAnnouncement'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { aTask, aPraxisCard } from '../../test/fixtures'

/** `na` plus every faction that ships a manifest — the nine card skins. */
const SLUGS = ['na', ...FACTION_MANIFESTS.map((manifest) => manifest.slug)]

/** Every heading level the markup draws, in document order. */
function headingLevels(html: string): number[] {
  return [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]))
}

/**
 * Each place the outline jumps more than one level, as `"h1 → h3"`. Empty is
 * the pass; the strings are there so a failure names the jump it found.
 */
function skippedLevels(levels: number[]): string[] {
  return levels.flatMap((level, index) =>
    index > 0 && level - levels[index - 1] > 1
      ? [`h${levels[index - 1]} → h${level}`]
      : [],
  )
}

/**
 * The card on the least generous surface that still counts as well-formed: a
 * page heading and nothing between it and the card. Every real surface either
 * looks like this (`/tasks`, `/praxis`, `/updates`) or puts an `<h2>` section
 * head in the gap, which can only make the outline flatter — so a card that
 * passes here passes everywhere.
 */
function pageOutline(card: ReactElement): number[] {
  return headingLevels(
    renderToStaticMarkup(
      <MemoryRouter>
        <>
          <h1>Page</h1>
          {card}
        </>
      </MemoryRouter>,
    ),
  )
}

const NO_ADMIN: AdminProps = {
  praxis: aPraxisCard(),
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
  moderateError: null,
}

describe.each(SLUGS)('%s task card', (slug) => {
  it('titles itself one level under the page heading', () => {
    const Card = resolveVariant(surfaceMap('taskCard'), slug)
    const levels = pageOutline(
      <Card
        task={aTask({ primary_faction_slug: slug })}
        basePoints={18}
        multiplier={1}
        inProgressCount={0}
      />,
    )
    expect(levels.length, 'the card drew a heading at all').toBeGreaterThan(1)
    expect(skippedLevels(levels), 'no skipped level').toEqual([])
  })
})

describe.each(SLUGS)('%s praxis card', (slug) => {
  it('titles itself one level under the page heading', () => {
    const praxis = aPraxisCard({ task_faction_slug: slug })
    const Card = resolveVariant(surfaceMap('praxisCard'), slug)
    const levels = pageOutline(
      <Card praxis={praxis} adminProps={{ ...NO_ADMIN, praxis }} />,
    )
    expect(levels.length, 'the card drew a heading at all').toBeGreaterThan(1)
    expect(skippedLevels(levels), 'no skipped level').toEqual([])
  })
})

describe('era-announcement feed card', () => {
  it('titles itself one level under the page heading', () => {
    // The one factionless feed card, and the only feed type with a heading of
    // its own (#1192 decision 6). It rides `/updates`, whose chrome is
    // `PageTitle` — an `<h1>` and nothing else.
    const item = {
      id: 'era-1',
      type: 'era_announcement',
      created_at: '2026-01-01T00:00:00Z',
      payload: { era_name: 'Era One', era_notes: 'The bell.' },
    } as unknown as ActivityFeedItem
    const levels = pageOutline(<FeedCardEraAnnouncement item={item} />)
    expect(levels.length, 'the card drew a heading at all').toBeGreaterThan(1)
    expect(skippedLevels(levels), 'no skipped level').toEqual([])
  })
})
