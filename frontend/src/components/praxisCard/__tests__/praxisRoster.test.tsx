/**
 * The praxis CARD's crew roster (#2318).
 *
 * A second, module-private `RosterAvatar` lives in `praxisCard/shared.tsx` — a
 * different component from `collab/RosterAvatar`, single-letter and 24px, and
 * the card's own dress. It is not being replaced by the collab leaf: swapping
 * them would turn one initial into two across all nine card archetypes, which
 * nobody asked for. It just gains the portrait the wire can now carry.
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

  // The single-letter monogram is the fallback and stays exactly as it was.
  it('a member without one keeps the single-letter monogram', () => {
    const html = crew(NEL, PIP)
    expect(html).toContain('>P<')
    expect(html).not.toContain('src=""')
  })

  // The names line is untouched — this is an avatar change, not a copy change.
  it('still lists both names', () => {
    const html = crew(NEL, PIP)
    expect(html).toContain('Nel Ashby, Pip Vance')
  })

  // `PraxisRoster` draws nothing below two members; a portrait must not change
  // that gate.
  it('draws nothing for a lone member', () => {
    expect(crew(NEL)).toBe('')
  })
})
