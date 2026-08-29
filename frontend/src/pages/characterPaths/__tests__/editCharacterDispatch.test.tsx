/**
 * Edit-character dispatch (#2537) — the seam, and the two slots gated on it.
 *
 * ## The seam
 *
 * `character.faction_slug` → ARCHETYPE. `EditCharacter.tsx` used to hold a
 * direct import and a `formFactor === 'mobile'` early return, so the answer was
 * a constant: every faction got the na skin, on both widths, forever. The
 * property worth pinning is therefore a function of one string and needs no DOM
 * — same state, different slug, different component.
 *
 * IT IS THE EDITED CHARACTER'S SLUG, NOT THE VIEWER'S, and that is the one thing
 * a green build cannot tell you. `useEditCharacter` exposes both a `character`
 * and (through `useAuth`) a viewer; a dispatcher wired to the wrong one renders
 * a perfectly good page in the wrong faction's hand. The rows below read the
 * slug off the loaded record and nowhere else.
 *
 * THE DEFECT CLASS ON THE FALLBACK IS #796 / #418 / #636. `FactionSelectCard`'s
 * fallback used to be `UaSelectCard`, which "dressed every unaffiliated and
 * unknown slug in UA's costume" — three times before it was caught. An
 * unaffiliated life MUST land on the `na` kit, and so must a slug no faction
 * registered.
 *
 * ## The two slots
 *
 * A create dress has no room for `delete this character forever` and no room for
 * the faction the character already belongs to. This PR designs both once, in
 * `../editCharacterSlots`, so the seven-faction fan-out inherits them. Two
 * things about them are BEHAVIOUR rather than dress and are pinned here at both
 * widths:
 *
 *   • `na` routes to the `/factions` DIRECTORY, never `/factions/na` — that page
 *     is a 404 for the exact population the branch serves (`na` is seeded
 *     hidden, `GET /factions` returns visible rows only). Recorded in
 *     `pages/players/playersData.ts` and now enforced.
 *   • the destructive action EXISTS on both widths. It used to be phone-only,
 *     which is the asymmetry the fold ends.
 *
 * Nothing here proves a pixel: `renderToStaticMarkup`, no DOM (SPEC-testing.md).
 * The treatment of the two slots is visual QA and is stated outstanding on the
 * PR — the fan-out is gated on it.
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
import type { EditCharacterState } from '../useEditCharacter'
import type { CharacterOut } from '../../../api/auth'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const DefaultEditCharacter = (await import('../archetypes/DefaultEditCharacter')).default

/**
 * The registered slugs, DERIVED rather than listed — the same choice
 * `createCharacterDispatch.test.ts` makes and for the same reason. Which slugs
 * are bespoke is `surfaceDispatch.test.ts`'s question, asked there for every
 * surface in one place; a second roster here would mean the fan-out PRs each
 * append to TWO files in parallel.
 *
 * `na` is excluded because it is a ROW rather than the fallback behind the row
 * (#2530) — every assertion below about "the Default" is about what that row
 * points at.
 */
const REGISTERED = Object.keys(surfaceMap('editCharacter')).filter(
  (slug) => slug !== UNAFFILIATED_FACTION_SLUG,
)

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 1,
    username: 'molly',
    display_name: 'Molly',
    bio: 'Doing very human things.',
    tagline: 'Slow spells, strong tea.',
    avatar_url: '',
    location: '',
    level: 4,
    score: 340,
    all_time_score: 340,
    faction_slug: UNAFFILIATED_FACTION_SLUG,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function state(overrides: Partial<EditCharacterState> = {}): EditCharacterState {
  return {
    id: '1',
    character: character(),
    loading: false,
    isOwner: true,
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: 'Doing very human things.',
    setBio: () => {},
    tagline: 'Slow spells, strong tea.',
    setTagline: () => {},
    location: '',
    setLocation: () => {},
    avatarFile: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarPreview: null,
    avatarError: '',
    setAvatarError: () => {},
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    saving: false,
    canSubmit: true,
    error: '',
    handleSubmit: () => {},
    deleting: false,
    handleDelete: () => {},
    ...overrides,
  }
}

function archetypeFor(slug: string | null | undefined) {
  // Unwrapped: every archetype is code-split, so the map hands back
  // `lazyArchetype`'s wrapper and an identity comparison needs the module.
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
    // The manifest's own rule: "a slot no faction fills is not a seam, it is a
    // lookup that always returns the same answer." That is precisely how this
    // surface died the first time — declared by #516, claimed by nobody. The
    // chassis may not merge empty, so this row is what would go red if a future
    // PR removed the last registration rather than the surface.
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
    // `character` is null until `getCharacter` answers, so the slug is
    // undefined. The Default's own loading line is what draws — nothing flashes
    // a faction the page then takes back.
    expect(archetypeFor(undefined)).toBe(DefaultEditCharacter)
  })

  it('an unknown slug cannot reach Object.prototype (#1821)', () => {
    // `resolveSlug` is own-property-only; a bracket read would hand back the
    // `Object` function for React to render.
    expect(archetypeFor('constructor')).toBe(DefaultEditCharacter)
    expect(archetypeFor('no-such-faction')).toBe(DefaultEditCharacter)
  })

  it('albescent renders the na KIT through a wrapper, not a costume of its own', () => {
    // Every Albescent registration is a WRAPPER rather than a skin (ADR-0027):
    // `AlbescentEditCharacter` returns `DefaultEditCharacter` inside one classed
    // div, so `data-skin` below is the na page's own and the whole delta is that
    // the two spectrum rings start turning.
    const Archetype = archetypeFor('albescent')
    expect(Archetype).not.toBe(DefaultEditCharacter)
    expect(renderFor('albescent', 'mobile')).toContain('data-skin="default"')
  })
})

