/**
 * e2e account scaffolding, checked in a PR (#2888). Key cases: colliding fixture
 * handles, and a dev-login account with no character.
 */
import { describe, it, expect } from 'vitest'
import { aTask } from '../../test/fixtures'
import {
  HANDLE_PREFIX_LENGTH,
  createPraxis,
  loginPlayer,
  playerName,
  readJson,
  submitPraxis,
  type E2EResponse,
} from '../e2eScenario'
import { FAKE_API, FAKE_RUN, fail, fakeScenario, ok, routerFor } from './fakeScenario'

const response = (status: number, body: unknown): E2EResponse => ({
  ok: () => status < 400,
  status: () => status,
  text: async () => JSON.stringify(body),
  json: async () => body,
})

describe('playerName', () => {
  it('puts the distinguishing token first, inside the handle prefix', () => {
    // The @handle is a truncated display name; a trailing seq would collide.
    const names = Array.from({ length: 40 }, (_, seq) => playerName('ua', seq, FAKE_RUN))
    const prefixes = new Set(names.map((name) => name.slice(0, HANDLE_PREFIX_LENGTH)))
    expect(prefixes.size).toBe(names.length)
    expect(names[0]).toBe(`UA0-${FAKE_RUN}`)
  })

  it('refuses a role code that pushes the name past the prefix', () => {
    expect(() => playerName('the-collaborator', 1, FAKE_RUN)).toThrow(/handle prefix/)
  })
})

describe('readJson', () => {
  it('returns the parsed body of a 200', async () => {
    await expect(readJson<{ id: number }>(response(200, { id: 4 }), 'thing')).resolves.toEqual({
      id: 4,
    })
  })

  it('throws with the status AND the body when the call failed', async () => {
    await expect(
      readJson(response(422, { detail: 'level too low' }), 'collab create'),
    ).rejects.toThrow(/collab create failed \(HTTP 422\).*level too low/)
  })
})

describe('loginPlayer', () => {
  it('mints a distinct account per call and carries the character id back', async () => {
    const fake = fakeScenario(routerFor([]))
    const first = await loginPlayer(fake.scenario, 'a', 1)
    const second = await loginPlayer(fake.scenario, 'a', 0)

    expect(first.characterId).not.toBe(second.characterId)
    expect(first.name).not.toBe(second.name)
    // A fresh cookie jar per player.
    expect(fake.contextCount()).toBe(2)
    expect(first.ctx.index).toBe(0)
    expect(second.ctx.index).toBe(1)
  })

  it('asks dev-login for the level the fixture needs, url-encoded', async () => {
    const fake = fakeScenario(routerFor([]))
    await loginPlayer(fake.scenario, 'ua', 8)

    const url = new URL(fake.calls[0].url)
    expect(url.origin + url.pathname).toBe(`${FAKE_API}/auth/dev-login`)
    expect(url.searchParams.get('level')).toBe('8')
    // Seq is per WORKER, so read, not pinned.
    const key = url.searchParams.get('key') ?? ''
    expect(key).toMatch(new RegExp(`^ua-${FAKE_RUN}-\\d+$`))
    expect(url.searchParams.get('name')).toBe(`UA${key.split('-').pop()}-${FAKE_RUN}`)
  })

  it('fails loudly when the account came back without a character', async () => {
    // `character_id` is nullable; a null would silently break every id-based call.
    const fake = fakeScenario((call) =>
      call.url.includes('dev-login')
        ? ok({ account_id: 1, character_id: null, character_name: null, faction_slug: null, message: '' })
        : fail(404, ''),
    )
    await expect(loginPlayer(fake.scenario, 'a', 1)).rejects.toThrow(/no character/)
  })

  it('reports a backend that is not up, naming the url it tried', async () => {
    const fake = fakeScenario(() => fail(500, 'connection refused'))
    await expect(loginPlayer(fake.scenario, 'a', 1)).rejects.toThrow(
      new RegExp(`is the backend up on ${FAKE_API}`),
    )
  })
})

describe('the praxis scaffolding', () => {
  it('posts the create body the API declares (PraxisCreate)', async () => {
    const fake = fakeScenario(routerFor([aTask({ id: 12 })]))
    const player = await loginPlayer(fake.scenario, 'a', 1)
    await createPraxis(player, { task_id: 12, type: 'collab', title: 'T', body_text: 'draft' })

    const create = fake.calls[fake.calls.length - 1]
    expect(create.url).toBe(`${FAKE_API}/praxes`)
    expect(create.data).toEqual({ task_id: 12, type: 'collab', title: 'T', body_text: 'draft' })
  })

  it('submits on the submitting player own cookie jar', async () => {
    const fake = fakeScenario(routerFor([]))
    const creator = await loginPlayer(fake.scenario, 'a', 1)
    const invitee = await loginPlayer(fake.scenario, 'b', 0)
    await submitPraxis(invitee, 9)

    const submit = fake.calls[fake.calls.length - 1]
    expect(submit.url).toBe(`${FAKE_API}/praxes/9/submit`)
    expect(submit.context).toBe(invitee.ctx.index)
    expect(submit.context).not.toBe(creator.ctx.index)
  })
})
