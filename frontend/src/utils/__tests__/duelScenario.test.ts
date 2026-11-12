/**
 * Duel e2e fixture logic, checked in a PR (#2888). `selectDuelTask` selects on
 * properties, never a slug (#2710): at or below the duel level, some faction.
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
    // `na` tasks are what a seed offers first.
    expect(() => selectDuelTask([faction({ primary_faction_slug: 'na' })])).toThrow(/seed\.py/)
  })

  it('selects a WOW-skinned task like any other faction (#2999)', () => {
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
    // Role codes keep two spec files' fixtures apart.
    expect(logins.map((call) => new URL(call.url).searchParams.get('key')?.split('-')[0])).toEqual([
      'da',
      'db',
    ])

    const create = fake.calls[fake.calls.length - 1]
    expect(create.url).toBe(`${FAKE_API}/praxes`)
    // SOLO: the duel is attached later by a real click.
    expect(create.data).toMatchObject({ task_id: 9, type: 'solo', title: 'Duel one' })
    expect(create.context).toBe(seeded.challenger.ctx.index)
  })
})
