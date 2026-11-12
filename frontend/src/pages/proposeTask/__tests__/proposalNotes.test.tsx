/**
 * #1823 — "Notes to admin (optional)" reaches the server. The planner is the one
 * place both proposal kinds build their body, so the real defect fails here.
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
    // Not "": match how `description` is handled.
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
