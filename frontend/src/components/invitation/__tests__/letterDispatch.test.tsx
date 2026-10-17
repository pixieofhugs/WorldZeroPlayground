/**
 * The manifest dispatches each slug to ITS OWN invitation letter (#3294).
 *
 * Seam: the rendered markup of `InvitationLetterPopup` (renderToStaticMarkup, the
 * repo's harness; archetypes are preloaded by `test/preloadArchetypes.ts`). Each
 * letter stamps `data-letter="<slug>"` on its sheet, so a manifest entry that is
 * broken, missing, or pointing at a sibling's letter turns the row for that
 * slug red. The popup is the behaviour host; the letter is tree and paint
 * (ADR-0090), so this is also the guard that no slug is branched on in the
 * popup: the markup differs only because the manifest says so.
 *
 * Albescent has a row but it is a pass-through to the Default letter; its OWN
 * letter (`AlbescentInvitation`) is a different surface and is not rendered here.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import '../../../i18n'
import { AuthContext } from '../../../auth/AuthContext'
import type { CurrentUser } from '../../../api/auth'
import InvitationLetterPopup from '../../InvitationLetterPopup'

const OWN_LETTER = ['ua', 'snide', 'wow', 'coven', 'everymen', 'ephemerists', 'singularity']

function render(slug: string): string {
  const user = { character: { faction_slug: 'na' } } as unknown as CurrentUser
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}
    >
      <InvitationLetterPopup factionSlug={slug} onClose={() => {}} />
    </AuthContext.Provider>,
  )
}

describe('invitationLetter dispatch', () => {
  it.each(OWN_LETTER)('%s renders its own letter, and only its own', (slug) => {
    const letters = [...render(slug).matchAll(/data-letter="([a-z]+)"/g)].map((m) => m[1])
    expect(letters).toEqual([slug])
  })

  it.each(['na', 'albescent', 'no-such-faction'])('%s falls to the Default letter', (slug) => {
    const letters = [...render(slug).matchAll(/data-letter="([a-z]+)"/g)].map((m) => m[1])
    expect(letters).toEqual(['default'])
  })
})
