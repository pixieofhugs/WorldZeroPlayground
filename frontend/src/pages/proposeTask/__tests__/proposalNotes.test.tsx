/**
 * #1823 — "Notes to admin (optional)" reaches the server.
 *
 * The seam is `planProposalSubmission`, the pure core that turns raw form
 * fields into the request body. `notes` was held in `ProposeTaskState` and
 * bound to a textarea, but the planner never read it, so the answer to "Why do
 * you want this task to exist?" was dropped between the keystroke and the wire.
 *
 * The planner is the right seam because it is the single place both proposal
 * kinds build their body — a test here fails on the real defect rather than on
 * a mocked axios call.
 */
import { describe, it, expect } from 'vitest'
import { planProposalSubmission, UNAFFILIATED_FACTION_SLUG } from '../useProposeTask'

const base = {
  title: 'Meditate daily',
  description: 'Sit for ten minutes',
  pointValue: '10',
  metaBonusValue: '25',
  levelRequired: 0 as number | '',
  factionSlug: 'coven',
  notes: '',
}

describe('planProposalSubmission — notes to admin', () => {
  it('sends what the proposer typed', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetatask: false,
      notes: 'My whole run group already does this every Sunday.',
    })
    if (plan.kind !== 'standard') throw new Error('expected standard plan')
    expect(plan.body.notes).toBe(
      'My whole run group already does this every Sunday.',
    )
  })

  it('omits the field entirely when the proposer left it blank', () => {
    const plan = planProposalSubmission({ ...base, isMetatask: false })
    if (plan.kind !== 'standard') throw new Error('expected standard plan')
    // Not "" — an untouched optional textarea should not write an empty
    // string onto the row, matching how `description` is already handled.
    expect(plan.body.notes).toBeUndefined()
  })

  it('does not attach notes to a metatask — the form hides the field there', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetatask: true,
      factionSlug: UNAFFILIATED_FACTION_SLUG,
      notes: 'typed before ticking the metatask box',
    })
    if (plan.kind !== 'metatask') throw new Error('expected metatask plan')
    expect('notes' in plan.body).toBe(false)
  })
})
