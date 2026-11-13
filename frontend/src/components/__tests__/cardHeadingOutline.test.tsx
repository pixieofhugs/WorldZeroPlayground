/**
 * #1950 — a card's title may not skip a heading level under a lone page `<h1>`.
 * Asserted as "no skip", not "is h2", so a second heading inside a skin is caught too.
 * The fix lives in the card, not the page: fourteen surfaces have no `<h2>` above cards.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
// `useTheme` throws outside its provider (#701); `CovenVote` reads it (#2020).
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

/** Each jump of more than one level, as `"h1 → h3"`. */
function skippedLevels(levels: number[]): string[] {
  return levels.flatMap((level, index) =>
    index > 0 && level - levels[index - 1] > 1
      ? [`h${levels[index - 1]} → h${level}`]
      : [],
  )
}

/** The least generous well-formed surface: an `<h1>` and the card. Passing here passes everywhere. */
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
    // The only feed type with its own heading (#1192 decision 6).
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
