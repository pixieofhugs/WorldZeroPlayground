/**
 * UA task card, ornament pass (#2031, task cards v3 Phase 2).
 *
 * The seam is the one every other card test works at: the rendered markup of
 * the skin, via `renderToStaticMarkup`. No jsdom, so effects never run and
 * geometry is out of reach — what is checkable is which elements exist, where
 * they sit relative to each other, and which inline declarations they carry.
 *
 * TWO OF THE ISSUE'S FOUR CHANGES ARE CONSTANTS and are deliberately not
 * asserted: the ensō grows from 96 to 124 (84 to 108 on mobile) and the level
 * numeral moves a rung up the type scale. A test that restated either number
 * would only re-type the constant next to it.
 *
 * The two that are NOT constants are here. The mandala flank is a layout with
 * an overlap rule attached to it, and the boundary ring is a new default on a
 * primitive SIX other UA surfaces mount — a regression there is invisible on
 * this card and wrong on the faction hero.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import UaTaskCard from '../UaTaskCard'
import UaMandala from '../../factionMarks/UaMandala'
import { aTask } from '../../../test/fixtures'
import { readIndexCss } from '../../../test/indexCss'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  in_progress_count: 4,
})

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <UaTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

/** Every `data-ua-flank` slot, in document order. */
function flanks(html: string): string[] {
  return [...html.matchAll(/data-ua-flank="([a-z]+)"/g)].map((m) => m[1])
}

/**
 * One flank's markup, opening tag through its close.
 *
 * Throws rather than returning `''` when the slot is missing, so a card that
 * drops the ornament entirely fails every assertion below instead of passing
 * them all vacuously against an empty string.
 */
function flankSlot(html: string, side: 'start' | 'end'): string {
  const at = html.indexOf(`data-ua-flank="${side}"`)
  if (at < 0) throw new Error(`no data-ua-flank="${side}" in the rendered card`)
  const slot = html.slice(at)
  return slot.slice(0, slot.indexOf('</span>') + '</span>'.length)
}

describe('the mandalas flank the CTA (#2031)', () => {
  it('puts one on each side of the sign-up, on both form factors', () => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const html = render()
      expect(flanks(html), formFactor).toEqual(['start', 'end'])
      // Order is the assertion: the button is BETWEEN them, not after both.
      const [start, button, end] = [
        html.indexOf('data-ua-flank="start"'),
        html.indexOf('<button'),
        html.indexOf('data-ua-flank="end"'),
      ]
      expect(start, formFactor).toBeLessThan(button)
      expect(button, formFactor).toBeLessThan(end)
    }
    mocks.formFactor = 'desktop'
  })

  it('keeps them in flow, so no card width can put one over the button', () => {
    // `docs/agents/design-fidelity.md` names the failure this guards: ornament
    // positioned absolutely over a plate drawn for smaller marks, overlapping
    // the control beneath it. Three in-flow flex siblings cannot overlap at any
    // width — they overflow the row instead, and the article clips them. A
    // flank that grew `position:absolute` would look right at 384px and land on
    // the button at 260px, which no render test could see.
    const html = render()
    for (const side of ['start', 'end'] as const) {
      const slot = flankSlot(html, side)
      expect(slot.slice(0, slot.indexOf('>')), side).not.toContain('position:absolute')
    }
  })

  it('is ornament, not a second control', () => {
    // The button is the only thing in the row a finger can hit; the flanks are
    // decorative, so they take no pointer events and are hidden from the
    // accessible tree (`UaMandala` marks its own `aria-hidden`).
    const html = render()
    for (const side of ['start', 'end'] as const) {
      const slot = flankSlot(html, side)
      expect(slot.slice(0, slot.indexOf('>')), side).toContain('pointer-events:none')
      expect(slot, side).toContain('aria-hidden="true"')
    }
    // Still exactly one control on the card.
    expect(html.match(/<button/g) ?? []).toHaveLength(1)
  })
})

describe('the flanking mandalas lose their outer boundary ring (#2031)', () => {
  /**
   * `UaMandala`'s outermost circle is drawn at `r=47` — 0.94 of the 100-unit
   * box's half-width. The design trims it on this card only
   * (`[data-ua-mast] svg circle[r="47"]`), which is a rendered-output change on
   * the task card and MUST NOT reach the vote control, the faction hero, the
   * backdrop, the select card or the field desk.
   */
  const BOUNDARY = /r="47"/

  it('draws no boundary circle beside the CTA', () => {
    const html = render()
    for (const side of ['start', 'end'] as const) {
      expect(flankSlot(html, side), side).not.toMatch(BOUNDARY)
    }
  })

  it('still draws it everywhere else — the primitive default is unchanged', () => {
    expect(renderToStaticMarkup(<UaMandala size={240} />)).toMatch(BOUNDARY)
  })
})

/**
 * The petal pop and the hue cycle (#2072).
 *
 * The seam is the JOIN between this markup and `src/motion.ornament.css`: the
 * component publishes per-band custom properties and the sheet's keyframes read
 * them. Neither half can be checked alone, and the two ways this ships broken
 * are both invisible in a passing build —
 *
 *  - the pop opens at `opacity: 0`, so a band whose REST is not one of the
 *    animation's own drawn frames leaves a reduced-motion reader (or anyone the
 *    deferred sheet has not reached yet) looking at a rosette with no petals;
 *  - the plateau is `var(--ua-band-alpha)` rather than `1` precisely so the
 *    figure's depth survives the animation, which only holds while the property
 *    the component sets and the frame the keyframe draws stay the same number.
 *
 * So the keyframe is PARSED and compared against the markup, rather than either
 * number being re-typed here.
 */
