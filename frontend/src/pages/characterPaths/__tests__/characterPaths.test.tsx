/**
 * Mobile character-paths behaviour (#516). No jsdom in this repo, so we assert
 * on renderToStaticMarkup output plus the pure payload builder:
 *  - create yields an UNAFFILIATED life unless an invited faction is picked;
 *  - the Default mobile create/edit skins emit their invariant slots;
 *  - the switcher lists the roster, checkmarks the active life, and leaves every
 *    other life a tappable select row (the selection surface).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import { buildCreatePayload, canSubmitName, type CreateCharacterState } from '../useCreateCharacter'
import { createObjectUrlSlot } from '../useAvatarPicker'
import type { EditCharacterState } from '../useEditCharacter'
import DefaultCreateCharacter from '../archetypes/DefaultCreateCharacter'
import DefaultEditCharacter from '../archetypes/DefaultEditCharacter'
import { CharacterSwitcherRows } from '../../../components/CharacterSwitcherSheet'
import type { CharacterOut } from '../../../api/auth'

/**
 * `DefaultCreateCharacter` is ONE responsive archetype since #2346 — the phone
 * column that used to be `mobileArchetypes/DefaultCreateCharacter` is a branch
 * inside it now. Un-mocked, `useFormFactor` answers 'desktop' under
 * `renderToStaticMarkup` (no matchMedia), so the phone assertions below have to
 * pin the factor or they would silently measure the desktop column instead.
 * `DefaultEditCharacter` is ONE responsive archetype too since #2537, so its
 * phone assertions pin the factor the same way.
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

function character(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'molly',
    display_name: 'Molly',
    bio: 'Doing very human things.',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 4,
    score: 340,
    all_time_score: 340,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function createState(overrides: Partial<CreateCharacterState>): CreateCharacterState {
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

/**
 * `canSubmit` is DERIVED here, through the same rule the hook calls, so a test
 * that sets `displayName` gets the gate the player would get — a hand-set
 * `canSubmit` would only ever assert the fixture back at itself.
 */
function editState(overrides: Partial<EditCharacterState>): EditCharacterState {
  const displayName = overrides.displayName ?? 'Molly'
  const saving = overrides.saving ?? false
  return {
    id: '1',
    character: character({}),
    loading: false,
    isOwner: true,
    displayName,
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
    saving,
    canSubmit: canSubmitName(displayName, saving),
    error: '',
    handleSubmit: () => {},
    deleting: false,
    handleDelete: () => {},
    ...overrides,
  }
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
   * Desktop create is a two-row `textarea` — 140 characters want more than one
   * row to read — while both edit surfaces are single-line `input`s. That makes
   * it the only branch that can put a literal newline on the wire, and #1629
   * lays this value into a 30px `max-width: 22ch` slot where it is meant to
   * WRAP rather than carry breaks the author chose. `bio` is the field that
   * keeps typed line breaks; that separation is why there are two fields.
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
    // The owner ruled the empty slot is hidden rather than filled. Copying a
    // paragraph's opening into a slogan slot would truncate mid-sentence and
    // make the two fields look like one, which is the confusion the split
    // exists to end.
    const payload = buildCreatePayload('Wren', 'Cartographer of small kindnesses.', '', '', [])
    expect(payload.tagline).toBeUndefined()
  })
})

/**
 * One rule, two forms (#1697). Create has gated on this since it shipped; edit
 * gated on nothing, so a rename to whitespace reached the server and came back
 * as Pydantic's own prose. Both hooks now call this, and both surfaces of each
 * form hang their submit control off the result.
 */
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

describe('DefaultCreateCharacter mobile skin', () => {
  beforeEach(() => { factor.value = 'mobile' })
  afterEach(() => { factor.value = 'desktop' })

  it('renders the name field and a sticky Create action', () => {
    const { html, text } = render(<DefaultCreateCharacter state={createState({})} />)
    expect(html, 'name input').toContain('value="Molly"')
    expect(text, 'sticky create').toContain('Create character')
    expect(text, 'born-unaffiliated explainer').toContain('Unaffiliated')
  })

  // #1149: the ring's accessible name used to fall through to the "+" glyph or,
  // once a portrait existed, to its alt text. It now matches the caption drawn
  // right beneath it, in both states.
  it('names the photo ring with its own caption', () => {
    const empty = render(<DefaultCreateCharacter state={createState({})} />)
    expect(empty.html, 'empty ring').toContain('aria-label="Add photo"')
    expect(empty.text, 'and the caption agrees').toContain('Add photo')

    const picked = render(<DefaultCreateCharacter state={createState({ avatarPreview: 'blob:p-1' })} />)
    expect(picked.html, 'ring holding a portrait').toContain('aria-label="Change photo"')
    expect(picked.text, 'and the caption agrees').toContain('Change photo')
  })
})

