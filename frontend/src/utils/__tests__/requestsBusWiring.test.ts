/**
 * #1867 — both ends of `utils/requestsBus`. #2892 — and the partition between
 * them, so the membership is a table rather than a per-function judgement call.
 *
 * THE SEAM is the bus itself, not a rendered panel. A write fires
 * `notifyRequestsChanged()`; the surfaces that show the viewer's own in-flight
 * work subscribe with `onRequestsChanged(refetch)`. A gap at either end is
 * invisible: a notify nobody hears, or a listener nobody notifies.
 *
 * Signing up for a task went through `createPraxis`, which was the one write in
 * `api/praxis.ts` that never rang the bell, so the sidebar's "In progress"
 * panel — and the `{n} of {max}` slot counter derived from the same array —
 * kept the pre-signup list until a hard refresh.
 *
 * That bug was possible because "does this one ring?" was decided seventeen
 * separate times with nothing checking the answers against each other. The
 * census below is the forcing function #2892 asks for: every mutating export of
 * `api/praxis.ts` is enumerated FROM THE SOURCE and has to appear in
 * {@link PRAXIS_WRITES} with a verdict and a reason. An eighteenth write fails
 * this file until someone writes down which side of the rule it falls on, and a
 * ring silently deleted from an existing one fails it too.
 *
 * WHY HALF OF THIS IS A SOURCE TEST
 * ---------------------------------
 * Vitest runs in the `node` environment with no jsdom, so the harness is
 * `renderToStaticMarkup` and effects never run (`docs/spec/SPEC-testing.md`).
 * The notify half is real behaviour and asserted as such — a stubbed wire, the
 * real api functions, a real subscriber. The subscribe half cannot be observed
 * that way by anything in this repo, so it is pinned at the source, the same
 * posture as `hooks/__tests__/authDepNarrowing.test.ts`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * The stub goes in via `vi.hoisted`, not `beforeEach`: `openapi-fetch` binds
 * `globalThis.fetch` when the client is CREATED, at `api/client`'s top level,
 * which happens during this file's imports. A later stub is never consulted and
 * the suite silently posts to whatever is listening on localhost:8000 (see
 * `api/client.test.ts`).
 */
