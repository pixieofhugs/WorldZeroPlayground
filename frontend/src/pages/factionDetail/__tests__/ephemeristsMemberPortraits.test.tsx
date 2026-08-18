/**
 * #2228 — the Ephemerists faction page drew a member's INITIAL where their
 * profile photo belongs, in BOTH member mounts.
 *
 * This was never a fallback misfiring. The page's `Medallion` took a `name` and
 * nothing else, so the kit's `AuthorOctagon` had no image path to fall back
 * FROM: a member with an uploaded portrait and a member without one rendered
 * identically. `avatar_url` was already on the wire (`members` is
 * `CharacterOut[]`), so nothing but the component ever knew.
 *
 * The seam is the PAGE BODY, not the octagon: the defect was the prop the two
 * mounts declined to pass, and a leaf-level test of `AuthorOctagon` would have
 * stayed green through the whole bug. Both mounts are asserted in both
 * directions — the spotlight is `ranked[0]`, so which member lands where is
 * decided by score, and swapping the photo between them exercises each mount
 * with a portrait AND with the monogram fallback.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import EphemeristsFactionBody from '../archetypes/EphemeristsFactionBody'
import type { FactionDetailState } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'

function member(over: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'keeper',
    display_name: 'Keeper',
    avatar_url: '',
    faction_slug: 'ephemerists',
    level: 3,
    all_time_score: 100,
    ...over,
  } as unknown as CharacterOut
}

/** The top scorer takes the spotlight; everyone else is a roster row. */
const SPOTLIT = { id: 1, display_name: 'Isolde Vane', all_time_score: 900 }
const ROSTERED = { id: 2, display_name: 'Bram Quill', all_time_score: 100 }

function markup(members: CharacterOut[]): string {
  const state = {
    slug: 'ephemerists',
    loading: false,
    faction: { slug: 'ephemerists' },
    fetchError: null,
    members,
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: 'ephemerists',
    gameFactions: [],
    membership: {
      state: 'member',
      currentFactionSlug: 'ephemerists',
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsFactionBody state={state} />
    </MemoryRouter>,
  )
}

describe('a keeper with a portrait is drawn as their portrait, not their initial', () => {
  it('hangs the photo in the spotlight medallion', () => {
    const html = markup([
      member({ ...SPOTLIT, avatar_url: '/media/isolde.png' }),
      member(ROSTERED),
    ])
    expect(html).toMatch(/<img[^>]+isolde\.png/)
  })

  it('hangs the photo in the roster row', () => {
    const html = markup([
      member(SPOTLIT),
      member({ ...ROSTERED, avatar_url: '/media/bram.png' }),
    ])
    expect(html).toMatch(/<img[^>]+bram\.png/)
  })

  it('keeps the monogram for a keeper who has uploaded nothing', () => {
    // Both mounts, both empty: the initials are all that is left to draw.
    const html = markup([member(SPOTLIT), member(ROSTERED)])
    expect(html).toContain('IV')
    expect(html).toContain('BQ')
    expect(html).not.toMatch(/<img[^>]+\/media\//)
  })

  it('draws exactly one portrait per photographed keeper, and no monogram beside it', () => {
    // The img REPLACES the medallion's inner content — a photo and an initial
    // stacked in the same cartouche is the failure this asserts against.
    const html = markup([
      member({ ...SPOTLIT, avatar_url: '/media/isolde.png' }),
      member({ ...ROSTERED, avatar_url: '/media/bram.png' }),
    ])
    expect(html.match(/<img[^>]+\/media\//g) ?? []).toHaveLength(2)
    expect(html).not.toContain('>IV<')
    expect(html).not.toContain('>BQ<')
  })
})
