/**
 * Character creation's fields, as a keyboard and a screen reader meet them
 * (#2488).
 *
 * THE SEAM IS THE RENDERED FIELD, not the file that draws it. #2488 was filed
 * against two archetypes by name, and reading the sources one at a time is how
 * it stayed at two: the same defect was on five more. So this sweeps the
 * registry — `surfaceMap('createCharacter')` plus the `na` fallback, which is
 * every archetype there is — renders each at both widths, and asks the markup
 * two questions no per-file grep can ask:
 *
 *   1. does every text field have a `<label for>` pointing at it?
 *   2. does any of them suppress its focus outline?
 *
 * WHY (2) IS "NO SUPPRESSION" AND NOT "CARRIES THE SHARED RING". An inline
 * `outline: none` beats any stylesheet, so a plate that sets it has no ring
 * whatever else it carries — that is exactly what #2266 found in the composer.
 * Strip the suppression and the worst case is the user agent's own ring, which
 * is a visible ring. `data-composer-field` (the #2266 rule, `currentColor` at a
 * negative offset) is what seven of the eight then take so the ring is the
 * skin's ink rather than browser chrome; Singularity deliberately keeps the UA
 * ring and says so in its header, and this row is true of both.
 *
 * File inputs are out of scope on purpose: every one of them is hidden behind a
 * button that names itself (`PortraitPicker`, #1149, and the phone column's
 * photo ring), so a `for` would point at something no pointer and no caret can
 * reach.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import type { CreateCharacterState } from '../useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const DefaultCreateCharacter = (await import('../archetypes/DefaultCreateCharacter')).default

/** Every registered skin, plus `''` — born unaffiliated, the `na` kit. */
const ARCHETYPES = [...Object.keys(surfaceMap('createCharacter')), '']

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
    showPicker: true,
    ...overrides,
  }
}

function renderSkin(slug: string, width: 'desktop' | 'mobile'): string {
  factor.value = width
  const Archetype = pickVariant(surfaceMap('createCharacter'), slug, DefaultCreateCharacter)
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state({ factionSlug: slug, invited: ['ephemerists', 'coven'] })} />
      </MemoryRouter>,
    )
  } finally {
    factor.value = 'desktop'
  }
}

/** Every `<input>`/`<textarea>` a caret can land in, with its attributes. */
function textFields(html: string): string[] {
  const found: string[] = []
  for (const [, attrs] of html.matchAll(/<(?:input|textarea)\b([^>]*)>/g)) {
    if (/type="(?:file|hidden)"/.test(attrs)) continue
    found.push(attrs)
  }
  return found
}

function attr(attrs: string, name: string): string | null {
  return new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? null
}

const WIDTHS = ['desktop', 'mobile'] as const
const CASES = WIDTHS.flatMap((width) => ARCHETYPES.map((slug) => [slug || 'na', slug, width] as const))

describe('every character-creation field is reachable', () => {
  it('the roster is the registry, not a list kept by hand', () => {
    // Eight archetypes as of #2488 — seven registrations plus the `na` kit the
    // rest fall back to. The count is not asserted; the derivation is what
    // keeps the next skin covered with nothing to append.
    expect(ARCHETYPES.length).toBeGreaterThan(1)
  })

  it.each(CASES)('%s on %s: a label points at every field', (_name, slug, width) => {
    const html = renderSkin(slug, width)
    const fields = textFields(html)
    expect(fields.length, 'the skin draws at least the name field').toBeGreaterThan(0)
    for (const field of fields) {
      const id = attr(field, 'id')
      expect(id, `an unlabelled textbox: ${field.trim()}`).toBeTruthy()
      expect(html, `no <label for="${id}">`).toContain(`for="${id}"`)
    }
  })

  it.each(CASES)('%s on %s: no field suppresses its focus ring', (_name, slug, width) => {
    const html = renderSkin(slug, width)
    for (const field of textFields(html)) {
      expect(attr(field, 'style') ?? '', `outline killed on ${attr(field, 'id')}`)
        .not.toMatch(/outline:\s*none/)
    }
  })

  it('a label that names no control is not drawn as a <label>', () => {
    // The portrait key and the calling grid are headings over a group of
    // buttons, not fields. `ComposerSection` already renders those as a <span>
    // when no `htmlFor` is passed; the `na` archetype used to draw them as
    // orphan <label>s, which is an accessible name attached to nothing.
    for (const width of WIDTHS) {
      const html = renderSkin('', width)
      const labels = [...html.matchAll(/<label\b([^>]*)>/g)].map(([, a]) => a)
      for (const label of labels) {
        expect(attr(label, 'for'), `orphan <label>: ${label.trim()}`).toBeTruthy()
      }
    }
  })
})
