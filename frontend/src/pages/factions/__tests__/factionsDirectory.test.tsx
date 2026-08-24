/**
 * The factions directory, BOTH form factors (#732 grid, tested #743).
 *
 * SEAM: what each renderer draws from a controlled directory state. Mobile has
 * always had one — the pure `FactionsDirectoryView` skin, the same shape
 * DefaultPlayers gives the players directory. #2310 gave desktop the matching
 * one by exporting `DesktopFactions`, because the deletion it makes has to be
 * asserted on the renderer that carried the risk. The live containers fetch
 * inside a `useEffect`, and this harness is node + renderToStaticMarkup (no DOM,
 * effects never fire), so a direct container render only ever reaches the
 * loading state; feeding controlled props is the only way in.
 *
 * The "Recent Invitations" panel is gone from both (#2310) and the two guards
 * below are what keep it gone. The second is the load-bearing one: deleting the
 * panel also deleted desktop's `|| invitationBySlug[slug]` arm out of
 * `selectState`, and getting that wrong would silently strip an invited player's
 * route into a faction. The assertion is that an `invited` status alone still
 * reads `eligible`.
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

/**
 * `renderToStaticMarkup` escapes `& < > " '`; undo that so `text` really is
 * what the page SAYS and a catalog string can be compared to it directly.
 * Without this, `factionSelect.snide.status.eligible` — "Let's F%$*ing GO", one
 * of #2332's — arrives as `Let&#x27;s` and matches nothing.
 */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * A faction tile's status line, read from the catalog rather than quoted.
 *
 * Both parameters are literal unions, not `string`: the copy keys are typed as
 * a literal union, so a `${string}` template widens past it and fails the
 * typecheck. Only the three slugs these tests exercise are listed — widen it
 * when a fourth is needed.
 */
type StatusSlug = 'coven' | 'snide' | 'everymen'
type StatusState = 'locked' | 'eligible' | 'member'

function statusLine(slug: StatusSlug, state: StatusState): string {
  return i18n.t(`feed:factionSelect.${slug}.status.${state}` as const)
}

// An Albescent-hidden six-faction list, deliberately out of rainbow order and
// carrying `na` — exactly what an unrevealed player gets from GET /factions
// (ADR-0027 omits Albescent; the view drops `na`). This is the shape that shipped
// the 7-stripes-over-6-cards regression when the bar was built off the static
// seven-slug array instead of the rendered rows.
const FACTIONS: FactionOut[] = [
  { slug: 'coven', status: 'visible' },
  { slug: 'everymen', status: 'visible' },
  { slug: 'snide', status: 'visible' },
  { slug: 'na', status: 'visible' },
  { slug: 'ua', status: 'visible' },
  { slug: 'ephemerists', status: 'visible' },
  { slug: 'singularity', status: 'visible' },
]

// The status half of a row is the schema's five-value membership enum, not any
// string — spelling it that way is what stops a typo reaching a card state the
// server cannot report (#1400).
function status(
  rows: Array<[string, FactionStatusOut['status']]>,
  invitations: InvitationLetterOut[] = [],
): FactionPageOut {
  const all_factions: FactionStatusOut[] = rows.map(([slug, status]) => ({ slug, status }))
  return { current_faction_slug: 'coven', all_factions, invitations }
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

// A viewer holding two live letters. `snide` is the one the status map also
// reports `invited` for; `coven` is the faction they are already in, which is the
// pairing that used to make desktop's dead `|| invitationBySlug[slug]` arm look
// load-bearing. Both are letters the panel would have drawn a row for.
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
    //
    // The Ephemerists precede S.N.I.D.E. since #2078: they took a gold (h41)
    // when #2068 emptied the teal slot (h183), so their stripe moved from
    // between green and blue to between orange and green. This bar is the one
    // surface that paints these fills with a hard edge between them, so it is
    // the sequence worth pinning — UA's sienna (h18) and the brass (h41) are
    // now the tightest touching pair on the page at ΔE2000 31.1 light /
    // 30.3 dark, measured against index.css.
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
    // Distinct per-state status copy proves the status prop reaches the tiles.
    // The words come from the catalog, not from a quote of it: the seam is that
    // each tile gets its OWN state's line, and #2332 rewrote three of the six
    // lines this used to spell out.
    expect(text, 'Coven member line').toContain(statusLine('coven', 'member'))
    expect(text, 'S.N.I.D.E. eligible line').toContain(statusLine('snide', 'eligible'))
    expect(text, 'Everymen locked line').toContain(statusLine('everymen', 'locked'))
    // The eligible/locked copies must not collapse into one another.
    expect(text).not.toContain(statusLine('snide', 'member'))
  })

  it('falls back to locked when a faction has no status row', () => {
    const { text } = view({ factionPage: status([]) })
    // No rows at all → every card locked, none showing an eligible/member voice.
    expect(text, 'Coven falls back to locked').toContain(statusLine('coven', 'locked'))
    expect(text).not.toContain(statusLine('coven', 'member'))
    expect(text).not.toContain(statusLine('snide', 'eligible'))
  })
})

