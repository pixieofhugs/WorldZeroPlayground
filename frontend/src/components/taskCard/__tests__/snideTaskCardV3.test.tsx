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

/** The `<article>`'s own style attribute — the card's ground and nothing inside it. */
function cardStyle(): string {
  const markup = html()
  const from = markup.indexOf('<article')
  expect(from, 'a card to look at').toBeGreaterThan(-1)
  return markup.slice(from, markup.indexOf('>', from))
}

/** One declaration out of a style attribute, so a token in a NEIGHBOUR cannot answer for it. */
function decl(style: string, property: string): string {
  const from = style.indexOf(`${property}:`)
  expect(from, `a ${property} to look at`).toBeGreaterThan(-1)
  const end = style.indexOf(';', from)
  return style.slice(from, end === -1 ? undefined : end)
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

describe('S.N.I.D.E. — the flyposted wall ground (#2065)', () => {
  it('pastes the clipping onto the WALL, not onto a second sheet of its own stock', () => {
    // The card was `--faction-snide-note-paper` — the same xerox stock the
    // clipping itself is cut from, and (in dark) a near-twin of the wall behind
    // it. It is the wall now: two rasters and two washes over the
    // `-wall`/`-wall-deep` ramp, one recipe that FLIPS to pitch black at night.
    const ground = decl(cardStyle(), 'background')
    expect(ground, 'the stock is not the ground any more').not.toContain(
      '--faction-snide-note-paper',
    )
    expect(ground).toContain('var(--faction-snide-wall)')
    expect(ground).toContain('var(--faction-snide-wall-deep)')
    // The raster that flips polarity and the scanline that never does.
    expect(ground).toContain('var(--faction-snide-note-grain)')
    expect(ground).toContain('var(--faction-snide-note-scan)')
    expect(ground).toContain('var(--faction-snide-note-wash-acid)')
    expect(ground).toContain('var(--faction-snide-note-wash-pink)')
  })

  it('keeps the edge and the printed shadow, which are the only thing making it an OBJECT', () => {
    // Load-bearing, not ornament. On the S.N.I.D.E. faction page
    // `useFactionBackdrop` paints the page with this same wall, so once the card
    // shares that recipe these two are all that separates card from ground.
    // Drop either and the clipping dissolves into the wall it is pasted to.
    const style = cardStyle()
    expect(style).toContain('border:1px solid var(--faction-snide-note-wall-edge)')
    expect(decl(style, 'box-shadow')).toContain('var(--faction-snide-note-wall-shadow)')
    // Its own token, not the one the two detail pages share (#2066).
    expect(decl(style, 'box-shadow')).not.toContain('var(--faction-snide-note-shadow)')
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

  it('grades the halo in ACID, instead of collapsing it onto a fixed tint', () => {
    // THE DEFECT THIS GUARDS (#2065). The v2 halo put two of its three passes on
    // `--faction-snide-light`, a fixed 16% tint (12% in DARK) — so every pass
    // was capped at 16% however wide the radius, which is why it read muted, and
    // it was DIMMER at night, when a sprayed stencil should be loudest. The
    // graded version mixes the acid itself down per layer, so the alphas rise as
    // the radii tighten. The tint survives on `box-shadow`'s inset, which is why
    // this looks at the `text-shadow` declaration alone.
    const halo = decl(ctaButton(), 'text-shadow')
    expect(halo, 'no pass may cap itself at the wash').not.toContain('--faction-snide-light')
    expect(halo).toContain('var(--faction-snide-acid) 95%')
    expect(halo).toContain('var(--faction-snide-acid) 70%')
    expect(halo).toContain('var(--faction-snide-acid) 45%')
    // The last two passes are OFFSET, and that asymmetry is what makes it read
    // as sprayed rather than lit. A symmetric halo is a lamp.
    expect(halo).toContain('1px 2px 0 ')
    expect(halo).toContain('-2px 1px 5px ')
  })

  it('sprays in the marker hand, and still says the i18n word', () => {
    const button = ctaButton()
    expect(button).toContain('var(--faction-snide-font-marker)')
    // The stencil is paint on a label, never instead of one.
    expect(html().slice(html().indexOf('<button')).replace(/<[^>]*>/g, '')).toMatch(/\S/)
  })
})
