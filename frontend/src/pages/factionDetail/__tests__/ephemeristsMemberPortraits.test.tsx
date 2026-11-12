/**
 * #2228 — Ephemerists member portraits, in BOTH mounts (spotlight + roster).
 * Tested at the page body: the bug was a prop the mounts never passed, which a
 * leaf `AuthorOctagon` test can't see. Score decides the spotlight (`ranked[0]`).
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
    const html = markup([member(SPOTLIT), member(ROSTERED)])
    expect(html).toContain('IV')
    expect(html).toContain('BQ')
    expect(html).not.toMatch(/<img[^>]+\/media\//)
  })

  it('draws exactly one portrait per photographed keeper, and no monogram beside it', () => {
    // The img REPLACES the initial, never stacks with it.
    const html = markup([
      member({ ...SPOTLIT, avatar_url: '/media/isolde.png' }),
      member({ ...ROSTERED, avatar_url: '/media/bram.png' }),
    ])
    expect(html.match(/<img[^>]+\/media\//g) ?? []).toHaveLength(2)
    expect(html).not.toContain('>IV<')
    expect(html).not.toContain('>BQ<')
  })
})