describe('every registered archetype renders at both widths', () => {
  for (const width of ['desktop', 'mobile'] as const) {
    it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(`renders "%s" on ${width}`, (slug) => {
      // The page exists and carries the display name — the one slot no skin may
      // drop, since it is the only value the save path requires.
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
  // It used to be phone-only: a desktop player could not delete a character at
  // all, and the slot the fan-out has to inherit did not exist on the wide page.
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
    // The confirm is behind a tap. A page that arrived already asking "delete
    // this character?" would be reading its own weight wrong.
    const text = renderFor(UNAFFILIATED_FACTION_SLUG, 'mobile').replace(/<[^>]*>/g, '')
    expect(text).not.toContain("This can't be undone")
  })
})

describe('the focus ring survives every skin, at both widths (#2825)', () => {
  /* #2488's other half. That issue swept the eight CREATE archetypes for an
     inline `outline: none` with nothing in its place, and the guard it left
     behind (`createCharacterFields.test.tsx`) sweeps that registry — so the same
     two declarations on the EDIT page went on shipping, invisible to it. The
     seam is the rendered field on the surface the player is actually on: reading
     sources one at a time is how #2488 stayed at two archetypes when the defect
     was on seven.

     A programmatic `element.focus()` cannot ask this question — it reports
     `:focus-visible false` and `outline-style: none` even on a plate whose ring
     works — so what is asserted is the markup that DECIDES the ring, not a
     computed style. The painted pixel is visual QA. */

  /** Every `<input>`/`<textarea>` a caret can land in, with its attributes.
   *  File inputs are out of scope for the same reason they are on create: each
   *  is hidden behind a button that takes the focus itself. */
  function textFields(html: string): string[] {
    return [...html.matchAll(/<(?:input|textarea)\b([^>]*)>/g)]
      .map(([, attrs]) => attrs)
      .filter((attrs) => !/type="(?:file|hidden)"/.test(attrs))
  }

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
        // `[data-composer-field]:focus-visible` (#2266) — `currentColor` at a
        // negative offset, the ring seven of the eight create plates take —
        // rather than a second bespoke focus treatment minted for this surface.
        // The one documented exception on create is Singularity, which keeps the
        // user agent's ring and says so in its header; no edit skin claims that,
        // and one that did would amend this row with its reason rather than
        // quietly drop the indicator.
        for (const field of textFields(renderFor(slug, width))) {
          expect(field, `no shared ring on: ${field.trim()}`).toContain('data-composer-field')
        }
      },
    )
  }
})

describe('the phone column names every control it draws a <label> for (#2834)', () => {
  /* `createCharacterFields.test.tsx`'s "a label that names no control is not
     drawn as a <label>" guard sweeps the createCharacter registry only — the
     `na` create archetype used to draw orphan <label>s, got fixed, and the
     guard was scoped to the surface it was fixed on. The edit registry carried
     the same shape (`MobileColumn`'s three phone-column fields: a <label>
     sibling of its <input>, no `htmlFor`, no `id`) and was never swept, so it
     shipped unnoticed until #2834. This extends the sweep here rather than
     standing up a third file, using the same `renderFor` this file already
     drives the registry through.

     MOBILE ONLY, on purpose. `DesktopPlate` associates by WRAPPING its
     <input> in the <label> (valid implicit association, no `for` needed) —
     a shape a bare "every <label> needs `for`" regex cannot tell from an
     orphan one, so the check below only counts a label an orphan when it
     neither carries `for` nor wraps the field it names. */
  function orphanLabels(html: string): string[] {
    const found: string[] = []
    for (const [whole, attrs, inner] of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
      const hasFor = /\bfor="[^"]*"/.test(attrs)
      const wrapsControl = /<(?:input|textarea)\b/.test(inner)
      if (!hasFor && !wrapsControl) found.push(whole.trim())
    }
    return found
  }

  it.each([...REGISTERED, UNAFFILIATED_FACTION_SLUG])(
    'slug "%s" draws no orphan <label> on mobile',
    (slug) => {
      const html = renderFor(slug, 'mobile')
      expect(orphanLabels(html), 'a <label> with nothing to point at').toEqual([])
    },
  )
})
