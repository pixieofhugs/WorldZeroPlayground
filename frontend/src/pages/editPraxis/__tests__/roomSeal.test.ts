/**
 * The body editor's one gate (#1811, ADR-0079): refuse until the document has
 * arrived or when the praxis is moderated. Proposals are guarded by a confirm
 * (`proposalGuard.test.ts`), not a lock.
 */
import { describe, it, expect } from 'vitest'
import { composerWritable, roomEndReason } from '../roomSeal'

describe('composerWritable', () => {
  it('takes text from a seeded room on an unlocked praxis', () => {
    expect(composerWritable(true, false)).toBe(true)
  })

  it('refuses until the document has arrived, locked or not', () => {
    // Typing before the seed merges into unseen text (ADR-0073 rule 1).
    expect(composerWritable(false, false)).toBe(false)
    expect(composerWritable(false, true)).toBe(false)
  })

  it('refuses a moderated praxis, which is the one composer still drawn locked', () => {
    // `controlsLocked`; published hands off to the read page (#1164).
    expect(composerWritable(true, true)).toBe(false)
  })

  it('refuses once the room has ended, seeded or not', () => {
    expect(composerWritable(true, false, true)).toBe(false)
    expect(composerWritable(false, false, true)).toBe(false)
  })
})

describe('roomEndReason', () => {
  const praxis = (status: string, ids: number[]) =>
    ({ status, members: ids.map((id) => ({ character_id: id })) }) as never

  it('says live when the refetched praxis is published and the viewer is in it', () => {
    expect(roomEndReason(praxis('submitted', [7]), 7)).toBe('live')
  })

  it('says removed for a failed refetch, a non-member, or an unpublished praxis', () => {
    expect(roomEndReason(null, 7)).toBe('removed')
    expect(roomEndReason(praxis('submitted', [8]), 7)).toBe('removed')
    expect(roomEndReason(praxis('draft', [7]), 7)).toBe('removed')
  })
})
