/**
 * The confirm that stands in front of a live proposal (#1811, ADR-0079) — the
 * pure seam.
 *
 * The editor binding is a CodeMirror instance in a DOM-less harness, so what is
 * provable here is the rule the binding consults: when it must ask, and — the
 * part the owner specified and the part a boolean would get wrong — that it
 * asks **once per proposal** and again for the next one.
 */
import { describe, it, expect } from 'vitest'
import type { PraxisMemberOut } from '../../../api/praxis'
import {
  editNeedsProposalConfirm,
  proposalIsLive,
  type ProposalPraxis,
} from '../proposalGuard'

const AT = '2026-08-17T10:00:00Z'
const LATER = '2026-08-17T12:00:00Z'

const member = (id: number): PraxisMemberOut => ({
  id,
  praxis_id: 1,
  character_id: id,
  character_display_name: `Member ${id}`,
  has_submitted: false,
  is_done: false,
  submitted_at: null,
  joined_at: AT,
  nudged_at: null,
})

const praxis = (over: Partial<ProposalPraxis> = {}): ProposalPraxis => ({
  type: 'collab',
  members: [member(1), member(2)],
  submit_proposed_at: AT,
  ...over,
})

describe('proposalIsLive', () => {
  it('is live for a collab crew of two with a window open', () => {
    expect(proposalIsLive(praxis())).toBe(true)
  })

  it('is not live while the crew is only drafting', () => {
    expect(proposalIsLive(praxis({ submit_proposed_at: null }))).toBe(false)
  })

  it('is never live for solo or a duel side, which have one member', () => {
    expect(proposalIsLive(praxis({ type: 'solo', members: [member(1)] }))).toBe(
      false,
    )
    expect(proposalIsLive(praxis({ members: [member(1)] }))).toBe(false)
  })

  it('is not live for a praxis that has not loaded', () => {
    expect(proposalIsLive(null)).toBe(false)
  })
})

describe('editNeedsProposalConfirm', () => {
  it('arms the moment a proposal goes live', () => {
    expect(editNeedsProposalConfirm(praxis(), null)).toBe(true)
  })

  it('fires once: agreeing to THIS proposal disarms it', () => {
    expect(editNeedsProposalConfirm(praxis(), AT)).toBe(false)
  })

  it('arms again for the NEXT proposal, with no reset to remember', () => {
    expect(editNeedsProposalConfirm(praxis({ submit_proposed_at: LATER }), AT)).toBe(
      true,
    )
  })

  it('never arms while the crew is drafting, agreed or not', () => {
    const drafting = praxis({ submit_proposed_at: null })
    expect(editNeedsProposalConfirm(drafting, null)).toBe(false)
    expect(editNeedsProposalConfirm(drafting, AT)).toBe(false)
  })
})
