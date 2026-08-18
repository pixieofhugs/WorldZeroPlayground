/**
 * What the character sheet offers, and on what ground (#2111, #2109).
 *
 * THE SHEET IS THE ROSTER, not a menu (#2111). It lists the account's lives to
 * tap between; the buttons under them are a second thing entirely, and both had
 * gone wrong:
 *
 *  1. "Edit this character" led to `/characters/{id}/edit` — the destination the
 *     `EDIT` pill beside the trigger already reaches in one tap. Deleted.
 *  2. "Create new character" rendered unconditionally, so a player below the
 *     era's `second_character_level_required` was offered a button the server
 *     would refuse. #1560 is the standing ruling it breaks: a second life must
 *     not be advertised before the gate opens. Hidden — no locked face.
 *
 * The gate is `can_create_additional_character` off `/auth/me`, server-computed,
 * never a level comparison here.
 *
 * THE GROUND IS THE OTHER HALF (#2109). The sheet filled with
 * `--color-bg-surface`, which is ALPHA in both themes (72% white light, 4% white
 * dark) — so on the phone it composited to a see-through panel you could read
 * the page through. Pinned as a token assertion because the repo has no DOM and
 * no pixels: `--color-bg-page` is the opaque ground `ConfirmDialog`'s own bottom
 * sheet uses, and this asserts the sheet has not drifted back onto an alpha one.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import type { CurrentUser } from '../../api/auth'

const mocks = vi.hoisted(() => ({ user: null as CurrentUser | null }))

vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'mobile' }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, applyUser: () => {} }),
}))
// Read in an effect the static renderer never runs; mocked so the module graph
// does not drag the API transport in behind it.
vi.mock('../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => ({}),
}))

import CharacterSwitcherSheet from '../CharacterSwitcherSheet'

/** Only the fields this sheet asks of `/auth/me`. */
function currentUser(canCreateAdditional: boolean): CurrentUser {
  return { can_create_additional_character: canCreateAdditional } as CurrentUser
}

function sheet(canCreateAdditional: boolean): string {
  mocks.user = currentUser(canCreateAdditional)
  return renderToStaticMarkup(
    <MemoryRouter>
      <CharacterSwitcherSheet open activeCharacterId={42} onClose={() => {}} />
    </MemoryRouter>,
  )
}

describe('CharacterSwitcherSheet — the two actions under the roster', () => {
  it('is still the roster, whatever the gate says', () => {
    expect(sheet(false)).toContain('Your characters')
    expect(sheet(true)).toContain('Your characters')
  })

  it('offers "Create new character" only when the gate is open', () => {
    expect(sheet(true), 'gate open').toContain('Create new character')
    expect(sheet(false), 'gate shut').not.toContain('Create new character')
  })

  it('hides the shut gate rather than disabling it', () => {
    // #1560: no locked face. A `disabled` button is still an advertisement.
    expect(sheet(false)).not.toContain('disabled')
  })

  it('never duplicates the EDIT pill inside the sheet', () => {
    for (const html of [sheet(true), sheet(false)]) {
      expect(html).not.toContain('Edit this character')
      expect(html).not.toContain('/characters/42/edit')
    }
  })
})

describe('CharacterSwitcherSheet — the ground (#2109)', () => {
  it('draws on an opaque ground, not the alpha surface wash', () => {
    const html = sheet(true)
    expect(html).toContain('background:var(--color-bg-page)')
    expect(html, 'alpha in BOTH themes — the transparency that was reported').not.toContain(
      'var(--color-bg-surface)',
    )
  })

  it('keeps the shared scrim above it', () => {
    expect(sheet(true)).toContain('var(--color-overlay-strong)')
  })
})
