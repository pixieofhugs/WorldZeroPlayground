/**
 * Publishing refreshes `/auth/me` before the composer lets go (#3102).
 *
 * `can_vote` rides the session-cached `/auth/me` payload. The case that must
 * not need a reload is the first-run one: a level-0 newcomer publishes the
 * onboarding praxis, reaches the vote level, and the next card they look at
 * has to show stars instead of "Reach level N to vote". `publish` is the only
 * caller of `submitPraxis`, and it awaits the auth `refetch()` straight after.
 * This pins that.
 *
 * ponytail: a source scan, because the suite's harness is static markup with no
 * DOM (effects and callbacks never run), so `publish` cannot be driven here. It
 * catches the refetch being dropped or moved behind an early exit; it does not
 * prove the open page repaints. Upgrade path: a DOM-environment hook test, or
 * the e2e sweep, once either exists for the composer.
 *
 * Not covered by any path: levelling up from OTHER people's votes while the tab
 * sits open. Nothing client-side hears about that, so it takes a reload.
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
