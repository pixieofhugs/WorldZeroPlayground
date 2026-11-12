/**
 * Singularity v3 ornament (#2036): an ASCII face beside the sign-up. It must sit
 * OUTSIDE the button and be aria-hidden (#2027); occupy its own grid column (two
 * siblings in different columns can't overlap — the SSR proof of no hit-box
 * overlap); and drift only under the reduced-motion gate, never inline. Drift is
 * in `motion.ornament.css`, the resting opacity in `index.css` (#2071).
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

/** Keyframe names are document-global across the two sheets. */
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

function button(html: string): string {
  const open = html.indexOf('<button')
  expect(open, 'a control to stand beside').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('</button>', open))
}

function face(html: string): string {
  const open = html.indexOf('<pre')
  expect(open, 'the ASCII face is drawn').toBeGreaterThan(-1)
  return html.slice(open, html.indexOf('</pre>', open))
}

const BOT = ['[^-^]', '/|_|\\', 'd b']

describe('the ASCII face is ornament, not the button\'s name (#2036)', () => {
  it('draws the robot', () => {
    const html = render()
    for (const line of BOT) expect(html, line).toContain(line)
  })

  it('hides it from assistive tech and keeps it out of the control', () => {
    const html = render()
    expect(face(html)).toContain('aria-hidden="true"')
    for (const line of BOT) expect(button(html), line).not.toContain(line)
    expect(button(html)).toContain(i18n.t('feed:taskCard.signup'))
  })

  it('stands in its own grid column, never over the button', () => {
    // The narrow set is where an absolute ornament would land on the target.
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const html = render()
      const row = html.slice(0, html.indexOf('<button')).lastIndexOf('<div')
      const markup = html.slice(row, html.indexOf('</pre>'))
      expect(markup, formFactor).toContain('grid-template-columns:1fr auto 1fr')
      expect(button(html), formFactor).toContain('grid-column:2')
      expect(face(html), formFactor).toContain('grid-column:3')
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
    // No ungated twin in either sheet.
    expect(animates(`${CSS}\n${MOTION}`), 'and nowhere else').toBe(1)
  })

  it('runs its own keyframe, so the vote readout does not fade (#2071)', () => {
    // Borrowing `spec-rise` would drop the fade, or make vote dots fade too.
    const drift = ruleBodies(MOTION, GATE)
      .flatMap((body) => [...body.matchAll(/\.sg-ascii\s*\{([^}]*)\}/g)])
      .map((rule) => rule[1])
      .join('')
    expect(drift).toContain('sg-float')
    expect(drift, 'the readout keyframe is not the ornament keyframe').not.toContain('spec-rise')

    const float = keyframe('sg-float', MOTION)
    expect(float, 'the robot rises').toContain('transform')
    expect(float, 'and dims — the half the reuse dropped').toContain('opacity')

    const rise = keyframe('spec-rise', CSS)
    expect(rise, 'a fading vote dot reads as a value going out').not.toContain('opacity')
    expect(
      ruleBodies(CSS, GATE).join('\n'),
      'the reached dot still bobs',
    ).toMatch(/\.spectrum-dot--reached\s*\{[^}]*spec-rise/)
  })

  it('rests at the frame the drift returns to, in index.css (#2071)', () => {
    // `sg-float` fades: with no base opacity a stilled robot (or one without the
    // deferred sheet) renders brighter than it ever appears in motion.
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
