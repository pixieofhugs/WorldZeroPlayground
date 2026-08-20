/**
 * #2361 — the desktop rail wears the VIEWER's faction, and only the viewer's.
 *
 * THE SEAM is the rendered `<aside id="wz-sidebar">`: which custom properties
 * it declares, for which viewer. Everything below it reads those through a
 * `var(--rail-x, <today's token>)` fallback, so the aside's own style attribute
 * is the whole switch — measure it there and the ~40 downstream sites follow by
 * construction rather than one assertion each.
 *
 * The rail was hardcoded to the na kit: `--color-bg-surface` panels, the app's
 * three text tiers, and `--faction-default-rainbow` on the hairline, the avatar
 * ring and both tracks. Its own comment asserted the point it got wrong — "the
 * rainbow ring and the whole rail already say unaffiliated".
 *
 * THE HARDEST HALF IS THE NEGATIVE. The acceptance criterion is that an
 * unaffiliated viewer is pixel-identical, so the na cases assert that NOTHING
 * is declared — a rail that took `--faction-default-card-bg` instead of
 * `--color-bg-surface` would look almost right, pass a "is it tokenized" grep,
 * and still not be what shipped, because `--color-bg-surface` is a translucent
 * frost and the card sheet is opaque cream.
 *
 * Albescent is the same assertion for a different reason and is checked
 * separately for exactly that reason: it IS a faction, with a roster and a
 * manifest, and it refuses to look like one (ADR-0048, #783). A regression that
 * gave it a colour family would be a leak, not a style bug.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

const viewer = vi.hoisted(() => ({ slug: 'na' as string | null }))

vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    refetch: vi.fn(),
    loading: false,
  }),
}))

// Effects never run under `renderToStaticMarkup`, so auth is stubbed rather
// than awaited — otherwise the rail renders its signed-out branch and there is
// no character card to dress.
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      account_id: 9,
      era_name: 'Era One',
      character: {
        id: 42,
        display_name: 'Mollusk',
        avatar_url: '',
        faction_slug: viewer.slug,
        level: 3,
        score: 120,
        all_time_score: 400,
      },
    } as unknown as CurrentUser,
  }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

import Sidebar from '../Sidebar'

function renderAs(slug: string | null): string {
  viewer.slug = slug
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

/** The `<aside>`'s own opening tag — where the seam is declared, and nowhere else. */
function asideTag(html: string): string {
  const at = html.indexOf('<aside')
  expect(at, 'the rail did not render an <aside>').toBeGreaterThanOrEqual(0)
  return html.slice(at, html.indexOf('>', at) + 1)
}

/** The locals `railFaceVars` declares, all or nothing. Eight at #2361; the ninth
 *  arrived with #2404, which gave the panels a spectrum ring and switches it off
 *  for a member so their own hairline stands. */
const RAIL_LOCALS = [
  '--rail-paper',
  '--rail-ink',
  '--rail-quiet',
  '--rail-line',
  '--rail-radius',
  '--rail-face',
  '--rail-well',
  '--rail-spectrum',
  '--spectrum-frame-image',
] as const

/** What the unaffiliated rail must keep, verbatim, at the site that reads it. */
const NA_FALLBACKS = [
  'var(--rail-paper,var(--color-bg-surface))',
  'var(--rail-line,var(--color-border))',
  // #2404 moved this one rung, on the owner's ruling: the unaffiliated frame is
  // the deliberate `--faction-default-card-radius` (10px, the documented
  // Default/Albescent rung), not `--radius-xl`'s 14px, which it had inherited by
  // accident. The SHAPE of the seam is unchanged — still one fallback read at
  // the site — which is why this list keeps the entry rather than dropping it.
  'var(--rail-radius,var(--faction-default-card-radius))',
  'var(--rail-ink,var(--color-text-primary))',
  'var(--rail-quiet,var(--color-text-secondary))',
  'var(--rail-quiet,var(--color-text-tertiary))',
  'var(--rail-well,var(--color-bg-surface-alt))',
  'var(--rail-spectrum,var(--faction-default-rainbow))',
  'var(--rail-spectrum,var(--faction-default-rainbow-conic))',
]