describe('mobile factions directory — no invitation panel (#2310)', () => {
  it('draws no panel even for a viewer holding letters', () => {
    // The letters are on the payload — the backend still sends them, and the
    // faction detail page still reads them. This surface just stopped drawing
    // them, so none of the panel's three strings may appear at any state.
    const { html, text } = view({ factionPage: status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS) })
    expect(text, 'no panel header').not.toContain('Recent Invitations')
    expect(text, 'no INVITE badge').not.toContain('INVITE')
    expect(text, 'no invite sentence').not.toContain('been invited to join')
    // The rows were the only links on this screen; the cards navigate by handler.
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

/**
 * The container above that view. Carried here from
 * `factionDetail/__tests__/mobileArchetypeSlots.test.tsx`, which walked the
 * retired `mobileFactionPage` registry and kept this one directory assertion as
 * a passenger (#1314). It is thin on purpose — effects never fire in this
 * harness, so the container only ever reaches its loading state — but it is the
 * one thing proving the container wires the view's chrome up at all.
 */
describe('mobile factions directory — the container', () => {
  it('renders the heading and the unaffiliated banner', () => {
    // The directory fetch lives in the page dispatcher now (#1116), so the skin
    // takes the same still-loading state it used to produce for itself.
    const { text } = render(
      <DefaultFactionsDirectory
        state={{ factions: [], factionPage: null, loading: true, error: null }}
      />,
    )
    expect(text).toContain('Factions')
    expect(text).toContain('Unaffiliated')
  })
})

/**
 * The DESKTOP renderer over the same controlled state. `useAuth` has a default
 * context value, so a viewer with no character is the cheap case; the panel was
 * drawn behind `character &&`, so the letters case needs a real one.
 */
describe('desktop factions grid — no invitation panel (#2310)', () => {
  // Only the field the grid reads; the rest of /auth/me is irrelevant here.
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
    // The collapse toggle was the only button on the page that is not a tile CTA.
    expect(html, 'no expand/collapse triangle').not.toContain('aria-expanded')
  })

  it('still reads an invited faction as eligible with the letter arm gone', () => {
    // THE ASSERTION THAT PROTECTS THE DELETION. `snide` is `invited` in the
    // status map AND holds a letter; `everymen` is `not_invited` and holds none.
    // With `|| invitationBySlug[slug]` removed, the status map alone must still
    // separate them — an eligible card that fell back to locked would take away
    // the only route an invited player has into that faction from this page.
    const { text } = desktop(status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS))
    expect(text, 'S.N.I.D.E. is eligible on its status alone').toContain(
      statusLine('snide', 'eligible'),
    )
    expect(text, 'Coven still reads member').toContain(statusLine('coven', 'member'))
    expect(text, 'Everymen stays locked').toContain(statusLine('everymen', 'locked'))
  })

  it('reads the same with no letters on the payload at all', () => {
    // The other half of the claim: the letters were never what produced
    // `eligible`, so dropping them changes nothing.
    const withLetters = desktop(status(STATUS.all_factions.map((r) => [r.slug, r.status]), LETTERS)).text
    const without = desktop(STATUS).text
    expect(without).toBe(withLetters)
  })
})

describe('mobile factions directory — the tile column centres its tiles (#2579)', () => {
  /**
   * `FactionSelectCard`'s contract is a FLUID box: `width: 100%` up to a 360px
   * max. A flex item with a declared cross size is not stretched, so a column
   * with the default `align-items: stretch` places each tile at cross-START —
   * the left edge — and every pixel past 360 opens as dead space on the right.
   * Below 360 the tile fills the screen and nothing looks wrong, which is why
   * this read as a tablet bug rather than a phone one.
   *
   * Pinned as the declaration rather than a measured box because the harness is
   * node + renderToStaticMarkup with no layout engine: there is no geometry to
   * measure here, only the rule that produces it.
   */
  it('centres the column so a tile narrower than the viewport is not left-stranded', () => {
    const { html } = view()
    const start = html.indexOf('data-testid="faction-tile-column"')
    expect(start, 'tile column rendered').toBeGreaterThan(-1)
    const openTag = html.slice(html.lastIndexOf('<', start), html.indexOf('>', start) + 1)
    expect(openTag, 'column axis').toContain('flex-direction:column')
    expect(openTag, 'tiles centred on the cross axis').toContain('align-items:center')
  })
})
