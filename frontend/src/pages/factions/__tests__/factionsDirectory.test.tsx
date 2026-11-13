/**
 * The factions directory, both form factors (#743). Seam: each renderer fed a
 * controlled state, since effects never fire in this harness.
 *
 * The "Recent Invitations" panel is gone (#2310); the load-bearing guard is
 * that an `invited` status alone still reads `eligible` on desktop.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { FactionOut, FactionPageOut, FactionStatusOut, InvitationLetterOut } from '../../../api/factions'
import type { CurrentUser } from '../../../api/auth'
import { AuthContext } from '../../../auth/AuthContext'
import FactionsDirectoryView from '../mobileArchetypes/FactionsDirectoryView'
import DefaultFactionsDirectory from '../mobileArchetypes/DefaultFactionsDirectory'
import { DesktopFactions } from '../../Factions'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: decode(html.replace(/<[^>]*>/g, '')) }
}

/** Unescape markup so catalog strings (e.g. "Let's …") compare directly. */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** A tile's status line from the catalog. Literal unions keep the key typed. */
type StatusSlug = 'coven' | 'snide' | 'everymen'
type StatusState = 'locked' | 'eligible' | 'member'

function statusLine(slug: StatusSlug, state: StatusState): string {
  return i18n.t(`feed:factionSelect.${slug}.status.${state}` as const)
}

// What an unrevealed player gets (ADR-0027: no Albescent), out of rainbow
// order and carrying `na` — the shape behind the 7-stripes-over-6-cards bug.
const FACTIONS: FactionOut[] = [
  { slug: 'coven', status: 'visible' },
  { slug: 'everymen', status: 'visible' },
  { slug: 'snide', status: 'visible' },
  { slug: 'na', status: 'visible' },
  { slug: 'ua', status: 'visible' },
  { slug: 'ephemerists', status: 'visible' },
  { slug: 'singularity', status: 'visible' },
]

function status(
  rows: Array<[string, FactionStatusOut['status']]>,
  invitations: InvitationLetterOut[] = [],
): FactionPageOut {
  const all_factions: FactionStatusOut[] = rows.map(([slug, status]) => ({ slug, status, joinable: false }))
  return { current_faction_slug: 'coven', all_factions, invitations }
}

// One of each card state: Coven member, S.N.I.D.E. invited, Everymen not.
const STATUS = status([
  ['coven', 'member'],
  ['snide', 'invited'],
  ['everymen', 'not_invited'],
  ['ua', 'not_invited'],
  ['ephemerists', 'not_invited'],
  ['singularity', 'not_invited'],
])

const LETTERS: InvitationLetterOut[] = [
  { faction_slug: 'snide', delivered_at: '2026-01-01T00:00:00Z' },
  { faction_slug: 'coven', delivered_at: '2026-01-02T00:00:00Z' },
]

function view(overrides: Partial<React.ComponentProps<typeof FactionsDirectoryView>> = {}) {
  return render(
    <FactionsDirectoryView
      factions={FACTIONS}
      factionPage={STATUS}
      loading={false}
      error={null}
      unaffiliated={false}
      onVisit={() => {}}
      {...overrides}
    />,
  )
}

function stripeBar(html: string): string {
  const start = html.indexOf('data-testid="faction-stripe-bar"')
  expect(start, 'stripe bar rendered').toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</div>', start))
}

describe('mobile factions directory — stripe/card correspondence (#743)', () => {
  it('draws exactly one stripe per rendered card, na dropped', () => {
    const { html } = view()
    const stripes = (stripeBar(html).match(/<span/g) ?? []).length
    // One CTA button per card is the only <button on the page.
    const cards = (html.match(/<button/g) ?? []).length

    expect(stripes, 'six stripes').toBe(6)
    expect(cards, 'six cards').toBe(6)
    expect(stripes, 'stripe N == card N').toBe(cards)
  })

  it('keeps rainbow order, not desktop member-first sort', () => {
    const { html } = view()
    const bar = stripeBar(html)
    // Coven (member) would float first under a member-first sort. Ephemerists
    // sit before S.N.I.D.E. since their hue moved to gold (#2078).
    const order = ['everymen', 'ua', 'ephemerists', 'snide', 'singularity', 'coven']
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
    expect(text, 'Coven member line').toContain(statusLine('coven', 'member'))
    expect(text, 'S.N.I.D.E. eligible line').toContain(statusLine('snide', 'eligible'))
    expect(text, 'Everymen locked line').toContain(statusLine('everymen', 'locked'))
    expect(text).not.toContain(statusLine('snide', 'member'))
  })

  it('falls back to locked when a faction has no status row', () => {
    const { text } = view({ factionPage: status([]) })
    expect(text, 'Coven falls back to locked').toContain(statusLine('coven', 'locked'))
    expect(text).not.toContain(statusLine('coven', 'member'))
    expect(text).not.toContain(statusLine('snide', 'eligible'))
  })
})

