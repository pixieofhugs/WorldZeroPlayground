/**
 * #596 — the duel card names its opponent.
 *
 * SSR-renders the banner in isolation with the real i18n catalog, so the copy,
 * the link target and (most of all) the SILENCES are pinned. The three cases
 * that matter are all cases where the banner draws nothing, because each one is
 * a different way of having no rival to name and only one of them is "this
 * isn't a duel".
 *
 * The gate under test is `opponent_display_name`, NOT `type === 'duel'` and not
 * `duel_id`. A duel side is stored `type='solo'` + a non-null `duel_id`
 * (ADR-0011, #992), so a `type` test would never fire at all; a `duel_id` test
 * would fire during the pending window, when `Duel.opponent_praxis_id` is still
 * NULL and there is nobody to print.
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
    // `duel_id` IS set: this praxis is a duel side. But the challenge has not
    // been accepted, so `Duel.opponent_praxis_id` is NULL and the wire carries
    // no name. The mode chip alone is the answer here, which is what shipped
    // before this banner existed.
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
    // Defensive: an older cached card could carry the name and not the id. A
    // named rival with no link still says more than the bare chip did.
    const html = render(
      praxis({ duel_id: 7, opponent_display_name: 'Rax Vandal', opponent_praxis_id: null }),
    )
    expect(text(html)).toContain('Rax Vandal')
    expect(html).not.toContain('href=')
  })
})

/**
 * #2128 — the banner drew a monogram where the rival's face belongs.
 *
 * `opponent_avatar_url` (#2172) joined the three fields that "ALL ARRIVE
 * TOGETHER OR NOT AT ALL", but it is NOT one of them: it is non-nullable and
 * defaults to `""`. It answers WHAT to draw and never WHETHER to draw, so the
 * gate above stays on `opponent_display_name` — the last case below is the one
 * that would break if a future edit folded the portrait into that gate.
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
    // A duel accepted but not yet cast: no `opponent_praxis_id`, no portrait.
    // Neither absence is "no rival" — the NAME is, and it is here.
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
