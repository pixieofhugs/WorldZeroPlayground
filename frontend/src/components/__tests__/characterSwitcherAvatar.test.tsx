// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import type { CharacterOut } from '../../api/auth'

const noPortrait = {
  id: 7, username: 'wren', display_name: 'Wren', faction_slug: 'coven', avatar_url: null,
} as unknown as CharacterOut

vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'mobile' }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { can_create_additional_character: false }, applyUser: () => {} }),
}))
vi.mock('../../api/me', () => ({
  getMyCharacters: async () => [noPortrait],
  setActiveCharacter: async () => ({}),
}))

import CharacterSwitcherSheet from '../CharacterSwitcherSheet'

describe('CharacterSwitcherSheet avatar', () => {
  it('a character with no portrait gets the FactionAvatar monogram', async () => {
    render(
      <MemoryRouter>
        <CharacterSwitcherSheet open activeCharacterId={7} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(await screen.findByText('W')).toBeTruthy()
  })
})
