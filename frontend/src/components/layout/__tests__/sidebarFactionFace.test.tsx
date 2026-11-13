/**
 * #2361: the desktop rail wears the viewer's faction. The seam is the
 * `<aside id="wz-sidebar">` style attribute; downstream sites read it through
 * `var(--rail-x, <neutral>)` fallbacks, so measuring the aside covers them all.
 *
 * The na cases assert NOTHING is declared: `--faction-default-card-bg` (opaque
 * cream) would look almost right but is not the frost `--color-bg-surface`.
 * Albescent is checked separately: a real faction that refuses to look like one
 * (ADR-0048).
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

/** The `<aside>`'s opening tag, where the seam is declared. */
function asideTag(html: string): string {
  const at = html.indexOf('<aside')
  expect(at, 'the rail did not render an <aside>').toBeGreaterThanOrEqual(0)
  return html.slice(at, html.indexOf('>', at) + 1)
}

/** The locals `railFaceVars` declares, all or nothing. */
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
    // Only the aside's tag: rows still draw the task's/item's faction.
    const tag = asideTag(renderAs('snide'))
    const others = [...tag.matchAll(/--faction-([a-z]+)-/g)].map((match) => match[1])
    expect(new Set(others)).toEqual(new Set(['snide']))
  })

  it('carries the display-face switch, which is what index.css keys the type off', () => {
    expect(asideTag(renderAs('ephemerists'))).toContain('data-rail-face')
  })

  // S.N.I.D.E. is the exception (#2631); see the block below.
  for (const slug of ['ua', 'wow', 'everymen', 'coven', 'ephemerists', 'singularity']) {
    it(`${slug} takes its own sheet, not the na frost`, () => {
      expect(asideTag(renderAs(slug))).toContain(`--rail-paper:var(--faction-${slug}-card-bg)`)
    })
  }
})

/**
 * S.N.I.D.E.'s rail stands on the wall (#2631, ADR-0085): its `-card-bg` is the
 * photocopier slab, near-black in both themes, while the wall flips.
 */
describe('the S.N.I.D.E. rail takes the wall, not the slab (#2631)', () => {
  const WALL_FACE: [string, string][] = [
    ['--rail-paper', 'var(--faction-snide-wall)'],
    ['--rail-ink', 'var(--faction-snide-note-ink)'],
    ['--rail-quiet', 'var(--faction-snide-note-muted)'],
    ['--rail-line', 'var(--faction-snide-note-wall-edge)'],
  ]

  it('grounds on the wall and inks with the family that flips with it', () => {
    const tag = asideTag(renderAs('snide'))
    for (const [local, token] of WALL_FACE) expect(tag).toContain(`${local}:${token}`)
    expect(
      tag,
      'the slab is pinned near-black in both cascades — that is what made the rail an island.',
    ).not.toContain('--faction-snide-card-bg')
  })

  it('keeps the geometry and the face off the card family, which do not flip', () => {
    const tag = asideTag(renderAs('snide'))
    expect(tag).toContain('--rail-radius:var(--faction-snide-card-radius)')
    expect(tag).toContain('--rail-face:var(--faction-snide-card-font)')
  })

  it('ramps the level track in the hue rung that reads on the wall', () => {
    // `--faction-snide` reads 1.87:1 on the light wall (< 3:1); `-wall-credit`
    // is the same hue's wall rung (#2177).
    const tag = asideTag(renderAs('snide'))
    expect(tag).toContain('--faction-snide-wall-credit')
  })
})

describe('an unaffiliated viewer declares nothing and reads the na kit (#2361)', () => {
  for (const slug of ['na', null, 'a-slug-the-server-invented']) {
    it(`declares no local at all for ${String(slug)}`, () => {
      const tag = asideTag(renderAs(slug))
      for (const local of RAIL_LOCALS) expect(tag, `${local} leaked`).not.toContain(local)
      expect(tag).not.toContain('data-rail-face')
    })
  }

  it('leaves every fallback standing at the site that reads it', () => {
    // Exact strings, so a repoint onto `--faction-default-card-bg` fails here.
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
    // The one permitted difference is the motion hook (owner ruling, #2404);
    // see `railSpectrumFrame.test.tsx`.
    expect(renderAs('albescent').split(' data-spectrum-drift=""').join('')).toBe(renderAs('na'))
  })
})
