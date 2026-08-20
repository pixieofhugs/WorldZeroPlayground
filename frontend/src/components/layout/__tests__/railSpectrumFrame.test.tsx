/**
 * #2404 — the unaffiliated frame becomes the rainbow, and Albescent's drifts.
 *
 * THE SEAM is the same one #2361 measured: the rendered `<aside id="wz-sidebar">`
 * and the panels inside it. Everything the rail draws reads a
 * `var(--rail-x, <today's token>)` fallback, so the aside's own style attribute
 * plus the class on the panels is the whole switch.
 *
 * WHAT WAS WRONG. An unaffiliated rail declares no `--rail-*` local at all —
 * that is #2361's promise and it holds — so its panel frame fell all the way
 * through to `var(--color-border)`, which is `rgba(0, 0, 0, 0.07)`: a 7% black
 * hairline, effectively invisible. Its radius fell through to `--radius-xl`
 * (14px) by accident, while `--faction-default-card-radius` (10px) is the
 * documented Default/Albescent rung. The rail already spelled the spectrum on
 * the avatar ring and one hairline; the frame itself was grey.
 *
 * ALBESCENT DIFFERS BY MOTION, AND BY NOTHING ELSE. #2361's own test asserted
 * the two rails were byte-identical and its comment named the exit: "a future
 * overlay (the shimmer ADR-0048 permits) would break this deliberately — and
 * should be a conversation". #2404 is that conversation, and the owner's ruling
 * is motion only. So the assertion here is not weakened to "they differ": it is
 * TIGHTENED to "they differ by exactly one attribute", which still fails if a
 * colour family is ever minted for Albescent (ADR-0048).
 *
 * TWO SHEETS, AND WHICH RULE LIVES IN WHICH IS PART OF THE CONTRACT. The ring
 * is colour and layout, so it is in the render-blocking `index.css`. The drift
 * is motion, so it is in the deferred `motion.ornament.css` — off the entry
 * HTML and outside the byte ledger. A drift declaration that leaked back into
 * index.css would still LOOK right in a browser, which is exactly why it is
 * measured here.
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

// Effects never run under `renderToStaticMarkup`, so auth is stubbed rather
// than awaited — otherwise the rail renders its signed-out branch and there is
// no panel to frame.
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

const sheet = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8')

const INDEX = sheet('index.css')
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
    // Counted rather than named: a fourth panel added later cannot ship
    // unframed without failing here.
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
    // #2361 asserted these two renders were byte-identical. The owner's ruling
    // ends that deliberately, so the test does not go away — it names the exact
    // and only permitted difference. A colour family minted for Albescent still
    // fails here, which is the leak ADR-0048 guards.
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
