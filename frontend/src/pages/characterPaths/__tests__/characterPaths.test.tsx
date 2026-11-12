/** Character-paths behaviour (#516): create payload, Default create/edit slots, switcher rows. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import { buildCreatePayload, canSubmitName } from '../useCreateCharacter'
import { createObjectUrlSlot } from '../useAvatarPicker'
import type { EditCharacterState } from '../useEditCharacter'
import DefaultCreateCharacter from '../archetypes/DefaultCreateCharacter'
import DefaultEditCharacter from '../archetypes/DefaultEditCharacter'
import { CharacterSwitcherRows } from '../../../components/CharacterSwitcherSheet'
import { aCharacter, aCreateCharacterState, anEditCharacterState } from '../../../test/fixtures'
import type { CharacterOut } from '../../../api/auth'

/**
 * Both Default kits are one responsive tree; un-mocked `useFormFactor` answers
 * 'desktop' under SSR, so phone cases must pin the factor.
 */
const factor = vi.hoisted(() => ({ value: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => factor.value,
}))

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** Shared builder (#2991); only fields these tests read back are set. */
const character = (overrides: Partial<CharacterOut>): CharacterOut =>
  aCharacter({
    id: 1,
    username: 'molly',
    display_name: 'Molly',
    bio: 'Doing very human things.',
    level: 4,
    score: 340,
    all_time_score: 340,
    ...overrides,
  })

/** `canSubmit` is derived via the hook's own rule, not hand-set. */
function editState(overrides: Partial<EditCharacterState>): EditCharacterState {
  const displayName = overrides.displayName ?? 'Molly'
  const saving = overrides.saving ?? false
  return anEditCharacterState({
    character: character({}),
    displayName,
    bio: 'Doing very human things.',
    tagline: 'Slow spells, strong tea.',
    location: '',
    saving,
    // Builder defaults this to `true`; the #1697 rows need it to follow the name.
    canSubmit: canSubmitName(displayName, saving),
    ...overrides,
  })
}

describe('buildCreatePayload — born unaffiliated (ADR-0019)', () => {
  it('sends no faction when none is picked', () => {
    expect(buildCreatePayload('Wren', '', '', '', []).faction_slug).toBeUndefined()
  })

  it('never sends a faction the account was not invited to', () => {
    expect(buildCreatePayload('Wren', '', '', 'wow', []).faction_slug).toBeUndefined()
    expect(buildCreatePayload('Wren', '', '', 'wow', ['everymen']).faction_slug).toBeUndefined()
  })

  it('carries an invited faction when picked', () => {
    expect(buildCreatePayload('Wren', '', '', 'wow', ['wow']).faction_slug).toBe('wow')
  })

  it('trims the display name', () => {
    expect(buildCreatePayload('  Wren  ', '', '', '', []).display_name).toBe('Wren')
  })
})

describe('buildCreatePayload — tagline is its own field (#1628)', () => {
  it('carries a tagline without touching bio', () => {
    const payload = buildCreatePayload('Wren', 'A long paragraph.', 'Slow spells, strong tea.', '', [])
    expect(payload.tagline).toBe('Slow spells, strong tea.')
    expect(payload.bio, 'bio is untouched').toBe('A long paragraph.')
  })

  /**
   * Desktop create's tagline is a textarea, the only path that can send a
   * newline; the tagline slot is meant to wrap (#1629). `bio` keeps breaks.
   */
  it('collapses a typed newline rather than sending it', () => {
    const payload = buildCreatePayload('Wren', '', 'Slow spells,\n  strong tea.', '', [])
    expect(payload.tagline).toBe('Slow spells, strong tea.')
  })

  it('omits an empty tagline rather than sending whitespace', () => {
    expect(buildCreatePayload('Wren', '', '', '', []).tagline).toBeUndefined()
    expect(buildCreatePayload('Wren', '', '   ', '', []).tagline).toBeUndefined()
  })

  it('never seeds the tagline from bio — an empty slot stays empty', () => {
    // Owner ruling: an empty slot stays hidden, never filled from bio.
    const payload = buildCreatePayload('Wren', 'Cartographer of small kindnesses.', '', '', [])
    expect(payload.tagline).toBeUndefined()
  })
})

/** One submit gate for create and edit (#1697). */
describe('canSubmitName — the shared submit gate', () => {
  it('refuses a name that is only whitespace', () => {
    expect(canSubmitName('', false)).toBe(false)
    expect(canSubmitName('   ', false)).toBe(false)
    expect(canSubmitName('\t\n ', false)).toBe(false)
  })

  it('accepts a real name, padded or not', () => {
    expect(canSubmitName('Wren', false)).toBe(true)
    expect(canSubmitName('  Wren  ', false)).toBe(true)
  })

  it('stays closed while a request is in flight', () => {
    expect(canSubmitName('Wren', true)).toBe(false)
  })
})

/**
 * The na create kit's own slots (#2992), at both widths: one tree, so the two
 * must not diverge. Field set / exit order live in `createCharacterStructure`.
 */
describe('DefaultCreateCharacter — the na kit’s slots, identical at both widths', () => {
  afterEach(() => { factor.value = 'desktop' })

  const WIDTHS = ['mobile', 'desktop'] as const

  const at = (width: (typeof WIDTHS)[number]) => {
    factor.value = width
    return render(<DefaultCreateCharacter state={aCreateCharacterState({})} />)
  }

  it.each(WIDTHS)('renders the name field, the commit and the explainer — %s', (width) => {
    const { html, text } = at(width)
    expect(html, 'name input').toContain('value="Molly"')
    // One commit at either width; `createCharacterStructure` counts the controls.
    expect(text, 'the commit').toContain('step out')
    expect(text, 'born-unaffiliated explainer').toContain('Unaffiliated')
  })

  it.each(WIDTHS)('carries the live credential preview — %s', (width) => {
    // #2992: the preview must be in the sheet at both widths.
    const { html, text } = at(width)
    expect(text, 'the preview shows the name being typed').toContain('Molly')
    expect(html, 'the portrait ring is the upload affordance').toContain('aria-label="Click to upload a photo"')
  })

  // #1149: the portrait control names itself, not a glyph or alt text.
  it.each(WIDTHS)('names the portrait control, and reports what is chosen — %s', (width) => {
    const { text } = at(width)
    expect(text, 'the picker button').toContain('Choose a photo')
    expect(text, 'and the status line beside it').toContain('No photo chosen yet')
  })
})

/**
 * The na edit kit's own slots (#2991), at both widths: one tree, so the two
 * must not diverge. Field set / tail order live in `editCharacterStructure`.
 */
describe('DefaultEditCharacter — the na kit’s slots, identical at both widths', () => {
  afterEach(() => { factor.value = 'desktop' })

  const WIDTHS = ['mobile', 'desktop'] as const
  const at = (width: (typeof WIDTHS)[number], state: EditCharacterState) => {
    factor.value = width
    return render(<DefaultEditCharacter state={state} />)
  }

  it.each(WIDTHS)('renders name, story, tagline, LOCATION, faction link-out, delete and Save — %s', (width) => {
    const { html, text } = at(width, editState({}))
    expect(html, 'name input').toContain('value="Molly"')
    // Fields are named from inside (#2793); on an edit form that's the SR name.
    expect(html, 'story field').toContain('aria-label="Character bio"')
    expect(html, 'story value is the bio').toContain('>Doing very human things.</textarea>')
    expect(html, 'tagline field').toContain('aria-label="Character Catchphrase"')
    expect(html, 'tagline value is the tagline').toContain('>Slow spells, strong tea.</textarea>')
    // Handle and location: the fields the old phone column dropped (#2991).
    expect(html, 'the handle readout').toContain('value="@molly"')
    expect(html, 'the location field').toContain('aria-label="Location (SFO, PDX, YYZ)"')
    // Unaffiliated links to the DIRECTORY: `na` is seeded hidden, so
    // `/factions/na` renders "Faction not found".
    expect(html, 'faction link-out').toContain('href="/factions"')
    expect(html, 'not the hidden na detail page').not.toContain('href="/factions/na"')
    expect(text, 'unaffiliated').toContain('Unaffiliated')
    expect(text, 'delete affordance').toContain('Delete this character')
    expect(text, 'the one commit').toContain('Save Changes')
  })

  // #1628: story and tagline must stay separately labelled, bound and capped.
  it.each(WIDTHS)('keeps the story and the tagline as two distinct capped fields — %s', (width) => {
    const { html } = at(width, editState({ bio: 'B'.repeat(20), tagline: 'T'.repeat(20) }))
    expect(html, 'the long-form field is capped at bio length').toContain('maxLength="500"')
    expect(html, 'the slogan field is capped at 140').toContain('maxLength="140"')
    // Both are textareas, so the value is the child, not an attribute.
    expect(html, 'each field holds its own value').toContain(`>${'B'.repeat(20)}</textarea>`)
    expect(html).toContain(`>${'T'.repeat(20)}</textarea>`)
  })

  it.each(WIDTHS)('counts the tagline against its cap — %s', (width) => {
    const { text } = at(width, editState({ tagline: 'abcde' }))
    expect(text).toContain('5 / 140')
  })

  it.each(WIDTHS)('links out to a joined faction detail page — %s', (width) => {
    const { html } = at(width, editState({ character: character({ faction_slug: 'wow' }) }))
    expect(html).toContain('href="/factions/wow"')
  })

  // #1149: the card's ring and `PortraitPicker` each carry their own name.
  it.each(WIDTHS)('names both portrait controls, and reports what is chosen (#1149) — %s', (width) => {
    const { html, text } = at(width, editState({}))
    expect(html, "the card's ring is an upload affordance").toContain('aria-label="Click to upload a photo"')
    expect(text, 'the picker button').toContain('Choose a photo')
    expect(text, 'and the status line beside it').toContain('No photo chosen yet')
  })

  /**
   * #1697: a blank name would otherwise reach the server and surface raw
   * Pydantic prose outside i18n (ADR-0032).
   */
  it.each(WIDTHS)('disables Save when the name is blank, so the 422 is unreachable (#1697) — %s', (width) => {
    const { html } = at(width, editState({ displayName: '   ' }))
    expect(html, 'the commit is closed').toContain('type="submit" disabled=""')
  })

  it.each(WIDTHS)('leaves Save open for a real name — %s', (width) => {
    const { html } = at(width, editState({ displayName: 'Molly' }))
    expect(html).not.toContain('type="submit" disabled=""')
  })

  it.each(WIDTHS)('shows a freshly cropped portrait (preview) over the persisted avatar (#985) — %s', (width) => {
    const { html } = at(width, editState({
      avatarPreview: 'blob:preview-123',
      character: character({ avatar_url: 'avatars/old.png' }),
    }))
    expect(html, 'the preview object URL is rendered').toContain('src="blob:preview-123"')
    expect(html, 'the stale persisted avatar is not').not.toContain('old.png')
  })
})

describe('useAvatarPicker preview lifecycle — createObjectUrlSlot (#985)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mints a preview URL on confirm and revokes the prior one when replaced', () => {
    let counter = 0
    const create = vi.fn(() => `blob:preview-${++counter}`)
    const revoke = vi.fn()
    // Node has no object-URL API.
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })

    const slot = createObjectUrlSlot()
    const blob = new Blob(['x'])

    const first = slot.set(blob)
    expect(first).toBe('blob:preview-1')
    expect(create).toHaveBeenCalledTimes(1)
    expect(revoke).not.toHaveBeenCalled()

    const second = slot.set(blob)
    expect(second).toBe('blob:preview-2')
    expect(create).toHaveBeenCalledTimes(2)
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith('blob:preview-1')

    slot.revoke()
    expect(revoke).toHaveBeenCalledTimes(2)
    expect(revoke).toHaveBeenLastCalledWith('blob:preview-2')
    expect(slot.current()).toBeNull()
  })
})

describe('CharacterSwitcherRows — selection surface', () => {
  const roster = [character({ id: 1, display_name: 'Molly' }), character({ id: 2, display_name: 'Wren', level: 1, score: 20 })]

  it('lists every life, checkmarks the active one, leaves others tappable', () => {
    const { html, text } = render(
      <CharacterSwitcherRows lives={roster} activeCharacterId={1} onSelect={() => {}} />,
    )
    expect(text).toContain('Molly')
    expect(text).toContain('Wren')
    expect(html).toContain('data-active="true"')
    expect(html).toContain('data-active="false"')
    expect(html).toMatch(/data-testid="switcher-row-1"[^>]*data-active="true"/)
    expect(html).toMatch(/data-testid="switcher-row-2"[^>]*data-active="false"/)
    expect(text.toLowerCase()).toContain('tap to use')
  })
})
