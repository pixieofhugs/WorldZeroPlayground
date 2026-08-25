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
      resolveMembershipState(true, 'defected', false),
    ).toBe('burned')
  })

  it('keeps the burn distinct from never-invited', () => {
    expect(
      resolveMembershipState(true, 'not_invited', false),
    ).toBe('gate')
  })

  it('does not let a stale invitation letter offer a burned viewer Join', () => {
    // The backend ranks defection above invitation in the same status map, and
    // `can_join_faction` would refuse the join outright — so an open letter
    // must not resurrect the Join CTA.
    expect(
      resolveMembershipState(true, 'defected', true),
    ).toBe('burned')
  })

  it('treats UA as an ordinary invite-joinable faction, in every state (#2660)', () => {
    // ADR-0030 (Accepted): "UA has no starter privilege. It is an ordinary,
    // invite-joinable faction." A `slug === 'ua'` short-circuit used to return
    // "none" for every non-member, so `UaFactionBody`'s complete join block —
    // and its fully written `ua.join.*` copy — was unreachable, while the
    // backend delivered real UA invitation letters the whole time
    // (`_NON_INVITE_FACTION_SLUGS` is {na, albescent} and excludes UA).
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
