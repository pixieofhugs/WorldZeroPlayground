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