vi.hoisted(() => {
  globalThis.fetch = (async () =>
    new Response('{"id":7}', {
      status: 201,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
})

import * as praxisApi from '../../api/praxis'
import { onRequestsChanged } from '../requestsBus'

/**
 * THE RULE, applied once per write (`utils/requestsBus`'s own docstring states
 * it): ring iff the write moves a row into or out of **the calling viewer's**
 * pending-requests queue or their bank of in-progress work. A write whose
 * effect lands on somebody else does not ring — the bus is a module-local Set,
 * so it can only ever reach the tab that made the call.
 *
 * Every entry names which side of that rule it falls on and why. `rings: false`
 * is a decision recorded here, not an omission: that distinction is the whole
 * point of the census, because #1867 was an omission that read as a decision.
 */
const PRAXIS_WRITES: ReadonlyArray<{
  readonly name: string
  readonly rings: boolean
  readonly why: string
  readonly call: () => Promise<unknown>
}> = [
  {
    name: 'createPraxis',
    rings: true,
    why: 'a signup adds an in-progress praxis to the viewer’s own bank (#1867)',
    call: () => praxisApi.createPraxis({ task_id: 1, type: 'solo' }),
  },
  {
    name: 'deletePraxis',
    rings: true,
    why: 'the row leaves the viewer’s in-progress bank and frees a slot',
    call: () => praxisApi.deletePraxis(7),
  },
  {
    name: 'changePraxisType',
    rings: false,
    why: 'solo↔collab keeps the same row in the same bank — nothing enters or leaves',
    call: () => praxisApi.changePraxisType(7, 'collab'),
  },
  {
    name: 'unsubmitPraxis',
    rings: true,
    why: 'the group is awaiting your submission again (ADR-0079)',
    call: () => praxisApi.unsubmitPraxis(7),
  },
  {
    name: 'setPraxisDone',
    rings: false,
    why: 'Done is a roster badge; the awaiting-submission bucket is about approval',
    call: () => praxisApi.setPraxisDone(7, true),
  },
  {
    name: 'submitPraxis',
    rings: true,
    why: 'your part landed — this praxis leaves the awaiting-your-submission bucket',
    call: () => praxisApi.submitPraxis(7),
  },
  {
    name: 'leavePraxis',
    rings: true,
    why: 'leaving frees a task-bank slot',
    call: () => praxisApi.leavePraxis(7),
  },
  {
    name: 'uploadPraxisMedia',
    rings: false,
    why: 'editing the contents of a praxis already in the bank',
    call: () => praxisApi.uploadPraxisMedia(7, new File([], 'a.png')),
  },
  {
    name: 'uploadPraxisMediaBatch',
    rings: false,
    why: 'same as the single upload — contents, not membership',
    call: () => praxisApi.uploadPraxisMediaBatch(7, [new File([], 'a.png')]),
  },
  {
    name: 'deletePraxisMedia',
    rings: false,
    why: 'same as the uploads, from the other direction',
    call: () => praxisApi.deletePraxisMedia(7, 3),
  },
  {
    name: 'inviteToPraxis',
    rings: false,
    why: 'the obligation lands on the INVITEE; a module-local Set cannot reach their tab',
    call: () => praxisApi.inviteToPraxis(7, 9),
  },
  {
    name: 'respondToInvite',
    rings: true,
    why: 'the invite leaves your requests bucket (accept → awaiting submission; decline → gone)',
    call: () => praxisApi.respondToInvite(7, 3, true),
  },
  {
    name: 'cancelInvite',
    rings: false,
    why: 'the rescinded invite was the invitee’s obligation, not the inviter’s (#421)',
    call: () => praxisApi.cancelInvite(7, 3),
  },
  {
    name: 'kickMember',
    rings: true,
    why: 'the reset lands on the KICKER too — the group is back to editing (ADR-0013)',
    call: () => praxisApi.kickMember(7, 9),
  },
  {
    name: 'applyMetatask',
    rings: false,
    why: 'a metatask decorates a praxis already in the bank',
    call: () => praxisApi.applyMetatask(7, 3),
  },
  {
    name: 'removeMetatask',
    rings: false,
    why: 'same as applying one',
    call: () => praxisApi.removeMetatask(7, 3),
  },
  {
    name: 'flagPraxis',
    rings: false,
    why: 'a report about somebody else’s praxis moves nothing of the viewer’s',
    call: () => praxisApi.flagPraxis(7, 'spam'),
  },
]

/**
 * Every export of `api/praxis.ts` that issues a mutating request, read off the
 * source rather than off an import list — an import list only knows the names
 * somebody remembered to add to it, which is the failure mode being guarded.
 *
 * Comments are stripped first: this asks what the CODE does, and a docstring
 * naming `apiPost` would otherwise enrol a function that never calls one.
 */
function mutatingExports(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return code
    .split(/^export (?:async )?function /m)
    .slice(1)
    .filter((body) => /\bapi(?:Post|Put|Patch|Delete)\(/.test(body))
    .map((body) => /^(\w+)/.exec(body)?.[1] ?? '')
}

describe('the api/praxis.ts bus partition is a table, not seventeen decisions (#2892)', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../api/praxis.ts'),
    'utf8',
  )

  it('every mutating export is classified — an unlisted one is #1867 waiting to happen', () => {
    expect([...mutatingExports(source)].sort()).toEqual(
      [...PRAXIS_WRITES.map((write) => write.name)].sort(),
    )
  })

  it('every entry states a reason, so `rings: false` cannot read as an oversight', () => {
    expect(PRAXIS_WRITES.filter((write) => write.why.length < 20)).toEqual([])
  })
})

describe('praxis writes ring the bus exactly where the table says they do', () => {
  let heard = 0
  let unsubscribe: () => void

  beforeEach(() => {
    heard = 0
    unsubscribe = onRequestsChanged(() => {
      heard += 1
    })
  })

  afterEach(() => unsubscribe())

  for (const { name, rings, why, call } of PRAXIS_WRITES) {
    it(`${name} — ${rings ? 'rings' : 'silent'}: ${why}`, async () => {
      await call()
      expect(heard).toBe(rings ? 1 : 0)
    })
  }

  it('stops delivering once unsubscribed', async () => {
    unsubscribe()
    await praxisApi.createPraxis({ task_id: 1, type: 'solo' })
    expect(heard).toBe(0)
    // afterEach unsubscribes again; the Set makes that a no-op.
  })
})

describe('useMyActiveTasks listens as well as keys on the character', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../hooks/useMyActiveTasks.ts'),
    'utf8',
  )

  it('subscribes to the bus, in the shape useSidebarPanels already uses', () => {
    expect(source).toMatch(/return onRequestsChanged\(refetch\)/)
  })

  it('keeps the #1390 character keying — the bus is a SECOND trigger, not a swap', () => {
    // `/auth/me` mints a fresh `CurrentUser` on every refetch, so keying the
    // effect on the auth object would re-request on every unrelated refresh.
    expect(source).toMatch(/\}, \[characterId\]\)/)
    expect(source).toMatch(/user\?\.character\?\.id/)
  })
})
