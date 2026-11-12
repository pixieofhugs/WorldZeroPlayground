/**
 * #2404: the unaffiliated rail frame is the rainbow at the 10px Default rung,
 * and Albescent differs by exactly one motion attribute (owner ruling,
 * ADR-0048). The ring lives in render-blocking `index.css`, the drift in the
 * deferred `motion.ornament.css`; a leak would still look right, hence measured.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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
import { readIndexCss } from '../../../test/indexCss'

function renderAs(slug: string | null): string {
  viewer.slug = slug
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

const sheet = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8')

const INDEX = readIndexCss()
const MOTION = sheet('motion.ornament.css')

/** One rule body, for the first selector that contains `needle`. */
function ruleBody(css: string, needle: string): string {
  const at = css.indexOf(needle)
  if (at < 0) throw new Error(`no rule for ${needle}`)
  const open = css.indexOf('{', at)
  return css.slice(open + 1, css.indexOf('}', open))
}

describe('the unaffiliated rail frame is the rainbow (#2404)', () => {
  it('frames every panel — every section carries the shared class', () => {
    const html = renderAs('na')
    // Counted, so a new panel cannot ship unframed.
    const sections = html.match(/<section\b[^>]*>/g) ?? []
    expect(sections.length, 'the rail lost its panels').toBeGreaterThan(2)
    for (const tag of sections) expect(tag, `unframed panel: ${tag}`).toContain('spectrum-frame')
  })

  it('takes the deliberate 10px rung, not --radius-xl by accident', () => {
    const html = renderAs('na').replace(/\s*([:,])\s*/g, '$1')
    expect(html).toContain('var(--rail-radius,var(--faction-default-card-radius))')
    expect(html, '--radius-xl was the accident, not the intent').not.toContain(
      'var(--rail-radius,var(--radius-xl))',
    )
  })

  it('draws no drift for an unaffiliated viewer', () => {
    expect(renderAs('na')).not.toContain('data-spectrum-drift')
  })
})

describe("a member's own hairline still stands (#2404)", () => {
  for (const slug of ['coven', 'snide', 'ua']) {
    it(`${slug} suppresses the spectrum rather than wearing it`, () => {
      const html = renderAs(slug).replace(/\s*([:,])\s*/g, '$1')
      expect(html, 'the ring must paint nothing over a faction kit').toContain(
        '--spectrum-frame-image:none',
      )
      expect(html).not.toContain('data-spectrum-drift')
    })
  }
})

describe('Albescent differs from unaffiliated by MOTION, and by nothing else (#2404)', () => {
  it('adds the drift attribute and changes not one other byte', () => {
    const albescent = renderAs('albescent')
    expect(albescent).toContain('data-spectrum-drift')
    expect(albescent.split(' data-spectrum-drift=""').join('')).toBe(renderAs('na'))
  })
})

describe('the ring is colour, the drift is motion — different sheets (#2404)', () => {
  it('index.css carries the ring, masked rather than bordered', () => {
    const body = ruleBody(INDEX, '.spectrum-frame::before')
    expect(body, 'the TILING cut — a frame wraps a corner and must not seam').toContain(
      'var(--faction-default-rainbow-loop)',
    )
    expect(body, 'radius-safe: border-image does not clip to border-radius').toContain(
      'mask-composite',
    )
    expect(body, "the ring follows its own element's corner").toContain('border-radius: inherit')
  })

  it('index.css carries no animation for it — motion may never block first paint', () => {
    expect(ruleBody(INDEX, '.spectrum-frame::before')).not.toContain('animation')
    expect(INDEX, 'the drift declaration belongs in the deferred sheet').not.toContain(
      'data-spectrum-drift',
    )
  })

  it('motion.ornament.css reuses the keyframe that already exists', () => {
    const body = ruleBody(MOTION, 'data-spectrum-drift')
    expect(body, 'alb-drift is already built and already tiles at 220px').toContain('alb-drift')
    expect(MOTION, 'no second keyframe for a slide that already ships').not.toContain(
      '@keyframes alb-drift',
    )
    expect(INDEX, 'the name the deferred sheet reaches for, defined once').toContain(
      '@keyframes alb-drift',
    )
  })

  it('reduced motion stops the drift', () => {
    const at = MOTION.indexOf('data-spectrum-drift')
    expect(at, 'no drift rule at all').toBeGreaterThan(0)
    expect(
      MOTION.slice(MOTION.lastIndexOf('@media', at), at),
      'the drift must be opt-in under no-preference',
    ).toContain('prefers-reduced-motion: no-preference')
  })
})
