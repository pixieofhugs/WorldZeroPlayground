/**
 * Edit Character's faction row is a PICKER, not a link (#3149).
 *
 * Owner ruling, 2026-10-13: "It should be like the faction picker in the create
 * character screen." That reverses #2537's "the row is a link" for any
 * character with somewhere to go.
 *
 * TWO SEAMS, because this harness has no DOM and a rule inlined in a hook body
 * cannot be driven (`useCreateCharacter`'s own note):
 *
 *   • the rendered markup of the shared `FactionRow` — what is offered, what is
 *     selected, when the confirm is on the page, and what a character with
 *     nowhere to go sees;
 *   • the two pure halves lifted out of `useEditCharacter` — `offeredFactions`
 *     (which factions the server would accept a move to) and `saveCharacter`
 *     (the order of the writes, which is what makes a refused move change
 *     nothing).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import '../../../i18n'
import i18n from '../../../i18n'
import formsCatalog from '../../../locales/en/forms.json'
import { ApiError, ApiNetworkError } from '../../../api/apiError'
import type { FactionPageOut } from '../../../api/factions'
import { JoinConfirm } from '../../../components/JoinControl'
import { resolveVariant } from '../../../utils/factionDispatch'
import { factionName } from '../../../utils/factions'
import { surfaceMap } from '../../../factions'
import { aCharacter, aCurrentUser, aFactionPicker, anEditCharacterState } from '../../../test/fixtures'

const api = vi.hoisted(() => ({
  chooseFaction: vi.fn(),
  updateCharacter: vi.fn(),
  uploadCharacterAvatar: vi.fn(),
}))

vi.mock('../../../api/factions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/factions')>()),
  chooseFaction: api.chooseFaction,
}))

vi.mock('../../../api/characters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/characters')>()),
  updateCharacter: api.updateCharacter,
  uploadCharacterAvatar: api.uploadCharacterAvatar,
}))

const { FactionRow } = await import('../editCharacterSlots')
const { offeredFactions, saveCharacter, isRefusedMove, saveFailureMessage } = await import('../useEditCharacter')
type FactionPicker = import('../useEditCharacter').FactionPicker

const factions = i18n.getFixedT(null, 'factions')
const render = (node: ReactElement): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

const picker = (over: Partial<FactionPicker> = {}): FactionPicker =>
  aFactionPicker({ offered: ['coven', 'ua'], ...over })

/** Each option button, as `[pressed, text]`, in source order. */
function options(html: string): Array<[string, string]> {
  return [...html.matchAll(/<button\b[^>]*aria-pressed="(true|false)"[^>]*>(.*?)<\/button>/g)].map(
    ([, pressed, inner]) => [pressed, inner.replace(/<[^>]*>/g, '')],
  )
}

describe('what the picker may offer — exactly what the server says is joinable', () => {
  const row = (slug: string, joinable: boolean, status: FactionPageOut['all_factions'][number]['status'] = 'not_invited') => ({
    slug,
    status,
    joinable,
  })
  const pageOf = (all_factions: FactionPageOut['all_factions']): FactionPageOut => ({
    current_faction_slug: 'wow',
    all_factions,
    invitations: [],
  })

  it('offers the rows the server marks joinable, and nothing else', () => {
    const page = pageOf([
      row('wow', false, 'member'),
      row('coven', true, 'invited'),
      row('ua', true, 'invited'),
      row('snide', false),
      row('everymen', false, 'defected'),
      row('na', false),
    ])
    expect(offeredFactions(page)).toEqual(['coven', 'ua'])
  })

  it('offers Albescent when the server says so, and not when it does not', () => {
    expect(offeredFactions(pageOf([row('albescent', true)]))).toEqual(['albescent'])
    expect(offeredFactions(pageOf([row('albescent', false)]))).toEqual([])
  })

  it('never offers the current faction: the server marks it not joinable', () => {
    expect(offeredFactions(pageOf([row('wow', false, 'member'), row('coven', true)]))).not.toContain('wow')
  })
})

