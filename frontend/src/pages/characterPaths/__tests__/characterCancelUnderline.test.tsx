/**
 * Cancel is a quiet text action on the character forms, and it is underlined on
 * every kit (#3074).
 *
 * Owner ruling: Cancel stays text — no fill, no border — so the underline is
 * the only thing telling it apart from the sentence beside it. On the na kit it
 * sits next to the "starts at" note in the same ink, and without the rule it
 * read as part of that note.
 *
 * THE SEAM is the rendered markup of every archetype the registry holds, on
 * both surfaces and at both widths: the inline style of the `<button>` whose own
 * text is the cancel word. The roster is `surfaceMap(...)` plus `''` (the na
 * kit), the same derivation `createCharacterStructure.test.tsx` uses, so a new
 * kit is held to this the day it registers.
 *
 * Not asserted: ink, face, or position. Each kit keeps its own, and the footer
 * order is `createCharacterStructure.test.tsx`'s.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import { aCharacter, anEditCharacterState } from '../../../test/fixtures'
import type { CreateCharacterState } from '../useCreateCharacter'

const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

const CANCEL = i18n.getFixedT(null, 'common')('actions.cancel')
const WIDTHS = ['desktop', 'mobile'] as const

const createState: CreateCharacterState = {
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
}

const SURFACES = {
  createCharacter: (slug: string) => {
    const Archetype = resolveVariant(surfaceMap('createCharacter'), slug)
    return <Archetype state={{ ...createState, factionSlug: slug }} />
  },
  editCharacter: (slug: string) => {
    const Archetype = resolveVariant(surfaceMap('editCharacter'), slug)
    return (
      <Archetype
        state={anEditCharacterState({ character: aCharacter({ faction_slug: slug }) })}
      />
    )
  },
} as const

/** The inline style of every `<button>` whose own text is the cancel word. */
function cancelStyles(html: string): string[] {
  const re = new RegExp(`<button\\b([^>]*)>\\s*${CANCEL}\\s*</button>`, 'g')
  return [...html.matchAll(re)].map(([, attrs]) => /style="([^"]*)"/.exec(attrs)?.[1] ?? '')
}

describe.each(Object.keys(SURFACES) as (keyof typeof SURFACES)[])(
  '%s: Cancel is underlined on every kit (#3074)',
  (surface) => {
    /** Every registered skin, plus the empty slug that lands on the na kit. */
    const ARCHETYPES = [...Object.keys(surfaceMap(surface)), '']
    const CASES = WIDTHS.flatMap((width) =>
      ARCHETYPES.map((slug) => [slug || 'na', width, slug] as const),
    )

    it('the roster is the registry, not a list kept by hand', () => {
      expect(ARCHETYPES.length).toBeGreaterThan(1)
    })

    it.each(CASES)('%s on %s', (_name, width, slug) => {
      factor.value = width
      let html: string
      try {
        html = renderToStaticMarkup(<MemoryRouter>{SURFACES[surface](slug)}</MemoryRouter>)
      } finally {
        factor.value = 'desktop'
      }
      const styles = cancelStyles(html)
      expect(styles, 'no textual cancel button on the page').not.toHaveLength(0)
      for (const style of styles) {
        expect(style).toContain('text-decoration:underline')
        // Still a text action: the ruling chose the underline OVER a drawn button.
        expect(style).toMatch(/background:(transparent|none)/)
        expect(style).toMatch(/border:(none|0)/)
      }
    })
  },
)
