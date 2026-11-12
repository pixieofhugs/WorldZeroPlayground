/**
 * #596 — the duel card names its opponent. The gate is `opponent_display_name`,
 * not `type === 'duel'` (a duel side is `type='solo'` + `duel_id`, ADR-0011) and
 * not `duel_id` (set during the pending window, with no rival yet).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { PraxisDuelBanner } from '../shared'

function praxis(overrides: Partial<PraxisCardOut>): PraxisCardOut {
  return { id: 1, type: 'solo', ...overrides } as PraxisCardOut
}

/** The banner links, so it needs a router context even under SSR. */
function render(p: PraxisCardOut): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <PraxisDuelBanner praxis={p} accent="#123456" />
    </MemoryRouter>,
  )
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')

describe('duel banner', () => {
  it('names the opponent and links to their side', () => {
    const html = render(
      praxis({
        duel_id: 7,
        opponent_display_name: 'Rax Vandal',
        opponent_praxis_id: 42,
        opponent_faction_slug: 'snide',
      }),
    )
    expect(text(html)).toContain('Rax Vandal')
    expect(text(html)).toContain('vs.')
    expect(html).toContain('href="/praxis/42"')
  })

  it('stays silent during the pending window — a duel with no opponent yet', () => {
    // A duel side, but unaccepted: no name on the wire, so the mode chip answers.
    expect(
      render(praxis({ duel_id: 7, opponent_display_name: null, opponent_praxis_id: null })),
    ).toBe('')
  })

  it('renders nothing on a solo praxis', () => {
    expect(render(praxis({ duel_id: null }))).toBe('')
  })

  it('renders nothing on a collab — the roster owns that slot', () => {
    expect(render(praxis({ type: 'collab', duel_id: null, member_count: 3 }))).toBe('')
  })

  it('still names the opponent without a link id', () => {
    // An older cached card could carry the name without the id.
    const html = render(
      praxis({ duel_id: 7, opponent_display_name: 'Rax Vandal', opponent_praxis_id: null }),
    )
    expect(text(html)).toContain('Rax Vandal')
    expect(html).not.toContain('href=')
  })
})

/**
 * #2128 — `opponent_avatar_url` (#2172) is non-nullable, default `""`: it says
 * WHAT to draw, never WHETHER, so the gate stays on the name (last case).
 */
describe('duel banner — the rival wears their face', () => {
  const rival = {
    duel_id: 7,
    opponent_display_name: 'Rax Vandal',
    opponent_praxis_id: 42,
    opponent_faction_slug: 'snide',
  }

  it("draws the rival's portrait when the wire carries one", () => {
    const html = render(praxis({ ...rival, opponent_avatar_url: 'avatars/rax.png' }))
    expect(html).toContain('<img')
    expect(html).toContain('avatars/rax.png')
  })

  it('falls back to the monogram for a rival with no portrait', () => {
    const html = render(praxis({ ...rival, opponent_avatar_url: '' }))
    expect(html).not.toContain('<img')
    expect(text(html)).toContain('Rax Vandal')
  })

  it('still draws the banner during the pending window, portrait or not', () => {
    const html = render(
      praxis({
        duel_id: 7,
        opponent_display_name: 'Rax Vandal',
        opponent_praxis_id: null,
        opponent_avatar_url: '',
      }),
    )
    expect(text(html)).toContain('Rax Vandal')
    expect(text(html)).toContain('vs.')
  })
})
