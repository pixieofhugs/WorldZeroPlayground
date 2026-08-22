/**
 * The "Answer a calling" picker on character creation (#2223) — both mounts.
 *
 * Two defects, one surface:
 *  1. each option was a 12px coloured disc, a placeholder standing in for a mark
 *     `FactionSigil` already dispatches per slug (the dispatcher is what the task
 *     cards, the filter facet and the propose-task chips all draw);
 *  2. the mobile explainer asserted a precondition that does not exist — "you'll
 *     pick a faction after your first task". Faction choice is gated by
 *     invitation (ADR-0022), not by completing anything: `defect_to_faction` has
 *     no level check, so an account holding a current-era invitation can join at
 *     creation. Owner ruling: delete the false claim and do NOT replace it with
 *     the real rule — nudge, don't explain.
 *
 * The seam is the rendered markup of the two skins, because that is where both
 * decisions live: `useCreateCharacter` is untouched by either half.
 *
 * SINCE #2346 BOTH SKINS ARE BRANCHES OF ONE ARCHETYPE, so the form factor is
 * mocked rather than inferred. It used to be enough that `useFormFactor` answers
 * 'desktop' under `renderToStaticMarkup` (no matchMedia) and that the phone skin
 * was a separate module taking `state` as a prop. Now
 * `DefaultCreateCharacter` reads the hook itself and picks the branch, so
 * rendering it un-mocked would give BOTH mounts the desktop column and quietly
 * assert the same markup twice.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CreateCharacterState } from '../useCreateCharacter'
import FactionSigil from '../../../components/sigil/FactionSigil'

const hoisted = vi.hoisted(() => ({
  state: null as CreateCharacterState | null,
  formFactor: 'desktop' as 'mobile' | 'desktop',
}))

vi.mock('../useCreateCharacter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useCreateCharacter')>()),
  useCreateCharacter: () => hoisted.state,
}))

vi.mock('../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useFormFactor')>()),
  useFormFactor: () => hoisted.formFactor,
}))

const CreateCharacter = (await import('../../CreateCharacter')).default
const DefaultCreateCharacter = (await import('../archetypes/DefaultCreateCharacter')).default

/** The size both pickers draw the mark at — a disc's 12px is below the floor the marks read at. */
const PICKER_SIGIL = 18

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

const INVITED = ['coven', 'everymen', 'singularity']

function invitedState(): CreateCharacterState {
  return createState({ invited: INVITED, showPicker: true })
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/**
 * The two mounts. Each pins the form factor, because one archetype now draws
 * both branches (#2346) — the phone one directly, the desktop one through the
 * page's own dispatch, which is still the only way to reach it un-exported.
 */
function renderMobile(state: CreateCharacterState) {
  hoisted.formFactor = 'mobile'
  return render(<DefaultCreateCharacter state={state} />)
}

function renderDesktop(state: CreateCharacterState) {
  hoisted.formFactor = 'desktop'
  hoisted.state = state
  return render(<CreateCharacter />)
}

describe('the calling picker wears the faction sigils (#2223)', () => {
  for (const [mount, renderAt] of [['mobile', renderMobile], ['desktop', renderDesktop]] as const) {
    it(`draws each invited faction's own mark, not a coloured disc — ${mount}`, () => {
      const { html } = renderAt(invitedState())
      for (const slug of INVITED) {
        // Exactly what the dispatcher draws: the picker owns no drawing of its own.
        const mark = renderToStaticMarkup(<FactionSigil slug={slug} size={PICKER_SIGIL} />)
        expect(html, `${slug} mark`).toContain(mark)
      }
      // The placeholder is gone: no 12px hue-filled circle anywhere in the row.
      expect(html, 'no placeholder disc').not.toMatch(/width:12px;height:12px;border-radius:50%/)
    })
  }
})

describe('the calling copy asserts no precondition (#2223)', () => {
  it('no longer claims a task must be completed first', () => {
    // The literal defect the player reported, on the mount they reported it on.
    for (const state of [invitedState(), createState({})]) {
      expect(renderMobile(state).text).not.toMatch(/first task/i)
    }
  })

  it('nudges the invited player toward the callings in front of them', () => {
    expect(renderMobile(invitedState()).text).toContain('Some of these already know you.')
  })

  it('says nothing about "these" when there is no picker to point at', () => {
    // An account holding no invitations renders no options, so a hint that
    // deictically references them would point at an empty page.
    const { text } = renderMobile(createState({}))
    expect(text).not.toContain('Some of these already know you.')
    expect(text, 'the born-unaffiliated explainer survives').toContain('Unaffiliated')
  })
})
