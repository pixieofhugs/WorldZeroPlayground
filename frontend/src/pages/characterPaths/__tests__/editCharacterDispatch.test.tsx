/**
 * Edit-character dispatch (#2537): `character.faction_slug` → archetype.
 *
 * It is the EDITED character's slug, not the viewer's; a dispatcher wired to the
 * viewer renders a good page in the wrong faction. Unaffiliated and unknown
 * slugs must land on the `na` kit (#796).
 *
 * The two shared slots (`../editCharacterSlots`) carry behaviour pinned at both
 * widths: `na` links to the `/factions` directory (`/factions/na` 404s: `na` is
 * seeded hidden), and delete exists on every skin. Markup only, no pixels.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { UNAFFILIATED_FACTION_SLUG } from '../../../utils/factions'
import { surfaceMap } from '../../../factions'
import { factionDetailHref } from '../editCharacterSlots'
import { aCharacter, anEditCharacterState } from '../../../test/fixtures'
import type { EditCharacterState } from '../useEditCharacter'
import type { CharacterOut } from '../../../api/auth'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const DefaultEditCharacter = (await import('../archetypes/DefaultEditCharacter')).default

/**
 * Registered slugs, derived (the roster lives in `surfaceDispatch.test.ts`).
 * `na` is a row pointing at the Default, not the fallback itself (#2530).
 */
const REGISTERED = Object.keys(surfaceMap('editCharacter')).filter(
  (slug) => slug !== UNAFFILIATED_FACTION_SLUG,
)

/** Only the fields this file's assertions read; the rest come from the shared builder. */
const character = (overrides: Partial<CharacterOut> = {}): CharacterOut =>
  aCharacter({
    id: 1,
    username: 'molly',
    display_name: 'Molly',
    bio: 'Doing very human things.',
    tagline: 'Slow spells, strong tea.',
    level: 4,
    score: 340,
    all_time_score: 340,
    faction_slug: UNAFFILIATED_FACTION_SLUG,
    ...overrides,
  })

const state = (overrides: Partial<EditCharacterState> = {}): EditCharacterState =>
  anEditCharacterState({ character: character(), ...overrides })

/** Attributes of every text `<input>`/`<textarea>`; file inputs hide behind a button. */
function textFields(html: string): string[] {
  return [...html.matchAll(/<(?:input|textarea)\b([^>]*)>/g)]
    .map(([, attrs]) => attrs)
    .filter((attrs) => !/type="(?:file|hidden)"/.test(attrs))
}

function archetypeFor(slug: string | null | undefined) {
  // Unwrap the lazy wrapper so identity comparisons work.
  const Archetype = resolvedArchetype(resolveVariant(surfaceMap('editCharacter'), slug))
  if (!Archetype) throw new Error(`no editCharacter archetype resolved for "${slug}"`)
  return Archetype
}

function renderFor(slug: string, width: 'mobile' | 'desktop'): string {
  factor.value = width
  try {
    const Archetype = archetypeFor(slug)
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state({ character: character({ faction_slug: slug }) })} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

describe('the edited character chooses the archetype', () => {
  it('at least one faction fills the slot', () => {
    // A slot no faction fills is a constant lookup, not a seam (#516).
    expect(REGISTERED.length).toBeGreaterThan(0)
  })

  it.each(REGISTERED)('%s reskins the page away from the Default', (slug) => {
    expect(archetypeFor(slug)).not.toBe(DefaultEditCharacter)
  })

  it('an unaffiliated life renders the na kit, never a faction costume (#796)', () => {
    expect(archetypeFor(UNAFFILIATED_FACTION_SLUG)).toBe(DefaultEditCharacter)
    expect(archetypeFor('')).toBe(DefaultEditCharacter)
  })

  it('a character still loading renders the na kit', () => {
    // Slug is undefined until `getCharacter` answers; no faction flashes.
    expect(archetypeFor(undefined)).toBe(DefaultEditCharacter)
  })

  it('an unknown slug cannot reach Object.prototype (#1821)', () => {
    // A bracket read would hand React the `Object` function.
    expect(archetypeFor('constructor')).toBe(DefaultEditCharacter)
    expect(archetypeFor('no-such-faction')).toBe(DefaultEditCharacter)
  })

  it('albescent renders the na KIT through a wrapper, not a costume of its own', () => {
    // Albescent wraps the Default in a classed div (ADR-0027).
    const Archetype = archetypeFor('albescent')
    expect(Archetype).not.toBe(DefaultEditCharacter)
    expect(renderFor('albescent', 'mobile')).toContain('data-skin="default"')
  })
})

describe('every registered archetype renders at both widths', () => {
  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(`renders "%s" on ${width}`, (slug) => {
      // Display name is the one value the save path requires.
      expect(renderFor(slug, width)).toContain('value="Molly"')
    })
  }
})

