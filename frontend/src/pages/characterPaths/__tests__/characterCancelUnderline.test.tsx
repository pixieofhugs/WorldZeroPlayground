/**
 * Cancel is underlined text on every character-form kit (#3074). Owner ruling:
 * no fill or border, so the underline alone separates it from adjacent prose.
 * Roster derived like `createCharacterStructure.test.tsx`; ink, face and
 * position are each kit's own.
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
    /** Registered skins plus `''` (the na kit). */
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
        // Still a text action, not a drawn button.
        expect(style).toMatch(/background:(transparent|none)/)
        expect(style).toMatch(/border:(none|0)/)
      }
    })
  },
)
