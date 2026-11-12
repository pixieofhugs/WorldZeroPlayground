/**
 * The "Answer a calling" picker on character creation (#2223), both mounts:
 * options draw `FactionSigil`, not a placeholder disc; and the copy states no
 * precondition (faction choice is invitation-gated, ADR-0022). Owner ruling:
 * nudge, don't explain. Form factor is mocked because one archetype reads the
 * hook and picks the branch; un-mocked both mounts would be desktop.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import '../../../i18n'
import type { CreateCharacterState } from '../useCreateCharacter'
import { aCreateCharacterState } from '../../../test/fixtures'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { factionName, setAlbescentRevealed } from '../../../utils/factions'

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

/** Pickers' sigil size; 12px is below where marks read. */
const PICKER_SIGIL = 18

const INVITED = ['coven', 'everymen', 'singularity']

function invitedState(): CreateCharacterState {
  return aCreateCharacterState({ invited: INVITED, showPicker: true })
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** Desktop is reached through the page's own dispatch. */
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
        const mark = renderToStaticMarkup(<FactionSigil slug={slug} size={PICKER_SIGIL} />)
        expect(html, `${slug} mark`).toContain(mark)
      }
      expect(html, 'no placeholder disc').not.toMatch(/width:12px;height:12px;border-radius:50%/)
    })
  }
})

describe('the calling copy asserts no precondition (#2223)', () => {
  it('no longer claims a task must be completed first', () => {
    for (const state of [invitedState(), aCreateCharacterState({})]) {
      expect(renderMobile(state).text).not.toMatch(/first task/i)
    }
  })

  it('nudges the invited player toward the callings in front of them', () => {
    expect(renderMobile(invitedState()).text).toContain('Some of these already know you.')
  })

  it('says nothing about "these" when there is no picker to point at', () => {
    // No invitations, no options: a "these" hint would point at nothing.
    const { text } = renderMobile(aCreateCharacterState({}))
    expect(text).not.toContain('Some of these already know you.')
    expect(text, 'the born-unaffiliated explainer survives').toContain('Unaffiliated')
  })
})

/**
 * #2518: a qualifying account was offered `albescent` but saw it masked. Reveal
 * now happens on qualify (`services/albescent_reveal.py`); these pin that the
 * tile label routes through `factionName`'s mask. The flag is module-level
 * (#1891), so every case resets it.
 */
describe('the Albescent tile is named once the account qualifies (#2518)', () => {
  const WITH_ALBESCENT = [...INVITED, 'albescent']

  afterEach(() => setAlbescentRevealed(false))

  function pickerWithAlbescent(): CreateCharacterState {
    return aCreateCharacterState({ invited: WITH_ALBESCENT, showPicker: true })
  }

  for (const [mount, renderAt] of [['mobile', renderMobile], ['desktop', renderDesktop]] as const) {
    it(`prints the real name for a revealed account — ${mount}`, () => {
      setAlbescentRevealed(true)
      expect(renderAt(pickerWithAlbescent()).text).toContain('Albescent')
    })

    it(`still masks the name for an unrevealed viewer — ${mount}`, () => {
      // Unreachable from the server now, but proves the label goes THROUGH the
      // mask; a hardcoded name would pass the case above and leak.
      setAlbescentRevealed(false)
      expect(renderAt(pickerWithAlbescent()).text).not.toContain('Albescent')
    })
  }

  it('gives every offered calling its own label — no two "Unaffiliated" rows', () => {
    // A masked Albescent beside `na` repeats a label (ADR-0027).
    setAlbescentRevealed(true)
    const labels = [...WITH_ALBESCENT, 'na'].map(factionName)
    expect(new Set(labels).size, labels.join(' / ')).toBe(labels.length)
  })

  it('the mark and the name agree — labyrinth beside the real word', () => {
    // `FactionSigil` never gated `albescent`; with the name revealed they agree.
    setAlbescentRevealed(true)
    const { html, text } = renderMobile(pickerWithAlbescent())
    const mark = renderToStaticMarkup(<FactionSigil slug="albescent" size={PICKER_SIGIL} />)
    expect(html, 'the labyrinth is drawn').toContain(mark)
    expect(text, 'and the word beside it is the real one').toContain('Albescent')
  })
})