describe('the faction row survives every skin, and na goes to the DIRECTORY', () => {
  it('resolves the href in one place', () => {
    expect(factionDetailHref('wow')).toBe('/factions/wow')
    expect(factionDetailHref(UNAFFILIATED_FACTION_SLUG)).toBe('/factions')
    expect(factionDetailHref('')).toBe('/factions')
    expect(factionDetailHref(null)).toBe('/factions')
  })

  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" links out to a faction page on ${width}`,
      (slug) => {
        const html = renderFor(slug, width)
        if (slug === UNAFFILIATED_FACTION_SLUG) {
          expect(html, 'unaffiliated goes to the directory').toContain('href="/factions"')
          expect(html, 'never the hidden na detail page').not.toContain('href="/factions/na"')
        } else {
          expect(html).toContain(`href="/factions/${slug}"`)
        }
      },
    )
  }
})

describe('the destructive action survives every skin, at both widths', () => {
  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" offers delete on ${width}`,
      (slug) => {
        const text = renderFor(slug, width).replace(/<[^>]*>/g, '')
        expect(text).toContain('Delete this character')
      },
    )
  }

  it('opens as an invitation, not as a confirmation', () => {
    // The confirm is behind a tap.
    const text = renderFor(UNAFFILIATED_FACTION_SLUG, 'mobile').replace(/<[^>]*>/g, '')
    expect(text).not.toContain("This can't be undone")
  })
})

describe('the focus ring survives every skin, at both widths (#2825)', () => {
  /* The edit-registry twin of `createCharacterFields.test.tsx` (#2488).
     `element.focus()` can't report `:focus-visible`, so this asserts the markup
     that decides the ring. */

  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" suppresses no field's outline on ${width}`,
      (slug) => {
        const fields = textFields(renderFor(slug, width))
        expect(fields.length, 'the skin draws at least the name field').toBeGreaterThan(0)
        for (const field of fields) {
          expect(field, `outline killed on: ${field.trim()}`).not.toMatch(/outline:\s*none/)
        }
      },
    )

    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" takes the SHARED ring on ${width}`,
      (slug) => {
        // `[data-composer-field]:focus-visible` (#2266), not a bespoke ring.
        for (const field of textFields(renderFor(slug, width))) {
          expect(field, `no shared ring on: ${field.trim()}`).toContain('data-composer-field')
        }
      },
    )
  }
})

describe('every field on the edit form names itself (#2793)', () => {
  /* Placeholder-only forms (#2793) move the accessible name onto the input.
     Both widths: each archetype reads `useFormFactor()` itself. */
  function attr(attrs: string, name: string): string | null {
    return new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? null
  }

  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" names every field with its own placeholder on ${width}`,
      (slug) => {
        const fields = textFields(renderFor(slug, width))
        expect(fields.length, 'the skin draws at least the name field').toBeGreaterThan(0)
        for (const field of fields) {
          const name = attr(field, 'aria-label')
          expect(name, `a textbox with no accessible name: ${field.trim()}`).toBeTruthy()
          expect(attr(field, 'placeholder'), `placeholder and aria-label disagree on "${name}"`).toBe(name)
        }
      },
    )

    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" draws no visible field label on ${width}`,
      (slug) => {
        const labels = [...renderFor(slug, width).matchAll(/<label\b[^>]*>/g)].map(([whole]) => whole)
        expect(labels, 'a visible label survives on a placeholder-only form').toEqual([])
      },
    )
  }
})

describe('no kit draws a <label> that names nothing (#2834)', () => {
  /* Edit-registry twin of `createCharacterFields.test.tsx`'s orphan-label guard.
     A <label> wrapping its control is valid implicit association, not an orphan. */
  function orphanLabels(html: string): string[] {
    const found: string[] = []
    for (const [whole, attrs, inner] of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
      const hasFor = /\bfor="[^"]*"/.test(attrs)
      const wrapsControl = /<(?:input|textarea)\b/.test(inner)
      if (!hasFor && !wrapsControl) found.push(whole.trim())
    }
    return found
  }

  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
      `slug "%s" draws no orphan <label> on ${width}`,
      (slug) => {
        const html = renderFor(slug, width)
        expect(orphanLabels(html), 'a <label> with nothing to point at').toEqual([])
      },
    )
  }
})
