import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import InvitationLetterPopup from '../InvitationLetterPopup'

vi.mock('../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: { faction_slug: 'na' } }, applyUser: () => {} }),
}))

// The feed card's half is `invitationLetterAccept.test.tsx`; both share one key (#2620).
it('the letter dismisses on the shared `factions:invitation.dismiss` word', () => {
  const html = renderToStaticMarkup(<InvitationLetterPopup factionSlug="snide" onClose={() => {}} />)
  expect(html).toContain(i18n.t('factions:invitation.dismiss'))
})
