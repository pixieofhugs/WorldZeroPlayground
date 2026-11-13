/**
 * The body editor's one gate (#1811, ADR-0079): refuse until the document has
 * arrived or when the praxis is moderated. Proposals are guarded by a confirm
 * (`proposalGuard.test.ts`), not a lock.
 */
import { describe, it, expect } from 'vitest'
import { composerWritable } from '../roomSeal'

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
})
