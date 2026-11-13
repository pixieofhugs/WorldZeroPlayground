/**
 * Character-creation dispatch (#2346, #2347): `factionSlug` -> archetype. The
 * slug is the pick in progress, so the page reskins live and falls back when
 * cleared. Guards #796: empty or unknown slugs must land on the `na` kit, not a
 * faction costume. Albescent is pickable (#2399) and registered (#2531), but as a
 * wrapper over the na kit (ADR-0027); its picker presence is not asserted here.
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
 * Derived from the map; `surfaceDispatch.test.ts` owns the roster. `na` is
 * excluded: it's the Default's own row since #2530.
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
  // Unwrap the code-split `lazyArchetype` wrapper for an identity check.
  const Archetype = resolvedArchetype(resolveVariant(surfaceMap('createCharacter'), slug))
  // `preloadArchetypes.ts` rules this out; throw rather than render undefined.
  if (!Archetype) throw new Error(`no createCharacter archetype resolved for "${slug}"`)
  return Archetype
}

describe('the calling being picked chooses the archetype', () => {
  it('at least one faction fills the slot', () => {
    // Goes red if the last registration is removed but the surface kept.
    expect(REGISTERED.length).toBeGreaterThan(0)
  })

  it.each(REGISTERED)('%s reskins the page away from the Default', (slug) => {
    expect(archetypeFor(slug)).not.toBe(DefaultCreateCharacter)
  })

  it('born unaffiliated renders the na kit, never a faction costume (#796)', () => {
    expect(archetypeFor('')).toBe(DefaultCreateCharacter)
  })

  it('clearing a pick returns the page to the Default', () => {
    const picked = archetypeFor(REGISTERED[0])
    const cleared = archetypeFor('')
    expect(picked).not.toBe(cleared)
    expect(cleared).toBe(DefaultCreateCharacter)
  })

  it('albescent renders the na KIT through a wrapper, not a costume of its own', () => {
    // A wrapper around the na kit (#2531); byte-identity is asserted in
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
    // `resolveSlug` is own-property-only; `constructor` must not leak through.
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
      // The name field: the only required value on the wire.
      expect(html).toContain('value="Molly"')
    })
  }
})

describe('the picker survives every skin', () => {
  // A skin that swallowed the picker would strand the player in a faction.
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
