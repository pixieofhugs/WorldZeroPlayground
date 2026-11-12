/**
 * The character sheet's actions (#2111: "Create" only when the server gate is
 * open, #1560) and its opaque ground (#2109: `--color-bg-surface` is alpha).
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
// Mocked so the module graph doesn't pull in the API transport.
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
    // #1560: a `disabled` button is still an advertisement.
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
