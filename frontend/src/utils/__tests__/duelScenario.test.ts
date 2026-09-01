/**
 * What a duel fixture is, checked in a PR (#2888).
 *
 * `selectDuelTask` has been wrong twice and both times the failure surfaced as
 * something else: once as a missing task with nothing in it about eras (#2710,
 * it pinned a faction slug the era no longer carried), and once as an
 * exclusion that steered every fixture away from WOW for a seal-copy override
 * #1909 had already deleted (#2999). It selects on properties, never a slug
 * (#2710): at or below the duel level, and belonging to some faction.
 */
import { describe, it, expect } from 'vitest'
import { aTask } from '../../test/fixtures'
import { DUEL_LEVEL, seedDuelChallenge, selectDuelTask } from '../duelScenario'
import { FAKE_API, fakeScenario, routerFor } from './fakeScenario'

const faction = (over: Partial<Parameters<typeof aTask>[0]> = {}) =>
  aTask({ level_required: DUEL_LEVEL, primary_faction_slug: 'coven', ...over })

describe('selectDuelTask', () => {
  it('takes the first faction-skinned task the challenger can sign up for', () => {
    const wanted = faction({ id: 4 })
    expect(
      selectDuelTask([
        faction({ id: 1, level_required: DUEL_LEVEL + 1 }),
        faction({ id: 2, primary_faction_slug: 'na' }),
        wanted,
      ]),
    ).toBe(wanted)
  })

  it('skips the cross-faction sentinel, which renders the Default archetypes', () => {
    // `na` is what the onboarding task and every collab fixture task wear, so
    // it is the one a level-0-friendly seed offers FIRST.
    expect(() => selectDuelTask([faction({ primary_faction_slug: 'na' })])).toThrow(/seed\.py/)
  })

  it('selects a WOW-skinned task like any other faction (#2999)', () => {
    // WOW no longer overrides the duel-seal copy — #1909 deleted the last
    // per-faction override, so WOW takes `useDuelSealCopy` like every other
    // skin and is not an exclusion here.
    const wanted = faction({ primary_faction_slug: 'wow' })
    expect(selectDuelTask([wanted])).toBe(wanted)
  })

  it('skips a task above the duel level, which the challenger cannot attempt', () => {
    expect(() => selectDuelTask([faction({ level_required: DUEL_LEVEL + 1 })])).toThrow(
      new RegExp(`level <= ${DUEL_LEVEL}`),
    )
  })
})

describe('seedDuelChallenge', () => {
  it('seeds both sides at the duel level and drafts on the faction task', async () => {
    const fake = fakeScenario(
      routerFor([faction({ id: 3, primary_faction_slug: 'na' }), faction({ id: 9 })]),
    )
    const seeded = await seedDuelChallenge(fake.scenario, ['da', 'db'], 'Duel one')

    expect(seeded.task.id).toBe(9)
    const logins = fake.calls.filter((call) => call.url.includes('dev-login'))
    expect(logins.map((call) => new URL(call.url).searchParams.get('level'))).toEqual([
      String(DUEL_LEVEL),
      String(DUEL_LEVEL),
    ])
    // The role code is what keeps two spec files' fixtures apart if their run
    // ids ever agree — each file passes its own pair.
    expect(logins.map((call) => new URL(call.url).searchParams.get('key')?.split('-')[0])).toEqual([
      'da',
      'db',
    ])

    const create = fake.calls[fake.calls.length - 1]
    expect(create.url).toBe(`${FAKE_API}/praxes`)
    // A SOLO draft: the duel is attached later, by a real clicked button.
    expect(create.data).toMatchObject({ task_id: 9, type: 'solo', title: 'Duel one' })
    expect(create.context).toBe(seeded.challenger.ctx.index)
  })
})
