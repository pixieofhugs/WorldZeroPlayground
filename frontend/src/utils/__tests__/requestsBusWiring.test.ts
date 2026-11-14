/**
 * Both ends of `utils/requestsBus` (#1867) and the partition between them
 * (#2892). Every mutating export of `api/praxis.ts` is enumerated from source
 * and must appear in {@link PRAXIS_WRITES} with a verdict and a reason.
 *
 * The subscribe half is exercised in `hooks/__tests__/authDepNarrowing.test.tsx`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * `vi.hoisted`, not `beforeEach`: `openapi-fetch` binds `globalThis.fetch` at
 * client creation, during imports (see `api/client.test.ts`).
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
 * The rule (see `utils/requestsBus`) applied per write. `rings: false` is a
 * recorded decision, not an omission.
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

/** Mutating exports of `api/praxis.ts`, read off comment-stripped source. */
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
