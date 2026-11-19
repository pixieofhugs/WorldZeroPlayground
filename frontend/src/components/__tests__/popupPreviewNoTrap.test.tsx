// @vitest-environment jsdom
/** Admin copy sheets mount live popups as previews; they must not trap Tab or steal focus. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import '../../i18n'
import InvitationLetterPopup from '../InvitationLetterPopup'
import LevelUpPopup from '../LevelUpPopup'

vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: { faction_slug: 'na' } }, applyUser: () => {} }),
}))

afterEach(cleanup)

it.each([
  ['LevelUpPopup', <LevelUpPopup key="l" level={2} rankKey="trailhead" abilities={[]} onContinue={() => {}} preview />],
  ['InvitationLetterPopup', <InvitationLetterPopup key="i" factionSlug="coven" onClose={() => {}} preview />],
])('%s preview leaves Tab and focus alone', (_name, popup) => {
  render(
    <>
      <button>editor</button>
      {popup}
    </>,
  )
  const editor = screen.getByText('editor')
  editor.focus()
  expect(fireEvent.keyDown(editor, { key: 'Tab' })).toBe(true)
  expect(document.activeElement).toBe(editor)
})
