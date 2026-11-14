// @vitest-environment jsdom
/** The invitation's confirm step takes focus on the affirmative, which scrolls it into view (#2656). */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import '../../i18n'
import InvitationLetterPopup from '../InvitationLetterPopup'

vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: { faction_slug: 'na' } }, applyUser: () => {} }),
}))

afterEach(cleanup)

it.each(['coven', 'snide'])('%s: clicking ENLIST focuses the confirm button', (slug) => {
  const { container } = render(<InvitationLetterPopup factionSlug={slug} onClose={() => {}} />)
  fireEvent.click(container.querySelector('button')!)
  const confirm = container.querySelector('[data-join="confirm"]')
  expect(confirm).not.toBeNull()
  expect(document.activeElement).toBe(confirm)
})
