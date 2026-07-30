/**
 * The status → MembershipState mapping (#1305).
 *
 * The seam: `resolveMembershipState` is the whole defect surface. The hook
 * around it is effect-driven and this harness has no DOM, so the mapping is
 * asserted directly.
 *
 * The defect: the backend's `"defected"` — you left this faction this era and
 * it does not allow rejoining (`faction_service.get_faction_status_map`) — fell
 * through to `"gate"`, whose contract is the soft "keep doing tasks" prompt.
 * That told a burned player to work toward a join `can_join_faction` refuses
 * for the rest of the era. The two gates must stay distinguishable: "keep
 * doing tasks" is the RIGHT message for "not invited yet" (#454).
 */
import { describe, it, expect } from 'vitest'
import { resolveMembershipState } from '../useFactionDetail'

describe('resolveMembershipState', () => {
  it('maps "defected" to the burned state, not the soft gate', () => {
    expect(
      resolveMembershipState(true, 'defected', false, 'wow'),
    ).toBe('burned')
  })

  it('keeps the burn distinct from never-invited', () => {
    expect(
      resolveMembershipState(true, 'not_invited', false, 'wow'),
    ).toBe('gate')
  })

  it('does not let a stale invitation letter offer a burned viewer Join', () => {
    // The backend ranks defection above invitation in the same status map, and
    // `can_join_faction` would refuse the join outright — so an open letter
    // must not resurrect the Join CTA.
    expect(
      resolveMembershipState(true, 'defected', true, 'wow'),
    ).toBe('burned')
  })

  it('never burns UA — graduation-gating wins (#200/#243)', () => {
    expect(resolveMembershipState(true, 'defected', false, 'ua')).toBe('none')
    expect(resolveMembershipState(true, 'not_invited', false, 'ua')).toBe('none')
    // ...but a UA member still reads as a member.
    expect(resolveMembershipState(true, 'member', false, 'ua')).toBe('member')
  })

  it('leaves the exempt faction’s return path alone (can_always_rejoin)', () => {
    expect(
      resolveMembershipState(true, 'can_return', false, 'albescent'),
    ).toBe('eligible')
  })

  it('still resolves the pre-existing states', () => {
    expect(resolveMembershipState(false, 'not_invited', false, 'wow')).toBe('none')
    expect(resolveMembershipState(true, 'member', false, 'wow')).toBe('member')
    expect(resolveMembershipState(true, 'invited', false, 'wow')).toBe('eligible')
    expect(resolveMembershipState(true, 'not_invited', true, 'wow')).toBe('eligible')
  })
})
