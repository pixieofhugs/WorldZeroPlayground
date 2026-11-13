/**
 * The whole `/factions/:slug` PAGE says its description once (#2137): a hero
 * test and a body test each passed while the page said it twice. Walks the
 * bespoke heroes and the fall-through (#2504). `useFactionDetail` is mocked:
 * effects never run under `renderToStaticMarkup`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
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

const FactionDetail = (await import('../../FactionDetail')).default

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
  state: 'none',
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
    onSignup: undefined,
    signupMsg: null,
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

/** Bodies split on blank lines, so the first paragraph is drawn whole by both. */
function firstParagraph(slug: string): string {
  return factionDescription(slug).split(/\n\s*\n/)[0].trim()
}

/**
 * Stops the count passing vacuously on a too-short blurb. Some descriptions
 * are still the owner's deliberate `PLACEHOLDER` (#2332), a token nothing else
 * on the page spells.
 */
const BLURB_FLOOR = 'PLACEHOLDER'.length

describe('a faction page says its description exactly once (#2137)', () => {
  for (const slug of WITH_HERO) {
    it(`${slug} draws the blurb once, in the body and not the hero`, () => {
      const blurb = firstParagraph(slug)
      expect(
        blurb.length,
        `${slug} has a catalog blurb to count`,
      ).toBeGreaterThanOrEqual(BLURB_FLOOR)
      expect(occurrences(pageText(slug), blurb)).toBe(1)
    })
  }

  it(`${WITHOUT_HERO} keeps its one copy in the no-hero chrome`, () => {
    const blurb = firstParagraph(WITHOUT_HERO)
    expect(
      blurb.length,
      'albescent has a catalog blurb to count',
    ).toBeGreaterThanOrEqual(BLURB_FLOOR)
    expect(occurrences(pageText(WITHOUT_HERO), blurb)).toBe(1)
  })
})
