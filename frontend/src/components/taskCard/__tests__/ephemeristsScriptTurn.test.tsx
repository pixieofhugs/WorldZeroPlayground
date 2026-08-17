/**
 * Task cards v3, Phase 3 — the Ephemerists points label and CTA turn through
 * five scripts (#2038, epic #2027).
 *
 * THE SEAM is three files that must agree and have no compiler between them:
 * the card's rendered markup, `src/fonts.css`, and `src/index.css`. This repo
 * has no jsdom (`renderToStaticMarkup` only, so effects never run and geometry
 * is out of reach), and the two failures that matter here are both invisible to
 * a running browser on the developer's own machine:
 *
 *   • A GLYPH WITH NO FACE renders as tofu on Linux and Android and renders
 *     perfectly on the reviewer's Mac or Windows box, because the per-OS
 *     fallbacks (`Geeza Pro`, `Segoe UI Historic`) cover different scripts.
 *     So the codepoint check below reads the turns out of the component and
 *     asks whether `fonts.css` ships a `unicode-range` covering each one, in
 *     the family the turn actually names.
 *   • A ROTATION THAT CANNOT BE STOPPED is a WCAG 2.2.2 defect that looks
 *     exactly like a working feature. The stylesheet, not the component, is
 *     where both mechanisms live, so the stylesheet is what is asserted.
 *
 * The box-pinning is the third thing markup can prove and a browser cannot
 * easily: all five variants are laid in ONE grid cell, so the box is the widest
 * of them by layout rather than by a measurement pass that a test could not run.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import EphemeristsTaskCard, {
  CTA_TURNS,
  POINTS_TURNS,
  nextTurn,
} from '../EphemeristsTaskCard'
import { aTask } from '../../../test/fixtures'

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const FONTS_CSS = readFileSync(join(SRC, 'fonts.css'), 'utf-8')
const INDEX_CSS = readFileSync(join(SRC, 'index.css'), 'utf-8')
const CARD = readFileSync(join(SRC, 'components', 'taskCard', 'EphemeristsTaskCard.tsx'), 'utf-8')

const TASK = aTask({ in_progress_count: 2 })

function render(task = TASK): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsTaskCard
        task={task}
        basePoints={task.point_value}
        multiplier={1}
        inProgressCount={task.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

/** The catalogue's own words, put back after the test that overwrites them. */
const CATALOGUE = {
  pointsUnit: i18n.t('feed:taskCard.pointsUnit'),
  signup: i18n.t('feed:taskCard.signup'),
}
afterEach(() => {
  i18n.addResourceBundle('en', 'feed', { taskCard: CATALOGUE }, true, true)
})

describe('the rotation is decoration over a stable accessible name (#2038)', () => {
  it('carries every variant in the markup, so the box is the widest one', () => {
    const html = render()
    for (const turn of [...POINTS_TURNS, ...CTA_TURNS]) {
      expect(html, `frame ${turn.text}`).toContain(turn.text)
    }
    // All ten sit in a single grid cell — one per stack, stacked, never in a
    // row. That IS the pin: no measurement pass, no `important` width.
    expect(html.match(/grid-area:1 \/ 1/g)?.length).toBe(
      POINTS_TURNS.length + CTA_TURNS.length + 2,
    )
  })

  it('hides every glyph from assistive tech and leaves the word behind', () => {
    const html = render()
    const unit = i18n.t('feed:taskCard.pointsUnit')
    const signup = i18n.t('feed:taskCard.signup')

    // Both stacks are aria-hidden…
    expect(html).toContain('class="eph-turn eph-turn-points" aria-hidden="true"')
    expect(html).toContain('class="eph-turn eph-turn-cta" aria-hidden="true"')
    // …and each leaves exactly one visually-hidden copy of the live string, so
    // the accessible name is the word and never a glyph or a concatenation.
    expect(html).toContain(`<span class="sr-only">${unit}</span>`)
    expect(html).toContain(`<span class="sr-only">${signup}</span>`)
  })

  it('takes frame 1 from the catalogue, not from a hardcoded "Points"', () => {
    i18n.addResourceBundle(
      'en',
      'feed',
      { taskCard: { pointsUnit: 'Puntos', signup: 'Apuntarse' } },
      true,
      true,
    )
    const html = render()
    expect(html, 'the points unit follows the catalogue').toContain('Puntos')
    expect(html, 'and so does the CTA').toContain('Apuntarse')
    expect(html, 'while the ornament frames stay put').toContain('PVNCTA')
  })

  it('leaves the wordmark in English', () => {
    // `rotateEphWordmark()` retires itself in its own body; only these two
    // elements turn. THE EPHEMERISTS is written once, plainly.
    const html = render()
    expect(html.match(/The Ephemerists/gi)?.length).toBe(1)
  })

  it('says nothing but the reason on a card that cannot be signed up for', () => {
    const denied = aTask({ can_sign_up: false, signup_reason: 'below_level' })
    const html = render(denied)
    expect(html, 'a refusal is not an invitation in five scripts').not.toContain('ADSCRIBE')
    // The points label is a unit, not an offer, so it turns either way.
    expect(html).toContain('PVNCTA')
  })
})