describe('a member sees the rail in their own faction (#2361)', () => {
  it('declares all eight locals, every one pointing at that faction', () => {
    const tag = asideTag(renderAs('coven'))
    for (const local of RAIL_LOCALS) expect(tag, `${local} missing`).toContain(local)
    expect(tag).toContain('--rail-paper:var(--faction-coven-card-bg)')
    expect(tag).toContain('--rail-ink:var(--faction-coven-card-text)')
    expect(tag).toContain('--rail-quiet:var(--faction-coven-card-muted)')
    expect(tag).toContain('--rail-line:var(--faction-coven-card-border)')
    expect(tag).toContain('--rail-radius:var(--faction-coven-card-radius)')
    expect(tag).toContain('--rail-face:var(--faction-coven-card-font)')
  })

  it('borrows no other faction — the sigils on the rows are a different fact', () => {
    // Every faction name in the seam has to be the viewer's. The rows below
    // still draw the TASK's / the item's faction (#1711, #1892), which is why
    // this looks only at the aside's own tag.
    const tag = asideTag(renderAs('snide'))
    const others = [...tag.matchAll(/--faction-([a-z]+)-/g)].map((match) => match[1])
    expect(new Set(others)).toEqual(new Set(['snide']))
  })

  it('carries the display-face switch, which is what index.css keys the type off', () => {
    expect(asideTag(renderAs('ephemerists'))).toContain('data-rail-face')
  })

  for (const slug of ['ua', 'wow', 'everymen', 'coven', 'snide', 'ephemerists', 'singularity']) {
    it(`${slug} takes its own sheet, not the na frost`, () => {
      expect(asideTag(renderAs(slug))).toContain(`--rail-paper:var(--faction-${slug}-card-bg)`)
    })
  }
})

// #2404 ENDED THE "PIXEL-IDENTICAL TO WHAT SHIPPED" HALF OF THIS, on the owner's
// ruling: the unaffiliated frame is now the rainbow at a deliberate 10px rather
// than a 7%-black hairline at an accidental 14px. What survives — and is the
// half that was always doing the work — is that the rail declares NOTHING for an
// unaffiliated viewer, so every value it draws is the na kit's own, read through
// a fallback at the site. That is still measured below, verbatim.
describe('an unaffiliated viewer declares nothing and reads the na kit (#2361)', () => {
  for (const slug of ['na', null, 'a-slug-the-server-invented']) {
    it(`declares no local at all for ${String(slug)}`, () => {
      const tag = asideTag(renderAs(slug))
      for (const local of RAIL_LOCALS) expect(tag, `${local} leaked`).not.toContain(local)
      expect(tag).not.toContain('data-rail-face')
    })
  }

  it('leaves every fallback standing at the site that reads it', () => {
    // Not "the rail is neutral" — the exact strings, so a repoint onto
    // `--faction-default-card-bg` (which is opaque cream, where the frost is
    // 72% white) fails here rather than in a screenshot.
    const html = renderAs('na').replace(/\s*([:,])\s*/g, '$1')
    for (const fallback of NA_FALLBACKS) expect(html, `${fallback} moved`).toContain(fallback)
  })

  it('still spells the unaffiliated spectrum on the ring, the hairline and both tracks', () => {
    const html = renderAs('na')
    expect(html).toContain('--faction-default-rainbow-conic')
    expect(html).toContain('--faction-default-rainbow)')
  })
})

describe('Albescent gets the na rail, and that is ADR-0048 (#2361)', () => {
  it('mints no colour family for it — the same absence as unaffiliated', () => {
    const tag = asideTag(renderAs('albescent'))
    for (const local of RAIL_LOCALS) expect(tag, `${local} leaked`).not.toContain(local)
    expect(tag).not.toContain('albescent')
  })

  it('renders identically to an unaffiliated rail but for the drift hook', () => {
    // This asserted BYTE-identical until #2404, and its own note named the exit:
    // "a future overlay (the shimmer ADR-0048 permits) would break this
    // deliberately — and should be a conversation, which is what a failure here
    // forces." That conversation happened; the owner ruled the Albescent frame
    // drifts. So the assertion is not relaxed to "they differ" — it names the
    // one permitted difference and holds everything else to the same byte
    // equality, and a colour family minted for Albescent still fails here.
    //
    // `data-spectrum-drift` adds no paint of its own. It is matched only by the
    // DEFERRED `motion.ornament.css`, so what it buys is motion and nothing
    // else. The full form of that seam is `railSpectrumFrame.test.tsx`.
    expect(renderAs('albescent').split(' data-spectrum-drift=""').join('')).toBe(renderAs('na'))
  })
})
