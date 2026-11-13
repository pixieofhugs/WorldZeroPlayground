/**
 * The status → MembershipState mapping (#1305). `"defected"` (no rejoin this
 * era) must map to `burned`, not the soft "keep doing tasks" `gate`, which is
 * right only for "not invited yet" (#454).
 */
import { describe, it, expect } from 'vitest'
import { resolveMembershipState } from '../useFactionDetail'

describe('resolveMembershipState', () => {
  it('maps "defected" to the burned state, not the soft gate', () => {
    expect(
      resolveMembershipState(true, 'defected', false),
    ).toBe('burned')
  })

  it('keeps the burn distinct from never-invited', () => {
    expect(
      resolveMembershipState(true, 'not_invited', false),
    ).toBe('gate')
  })

  it('does not let a stale invitation letter offer a burned viewer Join', () => {
    // The backend ranks defection above invitation.
    expect(
      resolveMembershipState(true, 'defected', true),
    ).toBe('burned')
  })

  it('treats UA as an ordinary invite-joinable faction, in every state (#2660)', () => {
    // ADR-0030: UA is an ordinary invite-joinable faction.
    expect(resolveMembershipState(true, 'invited', false)).toBe('eligible')
    expect(resolveMembershipState(true, 'not_invited', true)).toBe('eligible')
    expect(resolveMembershipState(true, 'can_return', false)).toBe('eligible')
    expect(resolveMembershipState(true, 'not_invited', false)).toBe('gate')
    expect(resolveMembershipState(true, 'defected', false)).toBe('burned')
    expect(resolveMembershipState(true, 'member', false)).toBe('member')
    expect(resolveMembershipState(false, 'not_invited', false)).toBe('none')
  })

  it('leaves the exempt faction’s return path alone (can_always_rejoin)', () => {
    expect(
      resolveMembershipState(true, 'can_return', false),
    ).toBe('eligible')
  })

  it('still resolves the pre-existing states', () => {
    expect(resolveMembershipState(false, 'not_invited', false)).toBe('none')
    expect(resolveMembershipState(true, 'member', false)).toBe('member')
    expect(resolveMembershipState(true, 'invited', false)).toBe('eligible')
    expect(resolveMembershipState(true, 'not_invited', true)).toBe('eligible')
  })
})
