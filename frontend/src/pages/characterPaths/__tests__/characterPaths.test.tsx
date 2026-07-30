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
import { describe, it, expect, vi, afterEach } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import { buildCreatePayload, type CreateCharacterState } from '../useCreateCharacter'
import { createObjectUrlSlot } from '../useAvatarPicker'
import type { EditCharacterState } from '../useEditCharacter'
import DefaultCreateCharacter from '../mobileArchetypes/DefaultCreateCharacter'
import DefaultEditCharacter from '../mobileArchetypes/DefaultEditCharacter'
import { CharacterSwitcherRows } from '../../../components/CharacterSwitcherSheet'
import type { CharacterOut } from '../../../api/auth'

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
    avatar_url: null,
    location: null,
    level: 4,
    score: 340,
    all_time_score: 340,
    faction_slug: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function createState(overrides: Partial<CreateCharacterState>): CreateCharacterState {
  return {
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: '',
    setBio: () => {},
    factionSlug: '',
    setFactionSlug: () => {},
    invited: [],
    avatarFile: null,
    avatarPreview: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarError: '',
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

function editState(overrides: Partial<EditCharacterState>): EditCharacterState {
  return {
    id: '1',
    character: character({}),
    loading: false,
    isOwner: true,
    displayName: 'Molly',
    setDisplayName: () => {},
    bio: 'Doing very human things.',
    setBio: () => {},
    location: '',
    setLocation: () => {},
    avatarFile: null,
    avatarSource: null,
    setAvatarSource: () => {},
    avatarPreview: null,
    avatarError: '',
    handleAvatarChange: () => {},
    handleAvatarConfirm: () => {},
    saving: false,
    error: '',
    handleSubmit: () => {},
    deleting: false,
    handleDelete: () => {},
    ...overrides,
  }
}

describe('buildCreatePayload — born unaffiliated (ADR-0019)', () => {
  it('sends no faction when none is picked', () => {
    expect(buildCreatePayload('Wren', '', '', []).faction_slug).toBeUndefined()
  })

  it('never sends a faction the account was not invited to', () => {
    expect(buildCreatePayload('Wren', '', 'wow', []).faction_slug).toBeUndefined()
    expect(buildCreatePayload('Wren', '', 'wow', ['everymen']).faction_slug).toBeUndefined()
  })

  it('carries an invited faction when picked', () => {
    expect(buildCreatePayload('Wren', '', 'wow', ['wow']).faction_slug).toBe('wow')
  })

  it('trims the display name', () => {
    expect(buildCreatePayload('  Wren  ', '', '', []).display_name).toBe('Wren')
  })
})

describe('DefaultCreateCharacter mobile skin', () => {
  it('renders the name field and a sticky Create action', () => {
    const { html, text } = render(<DefaultCreateCharacter state={createState({})} />)
    expect(html, 'name input').toContain('value="Molly"')
    expect(text, 'sticky create').toContain('Create character')
    expect(text, 'born-unaffiliated explainer').toContain('Unaffiliated')
  })
})

describe('DefaultEditCharacter mobile skin', () => {
  it('renders name, tagline, faction link-out, delete and sticky Save', () => {
    const { html, text } = render(<DefaultEditCharacter state={editState({})} />)
    expect(html, 'name input').toContain('value="Molly"')
    expect(text, 'tagline label (real bio field)').toContain('Tagline')
    expect(html, 'tagline value is the bio').toContain('value="Doing very human things."')
    // Faction is read-only and links out to the Factions surface.
    expect(html, 'faction link-out').toContain('href="/factions"')
    expect(text, 'unaffiliated').toContain('Unaffiliated')
    expect(text, 'delete affordance').toContain('Delete this character')
    expect(text, 'sticky save').toContain('Save Changes')
  })

  it('links out to a joined faction detail page', () => {
    const { html } = render(<DefaultEditCharacter state={editState({ character: character({ faction_slug: 'wow' }) })} />)
    expect(html).toContain('href="/factions/wow"')
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
