/**
 * The seam: the whole `/factions/:slug` PAGE, counting one string (#2137).
 *
 * The duplication this pins could not be seen from either half. The hero drew
 * `factionDescription(slug)` as a blob and every `*FactionBody` called
 * `factionDescription(slug)` again and split it into paragraphs, so a hero test
 * and a body test both passed while the page said the same sentence twice. The
 * assertion therefore has to be made where both halves are mounted together —
 * this file renders the page and counts occurrences.
 *
 * BOTH BRANCHES are walked. `albescent` claims no `factionHero`, so it takes
 * the shared `PageTitle` + description chrome instead, and its body is
 * `DefaultFactionBody`, which draws NO description — so the fall-through branch
 * gets its one and only copy from that chrome and the placeholder card there
 * must stay. Deleting it to match the hero deletion would take the description
 * to zero for every faction without a hero, which is why this case asserts
 * exactly one rather than none.
 *
 * `useFactionDetail` is mocked for the reason the responsive suite gives: it is
 * effect-driven and effects never run under `renderToStaticMarkup`. The state
 * it returns is the contract the page consumes either way.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import { factionDescription } from '../../../utils/factions'

const mocks = vi.hoisted(() => ({
  state: undefined as unknown as FactionDetailState,
}))

vi.mock('../useFactionDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useFactionDetail')>()),
  useFactionDetail: () => mocks.state,
}))

// Loaded after the mock, so the page picks it up.
const FactionDetail = (await import('../../FactionDetail')).default

/** Every faction with a bespoke hero, then the one that falls through. */
const WITH_HERO = [
  'coven',
  'ephemerists',
  'everymen',
  'singularity',
  'snide',
  'ua',
  'wow',
] as const
const WITHOUT_HERO = 'albescent'

const membership: Membership = {
  state: 'ineligible',
  currentFactionSlug: null,
  join: async () => {},
  joining: false,
  joinError: null,
}

function stateFor(slug: string): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
    membership,
  }
}

/** `renderToStaticMarkup` escapes `& < > " '`; undo that so copy matches plainly. */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function pageText(slug: string): string {
  mocks.state = stateFor(slug)
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <FactionDetail slug={slug} />
    </MemoryRouter>,
  )
  return decode(html.replace(/<[^>]*>/g, ''))
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

/**
 * The catalog blurb, as the body would draw it. Every description is one
 * paragraph today, but the bodies split on blank lines, so the FIRST paragraph
 * is the fragment guaranteed to be drawn whole by both halves — the hero's blob
 * contains it verbatim, and the body's first paragraph is exactly it.
 */
function firstParagraph(slug: string): string {
  return factionDescription(slug).split(/\n\s*\n/)[0].trim()
}

describe('a faction page says its description exactly once (#2137)', () => {
  for (const slug of WITH_HERO) {
    it(`${slug} draws the blurb once, in the body and not the hero`, () => {
      const blurb = firstParagraph(slug)
      expect(blurb.length, `${slug} has a catalog blurb to count`).toBeGreaterThan(20)
      expect(occurrences(pageText(slug), blurb)).toBe(1)
    })
  }

  it(`${WITHOUT_HERO} keeps its one copy in the no-hero chrome`, () => {
    const blurb = firstParagraph(WITHOUT_HERO)
    expect(blurb.length, 'albescent has a catalog blurb to count').toBeGreaterThan(20)
    expect(occurrences(pageText(WITHOUT_HERO), blurb)).toBe(1)
  })
})
