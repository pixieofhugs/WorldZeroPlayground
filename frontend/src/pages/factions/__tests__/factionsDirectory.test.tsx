/**
 * Mobile factions directory (#732 grid + #733 letters, tested #743). Renders the
 * pure `FactionsDirectoryView` skin directly over controlled rows — the same seam
 * DefaultPlayers gives the players directory. The live `DefaultFactionsDirectory`
 * container self-fetches inside a useEffect, and this harness is node +
 * renderToStaticMarkup (no DOM, effects never fire), so a direct container render
 * only ever reaches the loading state; feeding the view controlled props is the
 * only way to assert the four things merge review had to catch by hand.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { FactionOut, FactionPageOut, FactionStatusOut, InvitationLetterOut } from '../../../api/factions'
import FactionsDirectoryView from '../mobileArchetypes/FactionsDirectoryView'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

// An Albescent-hidden six-faction list, deliberately out of rainbow order and
// carrying `na` — exactly what an unrevealed player gets from GET /factions
// (ADR-0027 omits Albescent; the view drops `na`). This is the shape that shipped
// the 7-stripes-over-6-cards regression when the bar was built off the static
// seven-slug array instead of the rendered rows.
const FACTIONS: FactionOut[] = [
  { slug: 'coven' },
  { slug: 'everymen' },
  { slug: 'snide' },
  { slug: 'na' },
  { slug: 'ua' },
  { slug: 'ephemerists' },
  { slug: 'singularity' },
]

function status(rows: Array<[string, string]>): FactionPageOut {
  const all_factions: FactionStatusOut[] = rows.map(([slug, status]) => ({ slug, status }))
  return { current_faction_slug: 'coven', all_factions }
}

// A viewer who is a Coven member, recruited by S.N.I.D.E., and not invited by
// Everymen — one of each of the three card states the tiles must distinguish.
const STATUS = status([
  ['coven', 'member'],
  ['snide', 'invited'],
  ['everymen', 'not_invited'],
  ['ua', 'not_invited'],
  ['ephemerists', 'not_invited'],
  ['singularity', 'not_invited'],
])

const NO_INVITES: InvitationLetterOut[] = []

function view(overrides: Partial<React.ComponentProps<typeof FactionsDirectoryView>> = {}) {
  return render(
    <FactionsDirectoryView
      factions={FACTIONS}
      factionPage={STATUS}
      invitations={NO_INVITES}
      loading={false}
      error={null}
      unaffiliated={false}
      onVisit={() => {}}
      {...overrides}
    />,
  )
}

// The stripe bar is one hard-edged span per rendered card. Extract it so the
// count and the order are read off the legend alone, not the whole page.
function stripeBar(html: string): string {
  const start = html.indexOf('data-testid="faction-stripe-bar"')
  expect(start, 'stripe bar rendered').toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</div>', start))
}

describe('mobile factions directory — stripe/card correspondence (#743)', () => {
  it('draws exactly one stripe per rendered card, na dropped', () => {
    const { html } = view()
    const stripes = (stripeBar(html).match(/<span/g) ?? []).length
    // One CTA button per FactionSelectCard is the only <button on the page.
    const cards = (html.match(/<button/g) ?? []).length

    // Six real factions survive (na filtered), Albescent never present. This is
    // the invariant that broke: a static seven-stripe bar over six cards.
    expect(stripes, 'six stripes').toBe(6)
    expect(cards, 'six cards').toBe(6)
    expect(stripes, 'stripe N == card N').toBe(cards)
  })

  it('keeps rainbow order, not desktop member-first sort', () => {
    const { html } = view()
    const bar = stripeBar(html)
    // Coven is a member here; a member-first sort would float it to the front.
    // Rainbow order pins it last (pink) and Everymen first (red).
    const order = ['everymen', 'ua', 'snide', 'ephemerists', 'singularity', 'coven']
    const positions = order.map((slug) => bar.indexOf(`--faction-${slug}`))
    for (const [index, pos] of positions.entries()) {
      expect(pos, `${order[index]} present in bar`).toBeGreaterThan(-1)
    }
    const sorted = [...positions].sort((a, b) => a - b)
    expect(positions, 'stripes ascend in rainbow order').toEqual(sorted)
    expect(
      bar.indexOf('--faction-coven'),
      'the member faction is not floated to the front',
    ).toBeGreaterThan(bar.indexOf('--faction-everymen'))
  })
})

describe('mobile factions directory — real card state (#743)', () => {
  it('renders each card in its true member/eligible/locked voice, not a uniform neutral', () => {
    const { text } = view()
    // Distinct per-state status copy proves the status prop reaches the tiles.
    expect(text, 'Coven member line').toContain('You’re one of us now')
    expect(text, 'S.N.I.D.E. eligible line').toContain('Consider yourself recruited.')
    expect(text, 'Everymen locked line').toContain('Put in the shift and there’s a place for you.')
    // The eligible/locked copies must not collapse into one another.
    expect(text).not.toContain('Active operative — welcome to the mess.')
  })

  it('falls back to locked when a faction has no status row', () => {
    const { text } = view({ factionPage: status([]) })
    // No rows at all → every card locked, none showing an eligible/member voice.
    expect(text, 'Coven falls back to locked').toContain('Do the tiny brave thing to be invited')
    expect(text).not.toContain('You’re one of us now')
    expect(text).not.toContain('Consider yourself recruited.')
  })
})

describe('mobile factions directory — invitation letters panel (#743)', () => {
  it('draws nothing when the invite list is empty', () => {
    const { text } = view({ invitations: [] })
    // The panel is header + rows only when a letter exists — an empty feed is silent.
    expect(text).not.toContain('Recent Invitations')
    expect(text, 'no INVITE badge without a letter').not.toContain('INVITE')
  })

  it('renders a row per letter, linking to the faction detail page', () => {
    const invitations: InvitationLetterOut[] = [
      { faction_slug: 'snide', delivered_at: '2026-01-01T00:00:00Z' },
      { faction_slug: 'coven', delivered_at: '2026-01-02T00:00:00Z' },
    ]
    const { html, text } = view({ invitations })
    expect(text, 'panel header appears with a count').toContain('Recent Invitations')
    expect(html, 'S.N.I.D.E. letter links to its detail page').toContain('href="/factions/snide"')
    expect(html, 'Coven letter links to its detail page').toContain('href="/factions/coven"')
  })
})

describe('mobile factions directory — states (#743)', () => {
  it('shows the loading line and no cards before data arrives', () => {
    const { html, text } = view({ loading: true })
    expect(text, 'loading copy shown').toContain('Loading')
    expect(html, 'no cards while loading').not.toContain('<button')
  })

  it('surfaces a load error in place of the card stack', () => {
    const { html, text } = view({ error: 'Boom', loading: false })
    expect(text).toContain('Boom')
    expect(html, 'no cards behind an error').not.toContain('<button')
  })

  it('shows the unaffiliated banner only to a factionless viewer', () => {
    expect(view({ unaffiliated: true }).html).toContain('sidebar-card')
    expect(view({ unaffiliated: false }).html).not.toContain('sidebar-card')
  })
})
