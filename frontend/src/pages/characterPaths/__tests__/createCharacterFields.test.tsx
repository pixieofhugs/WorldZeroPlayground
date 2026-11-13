/**
 * Character-creation fields as keyboard and screen reader meet them (#2488).
 * Sweeps the registry at both widths, since per-file reading missed five of
 * seven: every text field is named, and none suppresses its focus outline.
 *
 * Forms are placeholder-only (#2793), so the name is `aria-label` equal to the
 * placeholder. "No suppression" rather than "carries the shared ring": inline
 * `outline: none` beats any stylesheet (#2266), while the UA ring is still a
 * ring (Singularity keeps it on purpose). File inputs sit behind self-naming
 * buttons (#1149), so they are skipped.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import type { CreateCharacterState } from '../useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

/** Every registered skin plus `''`, which resolves to na like an unknown slug. */
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
  const Archetype = resolveVariant(surfaceMap('createCharacter'), slug)
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
    // Not a count: the derivation keeps the next skin covered.
    expect(ARCHETYPES.length).toBeGreaterThan(1)
  })

  it.each(CASES)('%s on %s: the placeholder is every field’s accessible name', (_name, slug, width) => {
    const html = renderSkin(slug, width)
    const fields = textFields(html)
    expect(fields.length, 'the skin draws at least the name field').toBeGreaterThan(0)
    for (const field of fields) {
      const name = attr(field, 'aria-label')
      expect(name, `a textbox with no accessible name: ${field.trim()}`).toBeTruthy()
      // One string for SR and sighted players (#2793).
      expect(attr(field, 'placeholder'), `placeholder and aria-label disagree on "${name}"`).toBe(name)
    }
  })

  it.each(CASES)('%s on %s: no field suppresses its focus ring', (_name, slug, width) => {
    const html = renderSkin(slug, width)
    for (const field of textFields(html)) {
      expect(attr(field, 'style') ?? '', `outline killed on ${attr(field, 'id')}`)
        .not.toMatch(/outline:\s*none/)
    }
  })

  it.each(CASES)('%s on %s: draws no visible field label at all', (_name, slug, width) => {
    // Placeholder-only (#2793), so zero <label>s; re-adding one changes this row.
    const labels = [...renderSkin(slug, width).matchAll(/<label\b[^>]*>/g)].map(([whole]) => whole)
    expect(labels, 'a visible label survives on a placeholder-only form').toEqual([])
  })
})