describe('mobile factions directory — no invitation panel (#2310)', () => {
  it('draws no panel even for a viewer holding letters', () => {
    // The backend still sends letters; this surface just doesn't draw them.
    const { html, text } = view({ factionPage: status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS) })
    expect(text, 'no panel header').not.toContain('Recent Invitations')
    expect(text, 'no INVITE badge').not.toContain('INVITE')
    expect(text, 'no invite sentence').not.toContain('been invited to join')
    // Cards navigate by handler, so any link here would be a letter row.
    expect(html, 'no letter row linking to a detail page').not.toContain('href="/factions/')
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

/** The container: only proves it wires the view's chrome up. */
describe('mobile factions directory — the container', () => {
  it('renders the heading and the unaffiliated banner', () => {
    const { text } = render(
      <DefaultFactionsDirectory
        state={{ factions: [], factionPage: null, loading: true, error: null }}
      />,
    )
    expect(text).toContain('Factions')
    expect(text).toContain('Unaffiliated')
  })
})

/** Desktop: the panel was behind `character &&`, so the viewer needs one. */
describe('desktop factions grid — no invitation panel (#2310)', () => {
  const VIEWER = { character: { faction_slug: 'coven' } } as unknown as CurrentUser

  const desktop = (page: FactionPageOut) =>
    render(
      <AuthContext.Provider
        value={{
          user: VIEWER,
          loading: false,
          refetch: async () => {},
          applyUser: () => {},
          signOut: async () => {},
        }}
      >
        <DesktopFactions state={{ factions: FACTIONS, factionPage: page, loading: false, error: null }} />
      </AuthContext.Provider>,
    )

  it('draws no panel even for a viewer holding letters', () => {
    const { html, text } = desktop(status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS))
    expect(text, 'no panel header').not.toContain('Recent Invitations')
    expect(text, 'no INVITE badge').not.toContain('INVITE')
    expect(text, 'no invite sentence').not.toContain('been invited to join')
    expect(html, 'no expand/collapse triangle').not.toContain('aria-expanded')
  })

  it('still reads an invited faction as eligible with the letter arm gone', () => {
    // Protects the deletion of `|| invitationBySlug[slug]`: the status map
    // alone must keep an invited player's route in.
    const { text } = desktop(status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS))
    expect(text, 'S.N.I.D.E. is eligible on its status alone').toContain(
      statusLine('snide', 'eligible'),
    )
    expect(text, 'Coven still reads member').toContain(statusLine('coven', 'member'))
    expect(text, 'Everymen stays locked').toContain(statusLine('everymen', 'locked'))
  })

  it('reads the same with no letters on the payload at all', () => {
    const withLetters = desktop(status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS)).text
    const without = desktop(STATUS).text
    expect(without).toBe(withLetters)
  })

  /** Calls pin to the card bottom (#3139), so every tile needs equal height. */
  it('stretches the row and makes each tile\'s wrapper a column, so calls line up', () => {
    const { html } = desktop(STATUS)
    const at = html.indexOf('data-testid="faction-tile-row"')
    expect(at, 'tile row rendered').toBeGreaterThan(-1)
    const row = html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1)
    expect(row).toContain('flex-wrap:wrap')
    expect(row).toContain('align-items:stretch')
    const wrappers = html.match(/<div style="display:flex;flex-direction:column;opacity:[^"]*">/g) ?? []
    expect(STATUS.all_factions.length).toBeGreaterThan(0)
    expect(wrappers).toHaveLength(STATUS.all_factions.length)
  })
})

describe('mobile factions directory — the tile column centres its tiles (#2579)', () => {
  /** The card maxes at 360px; without centring, wider screens left-strand it. */
  it('centres the column so a tile narrower than the viewport is not left-stranded', () => {
    const { html } = view()
    const start = html.indexOf('data-testid="faction-tile-column"')
    expect(start, 'tile column rendered').toBeGreaterThan(-1)
    const openTag = html.slice(html.lastIndexOf('<', start), html.indexOf('>', start) + 1)
    expect(openTag, 'column axis').toContain('flex-direction:column')
    expect(openTag, 'tiles centred on the cross axis').toContain('align-items:center')
  })
})
