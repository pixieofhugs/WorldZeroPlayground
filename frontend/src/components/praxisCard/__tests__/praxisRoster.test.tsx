/**
 * The praxis card's crew roster (#2318). Its module-private `RosterAvatar` in
 * `praxisCard/shared.tsx` is not `collab/RosterAvatar` (one initial vs two);
 * it only gains the portrait.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisMemberOut } from '../../../api/praxis'
import { PraxisRoster } from '../shared'
import { aPraxisCard, aMember } from '../../../test/fixtures'
import { mediaUrl } from '../../../utils/media'

const PORTRAIT = 'avatars/nel.png'

function crew(...members: PraxisMemberOut[]): string {
  return renderToStaticMarkup(
    <PraxisRoster
      praxis={aPraxisCard({ type: 'collab', members })}
      accent="var(--faction-default-card-accent)"
      paper="var(--faction-default-card-bg)"
    />,
  )
}

const NEL = aMember({
  id: 1,
  character_id: 1,
  character_display_name: 'Nel Ashby',
  character_avatar_url: PORTRAIT,
})
const PIP = aMember({
  id: 2,
  character_id: 2,
  character_display_name: 'Pip Vance',
  character_avatar_url: '',
})

describe('PraxisRoster portraits (#2318)', () => {
  it('a member with a portrait wears it', () => {
    const html = crew(NEL, PIP)
    expect(html).toContain(`src="${mediaUrl(PORTRAIT)}"`)
  })

  it('a member without one keeps the single-letter monogram', () => {
    const html = crew(NEL, PIP)
    expect(html).toContain('>P<')
    expect(html).not.toContain('src=""')
  })

  it('still lists both names', () => {
    const html = crew(NEL, PIP)
    expect(html).toContain('Nel Ashby, Pip Vance')
  })

  // A portrait must not change the two-member gate.
  it('draws nothing for a lone member', () => {
    expect(crew(NEL)).toBe('')
  })
})
