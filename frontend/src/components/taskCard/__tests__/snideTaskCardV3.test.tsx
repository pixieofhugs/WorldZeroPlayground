/**
 * S.N.I.D.E. v3 ornament (#2035). Only what #2035 adds; the 44px floor and the
 * header mark are guarded in `taskCardsV3.test.tsx`.
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

function ctaButton(): string {
  const markup = html()
  const from = markup.indexOf('<button')
  expect(from, 'a control to look at').toBeGreaterThan(-1)
  return markup.slice(from, markup.indexOf('</button>', from))
}

/** The `<article>`'s own opening tag. */
function cardStyle(): string {
  const markup = html()
  const from = markup.indexOf('<article')
  expect(from, 'a card to look at').toBeGreaterThan(-1)
  return markup.slice(from, markup.indexOf('>', from))
}

/** One declaration, so a token in a NEIGHBOUR cannot answer for it. */
function decl(style: string, property: string): string {
  const from = style.indexOf(`${property}:`)
  expect(from, `a ${property} to look at`).toBeGreaterThan(-1)
  const end = style.indexOf(';', from)
  return style.slice(from, end === -1 ? undefined : end)
}

describe('S.N.I.D.E. — the pen circle, grown (#2035)', () => {
  it('scales the DRAWN LOOP, not the numeral it circles', () => {
    // Scale the <svg> alone so the loop opens away from the type.
    const stamp = html()
    const svg = stamp.slice(stamp.indexOf('viewBox="0 0 100 78"'))
    expect(svg.slice(0, svg.indexOf('</svg>'))).toContain('scale(1.18)')
    expect(stamp).not.toContain('transform:scale(1.18) rotate')
  })
})

describe('S.N.I.D.E. — the flyposted wall ground (#2065)', () => {
  it('pastes the clipping onto the WALL, not onto a second sheet of its own stock', () => {
    const ground = decl(cardStyle(), 'background')
    expect(ground, 'the stock is not the ground any more').not.toContain(
      '--faction-snide-note-paper',
    )
    expect(ground).toContain('var(--faction-snide-wall)')
    expect(ground).toContain('var(--faction-snide-wall-deep)')
    expect(ground).toContain('var(--faction-snide-note-grain)')
    expect(ground).toContain('var(--faction-snide-note-scan)')
    expect(ground).toContain('var(--faction-snide-note-wash-acid)')
    expect(ground).toContain('var(--faction-snide-note-wash-pink)')
  })

  it('keeps the edge and the printed shadow, which are the only thing making it an OBJECT', () => {
    // On the S.N.I.D.E. page the backdrop is this same wall; these separate them.
    const style = cardStyle()
    expect(style).toContain('border:1px solid var(--faction-snide-note-wall-edge)')
    expect(decl(style, 'box-shadow')).toContain('var(--faction-snide-note-wall-shadow)')
    // Not the detail pages' token (#2066).
    expect(decl(style, 'box-shadow')).not.toContain('var(--faction-snide-note-shadow)')
  })
})

describe('S.N.I.D.E. — the sprayed CTA (#2035)', () => {
  it('sprays acid ON the black, rather than inking black ON the acid', () => {
    const button = ctaButton()
    expect(button).toContain('background:var(--faction-snide-note-bar)')
    expect(button).toContain('color:var(--faction-snide-acid)')
  })

  it('keeps a visible edge that does not depend on the theme', () => {
    // At night the button and card are both near-black; the ring must be OPAQUE
    // (a translucent acid composites to nothing).
    expect(ctaButton()).toContain('0 0 0 2px var(--faction-snide-acid-deep)')
  })

  it('grades the halo in ACID, instead of collapsing it onto a fixed tint', () => {
    // A fixed `--faction-snide-light` tint capped every pass at 16% and dimmed
    // at night (#2065). Looks at `text-shadow` only: the tint stays on the inset.
    const halo = decl(ctaButton(), 'text-shadow')
    expect(halo, 'no pass may cap itself at the wash').not.toContain('--faction-snide-light')
    expect(halo).toContain('var(--faction-snide-acid) 95%')
    expect(halo).toContain('var(--faction-snide-acid) 70%')
    expect(halo).toContain('var(--faction-snide-acid) 45%')
    // Offset passes read as sprayed; a symmetric halo is a lamp.
    expect(halo).toContain('1px 2px 0 ')
    expect(halo).toContain('-2px 1px 5px ')
  })

  it('sprays in the marker hand, and still says the i18n word', () => {
    const button = ctaButton()
    expect(button).toContain('var(--faction-snide-font-marker)')
    expect(html().slice(html().indexOf('<button')).replace(/<[^>]*>/g, '')).toMatch(/\S/)
  })
})