describe('DefaultEditCharacter mobile skin', () => {
  beforeEach(() => { factor.value = 'mobile' })
  afterEach(() => { factor.value = 'desktop' })

  it('renders name, story, tagline, faction link-out, delete and sticky Save', () => {
    const { html, text } = render(<DefaultEditCharacter state={editState({})} />)
    expect(html, 'name input').toContain('value="Molly"')
    // The three fields are named by the words inside them, not by a label above
    // them (#2793) — and on an edit form, which opens full, that name is the
    // only thing that says which box is which to a screen reader.
    expect(html, 'story field').toContain('aria-label="Character bio"')
    expect(html, 'story value is the bio').toContain('value="Doing very human things."')
    expect(html, 'tagline field').toContain('aria-label="Character Catchphrase"')
    expect(html, 'tagline value is the tagline').toContain('value="Slow spells, strong tea."')
    // Faction is read-only and links out — but an unaffiliated life goes to the
    // DIRECTORY, not to `/factions/na`.
    //
    // This fixture used to carry `faction_slug: null`, which no live payload can
    // produce: the column is `nullable=False` and every life starts on the era's
    // starting slug (#1400). The assertion was right for the wrong reason, and
    // aliasing the generated type is what exposed the fixture. `na` is seeded
    // HIDDEN (`backend/seed.py`), `GET /factions` returns visible rows only, and
    // `FactionDetail` derives from that list — so `/factions/na` renders
    // "Faction not found" for every unaffiliated player.
    expect(html, 'faction link-out').toContain('href="/factions"')
    expect(html, 'not the hidden na detail page').not.toContain('href="/factions/na"')
    expect(text, 'unaffiliated').toContain('Unaffiliated')
    expect(text, 'delete affordance').toContain('Delete this character')
    expect(text, 'sticky save').toContain('Save Changes')
  })

  // Until #1628 this skin labelled the 500-char `bio` input "Tagline". Now that
  // a real 140-char tagline exists beside it, the two must be separately
  // labelled, separately bound, and separately capped — one name over two
  // fields is exactly the confusion the split was made to end.
  it('keeps the story and the tagline as two distinct capped fields', () => {
    const { html } = render(
      <DefaultEditCharacter state={editState({ bio: 'B'.repeat(20), tagline: 'T'.repeat(20) })} />,
    )
    expect(html, 'the long-form field is capped at bio length').toContain('maxLength="500"')
    expect(html, 'the slogan field is capped at 140').toContain('maxLength="140"')
    expect(html, 'each input holds its own value').toContain(`value="${'B'.repeat(20)}"`)
    expect(html).toContain(`value="${'T'.repeat(20)}"`)
  })

  it('counts the tagline against its cap', () => {
    const { text } = render(<DefaultEditCharacter state={editState({ tagline: 'abcde' })} />)
    expect(text).toContain('5 / 140')
  })

  it('links out to a joined faction detail page', () => {
    const { html } = render(<DefaultEditCharacter state={editState({ character: character({ faction_slug: 'wow' }) })} />)
    expect(html).toContain('href="/factions/wow"')
  })

  it('names the photo ring with its own caption (#1149)', () => {
    const { html, text } = render(<DefaultEditCharacter state={editState({})} />)
    expect(html).toContain('aria-label="Change photo"')
    expect(text).toContain('Change photo')
  })

  /**
   * #1697: the create form gates submit on a non-blank trimmed name, the edit
   * form gated on nothing at all — so clearing the field and saving reached the
   * server, and the 422 `CharacterUpdate.display_name` has raised since #1686
   * rendered as raw Pydantic prose ("String should have at least 1 character"),
   * copy that never went through the i18n catalogue (ADR-0032).
   *
   * `editState` derives `canSubmit` through the same {@link canSubmitName} the
   * hooks call, so this asserts the rule and its wiring, not the fixture.
   */
  it('disables Save when the name is blank, so the 422 is unreachable (#1697)', () => {
    const { html } = render(<DefaultEditCharacter state={editState({ displayName: '   ' })} />)
    expect(html, 'the sticky Save bar is closed').toContain('type="submit" disabled=""')
  })

  it('leaves Save open for a real name', () => {
    const { html } = render(<DefaultEditCharacter state={editState({ displayName: 'Molly' })} />)
    expect(html).not.toContain('type="submit" disabled=""')
  })

  it('shows a freshly cropped portrait (preview) over the persisted avatar (#985)', () => {
    const state = editState({
      avatarPreview: 'blob:preview-123',
      character: character({ avatar_url: 'avatars/old.png' }),
    })
    const { html } = render(<DefaultEditCharacter state={state} />)
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
    // jsdom-less node has no object-URL API — provide the spies directly.
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })

    const slot = createObjectUrlSlot()
    const blob = new Blob(['x'])

    // First confirm: a URL is minted, nothing to revoke yet.
    const first = slot.set(blob)
    expect(first).toBe('blob:preview-1')
    expect(create).toHaveBeenCalledTimes(1)
    expect(revoke).not.toHaveBeenCalled()

    // Replacing the crop revokes the prior URL and mints a fresh one.
    const second = slot.set(blob)
    expect(second).toBe('blob:preview-2')
    expect(create).toHaveBeenCalledTimes(2)
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith('blob:preview-1')

    // Unmount cleanup releases the outstanding URL exactly once.
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
    // Active life is marked; the inactive one advertises the tap-to-switch action.
    expect(html).toContain('data-active="true"')
    expect(html).toContain('data-active="false"')
    // The active row carries the marked flag; the inactive row is the switch target.
    expect(html).toMatch(/data-testid="switcher-row-1"[^>]*data-active="true"/)
    expect(html).toMatch(/data-testid="switcher-row-2"[^>]*data-active="false"/)
    expect(text.toLowerCase()).toContain('tap to use')
  })
})
