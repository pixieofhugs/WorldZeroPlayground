/**
 * Character-creation dispatch (#2346, #2347) — the seam, not the dress.
 *
 * THE SEAM IS `factionSlug` → ARCHETYPE. Every other page dispatcher reads a
 * faction off a loaded record; this one reads the pick in progress out of
 * `useCreateCharacter`, which is what makes the page reskin LIVE as a calling is
 * chosen and fall back the moment it is cleared. So the property worth pinning
 * is a function of one string, and it needs no DOM: same state, different slug,
 * different component.
 *
 * THE DEFECT CLASS THIS GUARDS IS #796 / #418 / #636. `FactionSelectCard`'s
 * fallback used to be `UaSelectCard`, which "dressed every unaffiliated and
 * unknown slug in UA's costume" — three times before it was caught. An empty
 * slug is born unaffiliated and MUST land on the `na` kit, and so must a slug no
 * faction registered.
 *
 * ON ALBESCENT, READ THE REASON AND NOT JUST THE ROW. Its row has been green
 * under three different reasons, two of which are now false. It was "Albescent
 * can never be picked at creation" until #2399 re-cut the gate — it IS a
 * character-creation option for an unlocked account, since a new life is level 0
 * and always clears the level-8 ceiling. It was then "so it gets no archetype
 * anyway" until #2531, which registered one. What survives both is the actual
 * ruling: every Albescent registration is a WRAPPER rather than a skin
 * (ADR-0027), so the na kit is what draws and the archetype is one class over
 * it. There is deliberately NO assertion here that Albescent is absent from the
 * picker; such a test would be wrong the day it is read, and the picker is the
 * account's invitation set, not this map.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { UNAFFILIATED_FACTION_SLUG } from '../../../utils/factions'
import { surfaceMap } from '../../../factions'
import type { CreateCharacterState } from '../useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const DefaultCreateCharacter = (await import('../archetypes/DefaultCreateCharacter')).default

/**
 * The registered slugs, DERIVED rather than listed.
 *
 * There is deliberately no hand-maintained roster here. `surfaceDispatch.test.ts`
 * already owns the appendable `createCharacter` row — which slugs are bespoke and
 * which fall through is that file's question, and it asks it for every surface in
 * one place. A second list would mean #2348–#2353 each appending to TWO files in
 * parallel, which is the shared-registry shape those six PRs already have to
 * dodge once. Reading the map instead means the rows below cover each new
 * archetype the moment it registers, with nothing to append.
 *
 * `na` is excluded because since #2530 it is a ROW rather than the
 * fallback behind the row — and every assertion below about "the Default"
 * is about the component that row points at.
 */
const REGISTERED = Object.keys(surfaceMap('createCharacter')).filter(
  (slug) => slug !== UNAFFILIATED_FACTION_SLUG,
)

function state(overrides: Partial<CreateCharacterState> = {}): CreateCharacterState {
  return {
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: '',
    setBio: () => {},
    tagline: '',
    setTagline: () => {},
    factionSlug: '',
    setFactionSlug: () => {},
    invited: [],
    avatarFile: null,
    avatarPreview: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarError: '',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    error: null,
    submitting: false,
    canSubmit: true,
    handleSubmit: () => {},
    handle: 'molly',
    showPicker: false,
    ...overrides,
  }
}

function archetypeFor(slug: string) {
  // Unwrapped: every archetype is code-split, so the map hands back
  // `lazyArchetype`'s wrapper and an identity comparison needs the module.
  return resolvedArchetype(resolveVariant(surfaceMap('createCharacter'), slug))
}

describe('the calling being picked chooses the archetype', () => {
  it('at least one faction fills the slot', () => {
    // The manifest's own rule: "a slot no faction fills is not a seam, it is a
    // lookup that always returns the same answer." The chassis may not merge
    // empty, so this row is the one that would go red if a future PR removed
    // the last registration rather than the surface.
    expect(REGISTERED.length).toBeGreaterThan(0)
  })

  it.each(REGISTERED)('%s reskins the page away from the Default', (slug) => {
    expect(archetypeFor(slug)).not.toBe(DefaultCreateCharacter)
  })

  it('born unaffiliated renders the na kit, never a faction costume (#796)', () => {
    expect(archetypeFor('')).toBe(DefaultCreateCharacter)
  })

  it('clearing a pick returns the page to the Default', () => {
    // The live reskin, stated as the round trip it actually is: the same page,
    // one field changed.
    const picked = archetypeFor(REGISTERED[0])
    const cleared = archetypeFor('')
    expect(picked).not.toBe(cleared)
    expect(cleared).toBe(DefaultCreateCharacter)
  })

  it('albescent renders the na KIT through a wrapper, not a costume of its own', () => {
    // NOT because it cannot be picked — since #2399 it can, a new life being
    // level 0. And no longer by falling through, either: #2531 registered the
    // row, because an absent one reads as "na draws no mark to re-cut here" and
    // as "nobody got to it" at the same time. What renders is still the na kit —
    // `AlbescentCreateCharacter` returns `DefaultCreateCharacter` inside one
    // classed div, so `data-skin` below is the na page's own and the whole delta
    // is that the phone's rainbow photo ring starts turning. The byte-identity
    // once that class is stripped is asserted in
    // `src/__tests__/albescentWrapperKinds.test.tsx`.
    const Archetype = archetypeFor('albescent')
    expect(Archetype).not.toBe(DefaultCreateCharacter)
    const html = renderToStaticMarkup(
      <MemoryRouter><Archetype state={state({ factionSlug: 'albescent' })} /></MemoryRouter>,
    )
    expect(html, 'the na kit is what draws — #796 is the defect class').toContain(
      'data-skin="default"',
    )
  })

  it('an unknown slug cannot reach Object.prototype (#1821)', () => {
    // `pickVariant` is own-property-only; a bracket read would hand back the
    // `Object` function for React to render.
    expect(archetypeFor('constructor')).toBe(DefaultCreateCharacter)
    expect(archetypeFor('no-such-faction')).toBe(DefaultCreateCharacter)
  })
})

describe('every registered archetype renders at both widths', () => {
  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, ''])(`renders "%s" on ${width}`, (slug) => {
      factor.value = width
      const Archetype = archetypeFor(slug)
      const html = renderToStaticMarkup(
        <MemoryRouter><Archetype state={state({ factionSlug: slug })} /></MemoryRouter>,
      )
      factor.value = 'desktop'
      // The page exists and carries the author's own name field — the one slot
      // no skin may drop, since it is the only required value on the wire.
      expect(html).toContain('value="Molly"')
    })
  }
})

describe('the picker survives every skin', () => {
  // A player must be able to change their mind, or clear the pick and be born
  // unaffiliated. A skin that swallowed the picker would strand them in the
  // faction they just tapped.
  it.each([...REGISTERED, ''])('slug "%s" still draws the invited callings', (slug) => {
    const Archetype = archetypeFor(slug)
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state({
          factionSlug: slug,
          invited: ['ephemerists', 'coven'],
          showPicker: true,
        })} />
      </MemoryRouter>,
    )
    expect(html, 'the calling just picked').toContain('The Ephemerists')
    expect(html, 'and the one not picked').toContain('Cozy Coven')
  })
})
