/**
 * #3102 — publish awaits the `/auth/me` refetch so a newcomer who just reached
 * the vote level sees stars without a reload (`can_vote` is session-cached).
 *
 * ponytail: source scan; doesn't prove the page repaints. Upgrade: a jsdom hook
 * test or e2e. Levelling from others' votes while open still needs a reload.
 */
import { describe, it, expect } from 'vitest'
import { readStripped, SRC_DIR } from '../../../test/sourceScan'

describe('publish refreshes the auth payload', () => {
  const source = readStripped(`${SRC_DIR}/pages/editPraxis/useEditPraxis.ts`)

  it('has exactly one submit call site in the composer hook', () => {
    expect(source.match(/await submitPraxis\(/g)).toHaveLength(1)
  })

  it('awaits the auth refetch after the submit, before any exit', () => {
    const submit = source.indexOf('await submitPraxis(')
    const refetch = source.indexOf('await refetch()', submit)
    expect(refetch).toBeGreaterThan(submit)
    expect(source.slice(submit, refetch)).not.toMatch(/\breturn\b|\bnavigate\(/)
  })
})