describe('the row, for a character with somewhere to go', () => {
  it('lists the current faction selected, then each offered one', () => {
    const html = render(<FactionRow slug="wow" picker={picker()} />)
    expect(options(html)).toEqual([
      ['true', expect.stringContaining(factionName('wow'))],
      ['false', expect.stringContaining(factionName('coven'))],
      ['false', expect.stringContaining(factionName('ua'))],
    ])
    // A picker, not a way to the one page it cannot change to.
    expect(html).not.toContain('href=')
  })

  it('marks the PICK as selected once one is made', () => {
    const html = render(<FactionRow slug="coven" picker={picker({ picked: 'coven' })} />)
    expect(options(html).map(([pressed]) => pressed)).toEqual(['false', 'true', 'false'])
  })

  it('is plain buttons in a labelled group — the keyboard model Create Character has', () => {
    const html = render(<FactionRow slug="wow" picker={picker()} />)
    const group = html.match(/<div role="group" aria-labelledby="([^"]+)"/)
    expect(group).not.toBeNull()
    expect(html).toContain(`id="${group![1]}"`)
    for (const [tag] of html.matchAll(/<button\b[^>]*aria-pressed[^>]*>/g)) {
      // `type="button"`: the row sits inside the form and must never submit it.
      expect(tag).toContain('type="button"')
      expect(tag).not.toContain('disabled')
    }
  })

  it('asks before a defection, naming the faction being left', () => {
    const html = render(
      <FactionRow slug="coven" picker={picker({ picked: 'coven', confirming: true })} />,
    )
    const sentence = factions('detail.join.confirmSwitch', {
      faction: factionName('coven'),
      current: factionName('wow'),
    })
    expect(html.replace(/&#x27;/g, "'")).toContain(sentence)
    expect(html).toContain('data-join="cancel"')
    expect(html).toContain('data-join="confirm"')
  })

  it('does not ask until a save with a changed faction opens the question', () => {
    const html = render(<FactionRow slug="coven" picker={picker({ picked: 'coven' })} />)
    expect(html).not.toContain('data-join=')
  })
})

describe('the row, for a character with nowhere to go', () => {
  it('shows its faction as it did — no empty or disabled picker', () => {
    const html = render(<FactionRow slug="coven" picker={picker({ current: 'coven', picked: 'coven', offered: [] })} />)
    expect(html).toContain('href="/factions/coven"')
    expect(html).not.toContain('<button')
  })

  it('keeps an unaffiliated life with no letters on the road to the directory', () => {
    const html = render(<FactionRow slug="na" picker={picker({ current: 'na', picked: 'na', offered: [] })} />)
    expect(html).toContain('href="/factions"')
    expect(html).not.toContain('<button')
  })
})

describe('the help line is gone, not reworded', () => {
  it('has no catalog entry left for the copy editor to offer', () => {
    expect(formsCatalog.editCharacter).not.toHaveProperty('factionHelp')
  })

  it('and no row draws it', () => {
    for (const node of [<FactionRow slug="wow" />, <FactionRow slug="wow" picker={picker()} />]) {
      expect(render(node)).not.toContain('Factions tab')
    }
  })
})

describe('every archetype inherits the one picker', () => {
  const slugs = [...Object.keys(surfaceMap('editCharacter')), '']

  it.each(slugs.map((slug) => [slug || 'na', slug] as const))('%s', (_name, slug) => {
    const Archetype = resolveVariant(surfaceMap('editCharacter'), slug)
    const html = render(
      <Archetype
        state={anEditCharacterState({
          character: aCharacter({ faction_slug: slug || 'na' }),
          faction: picker({
            current: slug || 'na',
            picked: slug || 'na',
            // Two it is not already in — the row lists a faction once.
            offered: ['coven', 'ua', 'wow'].filter((offer) => offer !== slug).slice(0, 2),
          }),
        })}
      />,
    )
    expect(options(html)).toHaveLength(3)
  })
})

describe('the save: the move goes first, so a refusal changes nothing', () => {
  const fields = { display_name: 'Molly', bio: '', tagline: '', location: '' }
  const avatar = new File(['x'], 'a.png', { type: 'image/png' })

  beforeEach(() => {
    api.chooseFaction.mockReset()
    api.updateCharacter.mockReset().mockResolvedValue(aCharacter())
    api.uploadCharacterAvatar.mockReset().mockResolvedValue(aCharacter())
  })

  it('an unchanged faction never touches the join endpoint', async () => {
    const outcome = await saveCharacter(1, null, null, fields)
    expect(api.chooseFaction).not.toHaveBeenCalled()
    expect(api.updateCharacter).toHaveBeenCalledWith(1, fields)
    expect(outcome.failed).toBeNull()
  })

  it('a changed faction is moved, and the refreshed viewer handed back', async () => {
    const viewer = aCurrentUser()
    api.chooseFaction.mockResolvedValue(viewer)
    const outcome = await saveCharacter(1, 'coven', null, fields)
    expect(api.chooseFaction).toHaveBeenCalledWith('coven')
    expect(outcome.moved).toBe(viewer)
    expect(outcome.failed).toBeNull()
  })

  it('a refused move stops there: no portrait, no fields, and the reason kept', async () => {
    const refusal = new Error("You don't hold an invitation for that faction.")
    api.chooseFaction.mockRejectedValue(refusal)
    const outcome = await saveCharacter(1, 'coven', avatar, fields)
    expect(api.uploadCharacterAvatar).not.toHaveBeenCalled()
    expect(api.updateCharacter).not.toHaveBeenCalled()
    expect(outcome).toEqual({ moved: null, failed: { stage: 'faction', error: refusal } })
  })
})

/** The opening tag of the confirm's cancel or affirmative button. */
const joinTag = (html: string, which: 'cancel' | 'confirm'): string =>
  html.match(new RegExp(`<button\\b[^>]*data-join="${which}"[^>]*>`))![0]

describe('fix round: an irreversible move is never answered, lost or half-told by accident', () => {
  const httpError = (status: number, detail?: unknown) =>
    new ApiError(new Response(null, { status }), detail === undefined ? undefined : { detail })

  it('only a coded refusal drops the option — a timeout, offline or 5xx keeps it', () => {
    for (const status of [403, 404, 422]) expect(isRefusedMove(httpError(status))).toBe(true)
    for (const status of [401, 408, 429, 500, 502, 503]) expect(isRefusedMove(httpError(status))).toBe(false)
    expect(isRefusedMove(new ApiNetworkError(new TypeError('Failed to fetch')))).toBe(false)
    expect(isRefusedMove(new Error('boom'))).toBe(false)
  })

  it('the confirm opens with focus on CANCEL, never on the affirmative', () => {
    const html = render(<FactionRow slug="coven" picker={picker({ picked: 'coven', confirming: true })} />)
    expect(joinTag(html, 'cancel')).toContain('autofocus')
    expect(joinTag(html, 'confirm')).not.toContain('autofocus')
  })

  it("…and the letter popup's confirm still focuses its affirmative (#2130)", () => {
    const html = render(
      <JoinConfirm
        membership={{ currentFactionSlug: 'wow', join: async () => {}, joining: false, joinError: null }}
        name="Coven"
        skin={{ openStyle: {}, cancelStyle: {}, confirmStyle: {} }}
        joiningLabel="…"
        onCancel={() => {}}
        autoFocus
      />,
    )
    expect(joinTag(html, 'confirm')).toContain('autofocus')
    expect(joinTag(html, 'cancel')).not.toContain('autofocus')
  })

  it('no option can be pressed while a save is in flight', () => {
    const html = render(<FactionRow slug="coven" picker={picker({ picked: 'coven', saving: true })} />)
    const tags = [...html.matchAll(/<button\b[^>]*aria-pressed[^>]*>/g)].map(([tag]) => tag)
    expect(tags).toHaveLength(3)
    for (const tag of tags) expect(tag).toContain('disabled')
  })

  it('lists a faction once, even when the offer still names the one just joined', () => {
    const html = render(
      <FactionRow slug="coven" picker={picker({ current: 'coven', picked: 'coven', offered: ['coven', 'ua'] })} />,
    )
    expect(options(html).map(([pressed]) => pressed)).toEqual(['true', 'false'])
  })

  it('…and is the link again when that was all there was on offer', () => {
    const html = render(
      <FactionRow slug="coven" picker={picker({ current: 'coven', picked: 'coven', offered: ['coven'] })} />,
    )
    expect(html).toContain('href="/factions/coven"')
    expect(html).not.toContain('<button')
  })

  describe('a write that fails AFTER the move landed', () => {
    const fields = { display_name: 'Molly', bio: '', tagline: '', location: '' }
    const moved = aCurrentUser()
    const error = httpError(422, 'That name is taken.')

    beforeEach(() => {
      api.chooseFaction.mockReset().mockResolvedValue(moved)
      api.uploadCharacterAvatar.mockReset().mockResolvedValue(aCharacter())
      api.updateCharacter.mockReset().mockRejectedValue(error)
    })

    it('says the faction change went through and the rest did not', async () => {
      const outcome = await saveCharacter(1, 'coven', null, fields)
      expect(outcome).toEqual({ moved, failed: { stage: 'fields', error } })
      const message = saveFailureMessage(outcome)
      expect(message).toContain('That name is taken.')
      expect(message).toBe(
        i18n.t('forms:editCharacter.factionMovedRestFailed', { reason: 'That name is taken.' }),
      )
      expect(message).toMatch(/faction change went through/i)
    })

    it('says only the reason when no move was part of the save', async () => {
      const outcome = await saveCharacter(1, null, null, fields)
      expect(saveFailureMessage(outcome)).toBe('That name is taken.')
    })

    it('says only the reason when the move itself was what failed', () => {
      expect(saveFailureMessage({ moved: null, failed: { stage: 'faction', error } })).toBe('That name is taken.')
    })
  })
})
