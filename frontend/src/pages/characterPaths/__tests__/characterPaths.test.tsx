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
import { buildCreatePayload, canSubmitName } from '../useCreateCharacter'
import { createObjectUrlSlot } from '../useAvatarPicker'
import type { EditCharacterState } from '../useEditCharacter'
import DefaultCreateCharacter from '../archetypes/DefaultCreateCharacter'
import DefaultEditCharacter from '../archetypes/DefaultEditCharacter'
import { CharacterSwitcherRows } from '../../../components/CharacterSwitcherSheet'
import { aCharacter, aCreateCharacterState, anEditCharacterState } from '../../../test/fixtures'
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

/**
 * This file's character, on the SHARED builder (#2991).
 *
 * Three files had hand-built all fifteen wire fields — this one,
 * `editCharacterDispatch.test.tsx` and the structure guard — which is the
 * arithmetic `src/test/fixtures.ts` exists to stop. What stays here is only what
 * these tests read back: the handle, the name, and a level/score pair the
 * credential preview prints.
 */
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

/**
 * `canSubmit` is DERIVED here, through the same rule the hook calls, so a test
 * that sets `displayName` gets the gate the player would get — a hand-set
 * `canSubmit` would only ever assert the fixture back at itself.
 */
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
    // Derived, never handed in — see the note above. The shared builder defaults
    // it to `true`, which is the state a returning player arrives in; the rows
    // that assert the #1697 gate need it to follow the NAME instead.
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

/**
 * THE na CREATE KIT'S OWN SLOTS, AT BOTH WIDTHS (#2992).
 *
 * THIS BLOCK USED TO PIN `mobile` AND CALL ITSELF A PHONE TEST, and after #2992
 * that was a name for a failure mode that no longer exists: the phone branch is
 * gone — a sticky `Create character` bar, a 104px photo ring with its own
 * caption, a `Step 1 of 2` framing, all retired with their copy keys — so there
 * is one tree and pinning one width could only ever assert it twice under two
 * names. Every case below runs at BOTH widths instead, which is what makes them
 * able to fail for a width reason again: the two must not diverge.
 *
 * WHAT IS HERE AND WHAT IS NEXT DOOR. The field SET and the exit ORDER are
 * `createCharacterStructure.test.tsx`'s, asked of all nine kits from the
 * registry. These three are the na kit's own slots — the ones the retired branch
 * got wrong from the phone's side, and which no registry sweep would name: the
 * born-unaffiliated explainer only the phone used to carry, and the live
 * credential preview the WIDE branch used to drop below the fold.
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
    // ONE commit label at either width — the phone's second one went with the
    // sticky bar, and `createCharacterStructure` counts the controls.
    expect(text, 'the commit').toContain('step out')
    expect(text, 'born-unaffiliated explainer').toContain('Unaffiliated')
  })

  it.each(WIDTHS)('carries the live credential preview — %s', (width) => {
    // Defect 2 of #2992 from both sides: the phone column had no preview at all,
    // and the wide plate wrapped it below the fold under 634px. The card is
    // inside the sheet now, first, at both.
    const { html, text } = at(width)
    expect(text, 'the preview shows the name being typed').toContain('Molly')
    expect(html, 'the portrait ring is the upload affordance').toContain('aria-label="Click to upload a photo"')
  })

  // #1149: the portrait control names itself rather than falling through to a
  // glyph or to an alt text. `PortraitPicker` is that control at both widths now.
  it.each(WIDTHS)('names the portrait control, and reports what is chosen — %s', (width) => {
    const { text } = at(width)
    expect(text, 'the picker button').toContain('Choose a photo')
    expect(text, 'and the status line beside it').toContain('No photo chosen yet')
  })
})

/**
 * THE na EDIT KIT'S OWN SLOTS, AT BOTH WIDTHS (#2991).
 *
 * THE PHONE BRANCH IS GONE. `DefaultEditCharacter` mounts the composer chassis
 * as one responsive tree, so the sticky `Save Changes` bar, the 96px photo ring
 * with its own caption and the back chevron no longer exist at any width — and
 * neither does the branch's real defect, a field list three long where the
 * desktop plate's was five.
 *
 * SO THIS BLOCK NO LONGER PINS `mobile`, for the reason #2992's review gave for
 * the create block beside it: with one tree, a width-pinned case can only assert
 * the same markup twice under two names, and it can no longer fail for a width
 * reason. Every case runs at BOTH instead, which is the invariant that replaced
 * the branch — the two must not diverge.
 *
 * WHAT IS HERE AND WHAT IS NEXT DOOR. The field SET and the tail ORDER across
 * all ten kits are `editCharacterStructure.test.tsx`'s, asked of the registry.
 * These are the na kit's own slots — including the two the retired phone column
 * dropped, which is why they are named in the first case rather than left to the
 * registry sweep.
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
    // The fields are named by the words inside them, not by a label above them
    // (#2793) — and on an edit form, which opens full, that name is the only
    // thing that says which box is which to a screen reader.
    expect(html, 'story field').toContain('aria-label="Character bio"')
    expect(html, 'story value is the bio').toContain('>Doing very human things.</textarea>')
    expect(html, 'tagline field').toContain('aria-label="Character Catchphrase"')
    expect(html, 'tagline value is the tagline').toContain('>Slow spells, strong tea.</textarea>')
    // The two the phone column did not have at all, which is defect 1 of #2991.
    expect(html, 'the handle readout').toContain('value="@molly"')
    expect(html, 'the location field').toContain('aria-label="Location (SFO, PDX, YYZ)"')
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
    expect(text, 'the one commit').toContain('Save Changes')
  })

  // Until #1628 this skin labelled the 500-char `bio` input "Tagline". Now that
  // a real 140-char tagline exists beside it, the two must be separately
  // labelled, separately bound, and separately capped — one name over two
  // fields is exactly the confusion the split was made to end.
  it.each(WIDTHS)('keeps the story and the tagline as two distinct capped fields — %s', (width) => {
    const { html } = at(width, editState({ bio: 'B'.repeat(20), tagline: 'T'.repeat(20) }))
    expect(html, 'the long-form field is capped at bio length').toContain('maxLength="500"')
    expect(html, 'the slogan field is capped at 140').toContain('maxLength="140"')
    // Both are <textarea>s on the chassis, so the value is the child rather
    // than an attribute — the same shape the create kit renders.
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

  // #1149: the portrait control names itself rather than falling through to a
  // glyph or to an alt text. The phone column's ring-plus-caption retired with
  // the branch; the two controls that replace it are the credential card's
  // portrait ring and `PortraitPicker`, and each carries its own name.
  it.each(WIDTHS)('names both portrait controls, and reports what is chosen (#1149) — %s', (width) => {
    const { html, text } = at(width, editState({}))
    expect(html, "the card's ring is an upload affordance").toContain('aria-label="Click to upload a photo"')
    expect(text, 'the picker button').toContain('Choose a photo')
    expect(text, 'and the status line beside it').toContain('No photo chosen yet')
  })

  /**
   * #1697: the create form gates submit on a non-blank trimmed name, the edit
   * form gated on nothing at all — so clearing the field and saving reached the
   * server, and the 422 `CharacterUpdate.display_name` has raised since #1686
   * rendered as raw Pydantic prose ("String should have at least 1 character"),
   * copy that never went through the i18n catalogue (ADR-0032).
   *
   * `editState` derives `canSubmit` through the same {@link canSubmitName} the
   * hooks call, so this asserts the rule and its wiring, not the fixture. There
   * is ONE commit control at either width since #2991 — the phone's sticky bar
   * was the second, and `editCharacterStructure` counts them.
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
