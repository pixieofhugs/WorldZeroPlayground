/**
 * Task cards v3, Phase 2 — S.N.I.D.E.'s ornament (#2035, epic #2027).
 *
 * The seam is the one every card test in this folder works at: the rendered
 * markup of the skin, via `renderToStaticMarkup`. No jsdom, so no geometry and
 * no cascade — what is checkable is which declarations the elements carry.
 *
 * Phase 1's shared table (`taskCardsV3.test.tsx`) already guards the things
 * this pass could break by accident: the 44px tap floor on both form factors,
 * the ONE header mark, and that snide draws no rule above its CTA. Nothing
 * here repeats them. What is asserted below is only what #2035 adds, and each
 * case is a defect somebody could plausibly reintroduce.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

// Imported after the mock is registered.
import SnideTaskCard from '../SnideTaskCard'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  in_progress_count: 4,
})

function html(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SnideTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

/** Everything from `<button` to its close — the sign-up and nothing else. */
function ctaButton(): string {
  const markup = html()
  const from = markup.indexOf('<button')
  expect(from, 'a control to look at').toBeGreaterThan(-1)
  return markup.slice(from, markup.indexOf('</button>', from))
}

describe('S.N.I.D.E. — the pen circle, grown (#2035)', () => {
  it('scales the DRAWN LOOP, not the numeral it circles', () => {
    // The design grows the pen circle 1.18x by scaling the <svg> alone, so the
    // points numeral and its caption stay put and the loop opens away from
    // them — the same move UA's ensō makes. Scaling the whole stamp instead
    // would grow the type with it and clear nothing.
    const stamp = html()
    const svg = stamp.slice(stamp.indexOf('viewBox="0 0 100 78"'))
    expect(svg.slice(0, svg.indexOf('</svg>'))).toContain('scale(1.18)')
    // The numeral is a sibling of that svg and carries no scale of its own.
    expect(stamp).not.toContain('transform:scale(1.18) rotate')
  })
})

describe('S.N.I.D.E. — the sprayed CTA (#2035)', () => {
  it('sprays acid ON the black, rather than inking black ON the acid', () => {
    // v2 shipped the inverse: an acid ground with near-black type. The spray
    // treatment is the flip — the letters are the paint.
    const button = ctaButton()
    expect(button).toContain('background:var(--faction-snide-note-bar)')
    expect(button).toContain('color:var(--faction-snide-acid)')
  })

  it('keeps a visible edge that does not depend on the theme', () => {
    // THE DEFECT THIS GUARDS. `--faction-snide-note-*` FLIPS: at night the
    // clipping's stock is #14110b and the CTA's new ground is #080706, so a
    // black button sits on a black card and the only thing separating them is
    // this ring. It has to be an OPAQUE token — an acid at 16% over near-black
    // composites to almost nothing.
    expect(ctaButton()).toContain('0 0 0 2px var(--faction-snide-acid-deep)')
  })

  it('sprays in the marker hand, and still says the i18n word', () => {
    const button = ctaButton()
    expect(button).toContain('var(--faction-snide-font-marker)')
    // The stencil is paint on a label, never instead of one.
    expect(html().slice(html().indexOf('<button')).replace(/<[^>]*>/g, '')).toMatch(/\S/)
  })
})
