/**
 * Albescent hides in plain sight (#783) — the executable statement of what that
 * phrase means.
 *
 * Albescent is a secret society (ADR-0027). At first glance a member must be
 * INDISTINGUISHABLE from an unaffiliated player, revealing the society only
 * through the invitation flow and, later, through flourishes inside Albescent's
 * own components. It was previously built as the exact opposite: a first-class
 * faction (#232) with its own near-black token block, a rainbow slot and ~20
 * bespoke skins. This file replaces the one that guarded that (it asserted
 * `factionColor('albescent') === '#1c1c1a'`) — same file, inverted intent.
 *
 * WHAT THESE TESTS ASSERT, AND WHY THEY ARE SHAPED THIS WAY. The property is
 * stated as an EQUIVALENCE against `na` rather than as "albescent is absent
 * from X". Absence tests pass for the wrong reasons — deleting a token makes
 * them green whether or not the surface actually renders correctly — and they
 * pin the implementation, so they break when the neutral identity is rebuilt.
 * "Renders the same as unaffiliated" is the actual product requirement, is
 * observable, and survives refactors of the thing it compares against.
 *
 * The `na` boundary here is delicate: see the `isKnownFaction` docblock in
 * ../factions.ts for #749, where testing key PRESENCE in CSS_KEY rather than
 * the mapped VALUE reported `na` as a real faction and greyed out every
 * unaffiliated ornament. Albescent now sits on that same boundary.
 *
 * NOT covered here, deliberately: the reveal mechanics. The sticky per-account
 * reveal flag, the invitation letter, the level-8 `join_albescent` unlock and
 * `can_always_rejoin` are all unchanged by #783 — this issue changed
 * appearance, not mechanics. `components/__tests__/albescentInvitation.test.ts`
 * covers that flow and must keep passing untouched.
 */
import { describe, it, expect } from 'vitest'
import {
  FACTION_ALIASES,
  FACTION_RAINBOW_ORDER,
  factionColor,
  factionCssVar,
  factionFill,
  isKnownFaction,
} from '../factions'
import { surfaceMap } from '../../factions'
import { SURFACE_KEYS } from '../../factions/manifest'

describe('Albescent hides in plain sight (#783)', () => {
  it('is not a known faction — it has no resolvable theme', () => {
    // Membership in this predicate means "has a resolvable theme". Albescent
    // stays REGISTERED (slug, copy, reveal flow, /factions row) but is no
    // longer THEMED, so it belongs on the same branch as `na`.
    expect(isKnownFaction('albescent')).toBe(false)
  })

  it('reaches that state without an alias', () => {
    // It resolves to `default` by simply holding no CSS_KEY entry, exactly as
    // an unregistered slug does — the faction keeps its own slug rather than
    // being dissolved into `na`.
    expect(FACTION_ALIASES['albescent']).toBeUndefined()
  })

  it('holds no slot in the rainbow order', () => {
    // A slot leaks the society's existence, in its own colour, into the stripe
    // bars that render for every viewer (ADR-0027 / #390).
    expect(FACTION_RAINBOW_ORDER).not.toContain('albescent')
  })

  describe('resolves identically to unaffiliated', () => {
    // The suffixes every faction-aware surface actually asks for.
    const suffixes = [
      undefined,
      'light',
      'border',
      'card-bg',
      'card-text',
      'card-accent',
      'card-muted',
      'card-font',
    ] as const

    for (const suffix of suffixes) {
      it(`factionCssVar(…, ${suffix ?? 'primary'}) matches na`, () => {
        expect(factionCssVar('albescent', suffix)).toBe(
          factionCssVar('na', suffix),
        )
      })
    }

    for (const shape of ['bar', 'dot', 'pill'] as const) {
      it(`factionFill(…, '${shape}') matches na — the spectrum, not a hue`, () => {
        expect(factionFill('albescent', shape)).toEqual(factionFill('na', shape))
      })
    }

    it('factionColor matches na — no hue of its own to report', () => {
      expect(factionColor('albescent')).toBe(factionColor('na'))
    })
  })

  it('overrides no dispatched surface — every one falls through to Default', () => {
    // The strongest form of the property, and the one that stays true for
    // surfaces that do not exist yet: because the manifest is override-only, a
    // slug absent from every surface map renders that surface's `Default*`
    // archetype. This replaces the five per-surface `albescentDispatch` tests
    // that asserted the reverse, and it covers surfaces they never reached.
    const claimed = SURFACE_KEYS.filter(
      (surface) => surfaceMap(surface)['albescent'] !== undefined,
    )
    expect(claimed).toEqual([])
  })

  it('is still registered — hiding is not the same as being gone', () => {
    // The guard against over-correcting: if a future change drops Albescent's
    // manifest module entirely, it stops being a faction rather than becoming
    // an invisible one, and the reveal flow loses its slug.
    expect(factionCssVar('albescent')).toBe('var(--faction-default)')
  })
})