/**
 * Every codepoint the card prints has a face shipped for it.
 *
 * The failure this exists for does not throw, warn or look wrong to whoever
 * wrote it — `docs/agents/design-fidelity.md` records the same class from #821.
 * A missing face falls back to a system font that carries the script on ONE
 * platform, so the tofu is only ever visible to somebody else.
 */
describe('no frame can render as tofu (#2038)', () => {
  /** The codepoints one `@font-face` rule's `unicode-range` covers. */
  function coverage(family: string): Set<number> {
    const points = new Set<number>()
    for (const block of FONTS_CSS.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      if (!block[1].includes(`font-family: '${family}'`)) continue
      const range = block[1].match(/unicode-range:\s*([^;]+);/)?.[1] ?? ''
      for (const part of range.split(',')) {
        const [from, to] = part.trim().replace(/^u\+/i, '').split('-')
        const start = parseInt(from, 16)
        const end = to === undefined ? start : parseInt(to, 16)
        for (let point = start; point <= end; point++) points.add(point)
      }
    }
    return points
  }

  it('ships a face covering every non-Latin character in every turn', () => {
    const missing: string[] = []
    for (const turn of [...POINTS_TURNS, ...CTA_TURNS]) {
      const family = String(turn.style.fontFamily).match(/'([^']+)'/)?.[1]
      if (!family) continue // Cinzel, via the shared token — Latin, already loaded.
      const covered = coverage(family)
      for (const character of turn.text) {
        const point = character.codePointAt(0)
        if (point !== undefined && !covered.has(point)) {
          missing.push(`${character} (U+${point.toString(16)}) in ${family}`)
        }
      }
    }
    expect(
      missing,
      `src/fonts.css ships no face covering ${missing.join(', ')}.
` +
        `Nothing fails: the glyph renders in whatever system font the viewer's
` +
        `OS happens to carry for that script, or as a tofu box if it carries
` +
        `none — and the two look identical to a reviewer whose OS has one.
` +
        `Add the character to TEXT_FACES in scripts/fetch-fonts.mjs and re-run it.`,
    ).toEqual([])
  })

  it('keeps the ornament out of the catalogue', () => {
    // Four strings no translator can act on (#440). They are constants here.
    const catalogue = readFileSync(join(SRC, 'locales', 'en', 'feed.json'), 'utf-8')
    for (const turn of [...POINTS_TURNS, ...CTA_TURNS]) {
      expect(catalogue, `${turn.text} belongs to the component`).not.toContain(turn.text)
    }
  })
})

/**
 * WCAG 2.2.2 — the rotation auto-updates, starts on its own, and sits beside
 * other content, so it needs a mechanism to pause, stop or hide it. Two ship,
 * and both are in the stylesheet where the cascade can reach them.
 */
describe('the turn can always be stopped (#2038)', () => {
  /** The body of one rule, looked up by selector. */
  const rule = (selector: string): string =>
    INDEX_CSS.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{([^}]*)\\}`))?.[1] ?? ''

  it('starts only under prefers-reduced-motion: no-preference', () => {
    const gated = INDEX_CSS.slice(INDEX_CSS.indexOf('@keyframes eph-turn'))
    const declaration = gated.indexOf('animation: eph-turn')
    const guard = gated.lastIndexOf('@media (prefers-reduced-motion: no-preference)', declaration)
    expect(declaration, 'the turn is declared at all').toBeGreaterThan(0)
    expect(guard, 'and only inside the reduced-motion guard').toBeGreaterThan(0)
    // Nothing between the guard and the declaration closes it.
    expect(gated.slice(guard, declaration)).not.toContain('}\n}')
  })

  it('pauses while the card is hovered or focused', () => {
    expect(rule('.eph-turn-scope:hover .eph-turn')).toContain('animation-play-state: paused')
    expect(rule('.eph-turn-scope:focus-within .eph-turn')).toContain(
      'animation-play-state: paused',
    )
  })

  it('keeps the clock in the stylesheet, never inline', () => {
    // An inline animation property would be motion the media query cannot
    // reach. Only a VALUE counts — this file names the keyframes in prose.
    expect(CARD).not.toMatch(/animation[A-Za-z]*:\s*["'`]/)
  })

  it('never shows the same frame twice running', () => {
    for (let current = 0; current < 5; current++) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const next = nextTurn(current, 5)
        expect(next).not.toBe(current)
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThan(5)
      }
    }
  })
})
