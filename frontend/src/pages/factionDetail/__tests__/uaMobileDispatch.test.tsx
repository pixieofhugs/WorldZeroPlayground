/**
 * Mobile faction-page UA dispatch + rendered identity (#525, #852).
 *
 * The registry half asserts the #518 mobile map resolves `ua` to the bespoke
 * page and that everything else falls through to DefaultFactionPage. The
 * rendered half asserts the MARKUP the practice's page emits now the salon is
 * dead (#788): the ensō as the faction mark, the mandala at `texture` behind the
 * hero only, and no gold anywhere.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import { pickVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { surfaceMap } from '../../../factions'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import UaFactionPage from '../mobileArchetypes/UaFactionPage'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'

const MEMBER: CharacterOut = {
  id: 7,
  username: 'ada',
  display_name: 'Ada Reed',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 2,
  score: 120,
  all_time_score: 340,
  faction_slug: 'ua',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    state: 'eligible',
    currentFactionSlug: null,
    join: async () => {},
    joining: false,
    joinError: null,
    ...overrides,
  }
}

function baseState(overrides: Partial<FactionDetailState> = {}): FactionDetailState {
  return {
    slug: 'ua',
    loading: false,
    faction: { slug: 'ua', status: 'visible' },
    fetchError: null,
    members: [MEMBER],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
    membership: membership(),
    ...overrides,
  }
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('mobile faction-page UA dispatch', () => {
  it('mobile + the UA faction resolves to the bespoke UA page', () => {
    expect(resolvedArchetype(pickVariant(surfaceMap('mobileFactionPage'), 'ua', DefaultFactionPage))).toBe(UaFactionPage)
  })

  it('every other faction falls through to the Default mobile page', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(resolvedArchetype(pickVariant(surfaceMap('mobileFactionPage'), slug, DefaultFactionPage))).toBe(DefaultFactionPage)
    }
  })
})

describe('UA mobile faction page — what it draws', () => {
  it('sets the ensō beside the name as the faction mark', () => {
    const { html } = render(<UaFactionPage state={baseState()} />)
    // The one ensō (#908): the vendored brush drawing, painted through a mask.
    expect(html).toContain('/factionMarks/enso.webp')
    expect(html).toContain('var(--faction-ua-glow)')
  })

  it('runs the mandala behind the hero only', () => {
    const { html } = render(<UaFactionPage state={baseState()} />)
    // The mandala's outer guide circle; the ensō draws no such hairline stroke.
    expect(html.match(/stroke-width="0\.6"/g)).toHaveLength(1)
    expect(html).toContain('opacity:0.14')
  })

  it('keeps its slots: name, stats, the circle, and the invite-gated join', () => {
    const { html, text } = render(<UaFactionPage state={baseState()} />)
    expect(text).toContain('UA')
    expect(text).toContain('Ada Reed')
    expect(html).toContain('href="/characters/7"')

    const gated = render(<UaFactionPage state={baseState({ membership: membership({ state: 'gate' }) })} />)
    expect(gated.text, 'no CTA for a gated viewer').not.toContain('Join UA')
  })

  it('carries no gold: the legacy --ua-* palette and Cinzel are gone here', () => {
    const { html } = render(<UaFactionPage state={baseState()} />)
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/)
    expect(html).not.toMatch(/--font-faction-engraved/)
  })
})