describe('the flanking mandalas pop and cycle hue (#2072)', () => {
  const SHEET = readFileSync(
    fileURLToPath(new URL('../../../motion.ornament.css', import.meta.url)),
    'utf8',
  )

  /** One `@keyframes NAME { … }` body, brace-matched. */
  function keyframes(name: string): string {
    const at = SHEET.indexOf(`@keyframes ${name}`)
    if (at < 0) throw new Error(`no @keyframes ${name} in src/motion.ornament.css`)
    const open = SHEET.indexOf('{', at)
    let depth = 1
    let index = open + 1
    while (index < SHEET.length && depth > 0) {
      if (SHEET[index] === '{') depth += 1
      else if (SHEET[index] === '}') depth -= 1
      index += 1
    }
    return SHEET.slice(open + 1, index - 1)
  }

  /** Every band `<g>` of the start flank, opening tag only. */
  function bands(html: string): string[] {
    return [...flankSlot(html, 'start').matchAll(/<g [^>]*class="ua-mandala-pulse[^>]*>/g)].map(
      (m) => m[0],
    )
  }

  it('runs both animations on every band, one hue variant per ring', () => {
    const html = render()
    // rings={3}: hub outward, the inner cycle, the mid, then the outer.
    expect(bands(html).map((g) => g.match(/ua-mandala-pulse--(\w+)/)?.[1])).toEqual([
      'inner',
      'mid',
      'outer',
    ])
    for (const flank of ['start', 'end'] as const) {
      expect(flankSlot(html, flank), flank).toContain('ua-mandala-pulse')
    }
  })

  it('staggers the bands from their index, and opens the hue cycle mid-way', () => {
    const html = render()
    const prop = (g: string, name: string): string =>
      g.match(new RegExp(`${name}:\\s*([^;"]+)`))?.[1] ?? ''
    expect(bands(html).map((g) => prop(g, '--ua-pop-delay'))).toEqual(['0s', '0.8s', '1.6s'])
    // NEGATIVE: each band is already mid-cycle on first paint (#2072).
    expect(bands(html).map((g) => prop(g, '--ua-hue-delay'))).toEqual(['-0.4s', '-1.8s', '-3.2s'])
  })

  it('never writes an inline animation — that would bypass the gate', () => {
    // The classes are the only route to motion, and every rule behind them is
    // inside `@media (prefers-reduced-motion: no-preference)`.
    expect(render()).not.toContain('animation')
    for (const rule of ['.ua-mandala-pulse ', '.ua-mandala-pulse--outer']) {
      const at = SHEET.indexOf(rule)
      expect(at, rule).toBeGreaterThan(-1)
      const gate = SHEET.lastIndexOf('@media (prefers-reduced-motion: no-preference)', at)
      expect(gate, rule).toBeGreaterThan(-1)
      // …and no gate closed between that wrapper and the rule.
      expect(SHEET.slice(gate, at)).not.toMatch(/^\}/m)
    }
  })

  it('stills to the drawn figure: full petals at the pop’s own plateau', () => {
    // The pop opens at 0 and the sheet may never arrive, so the rest state has
    // to be a frame the animation actually holds. It is the band's `opacity`
    // attribute — untouched markup — and the keyframe interpolates to exactly
    // that number through `--ua-band-alpha`.
    const pop = keyframes('ua-petal-pop')
    expect(pop).toMatch(/0%\s*\{\s*opacity:\s*0\b/)
    expect(pop).toContain('opacity: var(--ua-band-alpha, 1)')

    const html = render()
    const drawn = bands(html)
    expect(drawn).toHaveLength(3)
    for (const g of drawn) {
      const attribute = g.match(/opacity="([\d.]+)"/)?.[1]
      const published = g.match(/--ua-band-alpha:\s*([\d.]+)/)?.[1]
      expect(attribute, g).toBe(published)
      expect(Number(attribute)).toBeGreaterThan(0)
    }
    // Every petal is drawn either way: 3 rings x 8 petals, per flank.
    expect(flankSlot(html, 'start').match(/<path/g) ?? []).toHaveLength(24)
  })

  it('cycles `fill` from the ramp, never `color` and never a hex', () => {
    // `currentColor` on this row resolves to the leaf's BODY INK — the trap
    // UaTaskCard's docstring names. Animating `fill` leaves the primitive's own
    // `--faction-ua-glow` as the resting hue.
    for (const variant of ['ua-hue-outer', 'ua-hue-mid', 'ua-hue-inner']) {
      const body = keyframes(variant)
      expect(body, variant).not.toContain('color:')
      expect(body, variant).not.toMatch(/#[0-9a-fA-F]{3}/)
      expect(body.match(/fill:/g) ?? [], variant).not.toHaveLength(0)
    }
    // Both halves of every stop are declared, so the ramp is not a dark-only
    // palette leaking onto the light card.
    const css = readIndexCss()
    const stops = new Set(
      ['ua-hue-outer', 'ua-hue-mid', 'ua-hue-inner']
        .flatMap((name) => [...keyframes(name).matchAll(/var\((--[\w-]+)\)/g)])
        .map((m) => m[1]),
    )
    expect(stops.size).toBe(9)
    for (const stop of stops) {
      const declarations = css.match(new RegExp(`${stop}:\\s*#[0-9a-f]{6}`, 'g')) ?? []
      expect(declarations, `${stop} needs a light and a dark half`).toHaveLength(2)
      expect(new Set(declarations).size, `${stop} declares the same hex twice`).toBe(2)
    }
  })
})
