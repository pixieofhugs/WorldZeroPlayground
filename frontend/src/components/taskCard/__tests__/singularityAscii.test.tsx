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
 * TWO SHEETS, ONE QUESTION (#2073/#2071). The drift now lives in
 * `src/motion.ornament.css`, delivered past first paint; the face's RESTING
 * opacity stayed in `index.css`, because it is paint. "Is the drift gated, with
 * no unguarded twin, and does the still frame exist" is a question about the
 * pair, so both files are read.
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
import { readIndexCss } from '../../../test/indexCss'

const sheet = (name: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8'))

const CSS = stripComments(readIndexCss())
const MOTION = sheet('motion.ornament.css')

const GATE = '@media (prefers-reduced-motion: no-preference)'

/** One `@keyframes` body, by name. Names are document-global across the pair. */
const keyframe = (name: string, css: string): string =>
  ruleBodies(css, `@keyframes ${name}`).join('')

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
    const gated = [...ruleBodies(MOTION, GATE), ...ruleBodies(CSS, GATE)].join('\n')
    expect(animates(gated), 'the drift is inside the gate').toBe(1)
    // Same count across BOTH sheets, so there is no ungated twin anywhere. A
    // reader who asks for less motion gets the face STILLED, not removed.
    expect(animates(`${CSS}\n${MOTION}`), 'and nowhere else').toBe(1)
  })

  it('runs its own keyframe, so the vote readout does not fade (#2071)', () => {
    // The drift used to borrow `spec-rise`, which is transform-only — so the
    // design's fade was silently dropped, and adding opacity there would have
    // made every reached spectrum dot fade too. `sg-float` carries both.
    const drift = ruleBodies(MOTION, GATE)
      .flatMap((body) => [...body.matchAll(/\.sg-ascii\s*\{([^}]*)\}/g)])
      .map((rule) => rule[1])
      .join('')
    expect(drift).toContain('sg-float')
    expect(drift, 'the readout keyframe is not the ornament keyframe').not.toContain('spec-rise')

    const float = keyframe('sg-float', MOTION)
    expect(float, 'the robot rises').toContain('transform')
    expect(float, 'and dims — the half the reuse dropped').toContain('opacity')

    // The vote readout is untouched: `spec-rise` still transform-only, still
    // driving the reached dot. It bobs; it must not fade.
    const rise = keyframe('spec-rise', CSS)
    expect(rise, 'a fading vote dot reads as a value going out').not.toContain('opacity')
    expect(
      ruleBodies(CSS, GATE).join('\n'),
      'the reached dot still bobs',
    ).toMatch(/\.spectrum-dot--reached\s*\{[^}]*spec-rise/)
  })

  it('rests at the frame the drift returns to, in index.css (#2071)', () => {
    // THE BUG THIS EXISTS FOR: `sg-float` fades, so with no base opacity a
    // stilled robot renders at full strength — brighter than it ever appears in
    // motion, a fourth appearance nobody drew. And since the animation now
    // arrives on a deferred sheet, anyone who never receives that sheet lands in
    // the same state, so this is no longer only a reduced-motion concern.
    const resting = ruleBodies(CSS, '.sg-ascii')
    expect(resting, 'the resting form is paint, so it stays in index.css').toHaveLength(1)
    expect(
      ruleBodies(ruleBodies(CSS, GATE).join('\n'), '.sg-ascii'),
      'a resting opacity inside the gate is no resting state at all',
    ).toEqual([])

    const stop = /0%,\s*100%\s*\{([^}]*)\}/.exec(keyframe('sg-float', MOTION))?.[1] ?? ''
    const at0 = /opacity:\s*([\d.]+)/.exec(stop)?.[1]
    expect(at0, 'the drift opens and closes on an opacity').toBeDefined()
    expect(resting[0], "and the rest is that frame, not a brightness nobody drew").toContain(
      `opacity: ${at0}`,
    )
  })
})
