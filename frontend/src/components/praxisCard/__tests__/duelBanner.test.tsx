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
      <PraxisDuelBanner praxis={p} accent="#123456" paper="#ffffff" />
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
