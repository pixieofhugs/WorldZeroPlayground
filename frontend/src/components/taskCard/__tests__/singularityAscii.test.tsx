/**
 * Singularity task card, v3 ornament (#2036) — an ASCII face drifts beside the
 * sign-up key.
 *
 * ## The seam
 *
 * The card's RENDERED MARKUP (`renderToStaticMarkup`, the same SSR-only harness
 * `taskCardsV3.test.tsx` works at — no DOM, no layout, no computed styles),
 * plus `index.css` read as source text for the motion gate. Both halves are
 * needed and neither is sufficient:
 *
 *  1. the markup has to put the face OUTSIDE the button and hide it from
 *     assistive tech, or a screen reader reads punctuation soup as the control's
 *     name (epic #2027, ruling 4);
 *  2. the markup has to place it in its own grid column rather than positioning
 *     it over the row, which is the only way an SSR harness can prove "no two
 *     hit boxes overlap at any card width" — geometry is out of reach here, so
 *     the proof is structural: two siblings in two different columns of one
 *     grid cannot overlap, at any width, without anyone measuring;
 *  3. the sheet has to gate the drift on `prefers-reduced-motion`, and the
 *     component must not write `animation:` inline, which would bypass the gate
 *     while every render test stayed green.
 *
 * What is NOT checkable here is whether it looks right. That is visual QA and
 * is stated as outstanding on the PR.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import SingularityTaskCard from '../SingularityTaskCard'
import { aTask } from '../../../test/fixtures'
import { ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'

const CSS = stripComments(
  readFileSync(fileURLToPath(new URL('../../../index.css', import.meta.url)), 'utf8'),
)

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  in_progress_count: 4,
})

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SingularityTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

/** The button element's own markup, opening tag included. */
function button(html: string): string {
  const open = html.indexOf('<button')
  expect(open, 'a control to stand beside').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('</button>', open))
}

/** The ornament's element, opening tag included. */
function face(html: string): string {
  const open = html.indexOf('<pre')
  expect(open, 'the ASCII face is drawn').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('</pre>', open))
}

/** The three lines of the little robot, as the design draws it. */
const BOT = ['[^-^]', '/|_|\\', 'd b']

describe('the ASCII face is ornament, not the button\'s name (#2036)', () => {
  it('draws the robot', () => {
    const html = render()
    for (const line of BOT) expect(html, line).toContain(line)
  })

  it('hides it from assistive tech and keeps it out of the control', () => {
    const html = render()
    expect(face(html)).toContain('aria-hidden="true"')
    // The accessible name of the CTA is the i18n string and nothing else — a
    // face rendered INSIDE the button would be read as part of it.
    for (const line of BOT) expect(button(html), line).not.toContain(line)
    expect(button(html)).toContain(i18n.t('feed:taskCard.signup'))
  })

  it('stands in its own grid column, never over the button', () => {
    // Both form factors: the card is one responsive component (ADR-0056) and
    // the narrow set is where an absolutely positioned ornament would land on
    // the tap target.
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const html = render()
      const row = html.slice(0, html.indexOf('<button')).lastIndexOf('<div')
      const markup = html.slice(row, html.indexOf('</pre>'))
      expect(markup, formFactor).toContain('grid-template-columns:1fr auto 1fr')
      expect(button(html), formFactor).toContain('grid-column:2')
      expect(face(html), formFactor).toContain('grid-column:3')
      // Nothing in the CTA row is taken out of flow, so no hit box can be
      // covered by ornament at any card width.
      expect(face(html), formFactor).not.toContain('position:absolute')
    }
    mocks.formFactor = 'desktop'
  })
})

describe('the drift is gated on reduced motion (#2036)', () => {
  /** How many `.sg-ascii` rules in `source` set an `animation`. */
  const animates = (source: string): number =>
    [...source.matchAll(/\.sg-ascii\s*\{([^}]*)\}/g)].filter((rule) =>
      /animation/.test(rule[1]),
    ).length

  it('carries the class and writes no inline animation', () => {
    const html = render()
    expect(face(html)).toContain('class="sg-ascii"')
    expect(html, 'an inline animation bypasses the media query').not.toContain('animation:')
  })

  it('declares the motion only inside the no-preference gate', () => {
    const gated = ruleBodies(CSS, '@media (prefers-reduced-motion: no-preference)').join('\n')
    expect(animates(gated), 'the drift is inside the gate').toBe(1)
    // Same count sheet-wide, so there is no ungated twin outside it. A reader
    // who asks for less motion gets the face STILLED, not removed.
    expect(animates(CSS), 'and nowhere else').toBe(1)
  })
})
