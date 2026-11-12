/**
 * The Everymen bill's v3 ornament (#2034): the seal is the SHARED
 * {@link PointsRoundel}; the fist-and-bolt marks flank the CTA, are
 * `aria-hidden`, add no hit box, and leave with the CTA. The discharge motion
 * (#2071) lives in `motion.ornament.css`; the resting opacity in `index.css`.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import EverymenTaskCard from '../EverymenTaskCard'
import { aTask } from '../../../test/fixtures'
import { ruleBodies, stripComments } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const sheet = (name: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8'))

const CSS = stripComments(readIndexCss())
const MOTION = sheet('motion.ornament.css')

const GATE = '@media (prefers-reduced-motion: no-preference)'

/** Every rule for `selector` inside a no-preference gate in `css`. */
const gated = (selector: string, css: string): string[] =>
  ruleBodies(ruleBodies(css, GATE).join('\n'), selector)

const POINTS = 137
const TASK = aTask({ description: 'Fix the lamp on the corner nobody owns.' })

function render(withSignup = true): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EverymenTaskCard
        task={TASK}
        basePoints={POINTS}
        multiplier={1}
        inProgressCount={0}
        onSignup={withSignup ? () => {} : undefined}
      />
    </MemoryRouter>,
  )
}

describe('Everymen task card — the stamped points seal (#2034)', () => {
  it('mounts the shared roundel rather than drawing its own circle', () => {
    const html = render()
    // The roundel's double ring; a bordered <span> twin goes red.
    expect(html).toContain('<svg viewBox="0 0 100 100"')
    expect(html).toContain('r="46"')
    expect(html).toContain('r="40"')
  })

  it('announces the figure and the shared unit word as one mark', () => {
    const html = render()
    const unit = i18n.t('feed:taskCard.pointsUnit', { count: POINTS })
    expect(html).toContain(`aria-label="${POINTS} ${unit}"`)
    // The stamp uppercases the unit; do not undo it (#1911).
    expect(html.replace(/<[^>]*>/g, '')).toContain(unit)
  })

  it('carries no praxis legend — a task is not yet on the record', () => {
    // The arc legend ("VERIFIED ON THE RECORD") is a scored-praxis claim.
    expect(render()).not.toContain('textPath')
  })
})

describe('Everymen task card — fists-and-lightning at the CTA (#2034)', () => {
  it('flanks the sign-up with a mirrored pair', () => {
    const html = render()
    const marks = [...html.matchAll(/data-evm-bolt/g)]
    expect(marks).toHaveLength(2)
    expect(html).toContain('scaleX(-1)')
  })

  it('adds no second control to the CTA row', () => {
    const html = render()
    expect(html.match(/<button/g) ?? []).toHaveLength(1)
    const row = html.slice(html.lastIndexOf('data-evm-bolt'))
    expect(row).not.toContain('<a ')
    expect(html.match(/pointer-events:none/g) ?? []).not.toHaveLength(0)
  })

  it('leaves with the CTA when sign-up is not on offer', () => {
    const html = render(false)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('data-evm-bolt')
  })
})

describe('Everymen task card — the discharge fires (#2071)', () => {
  it('hangs the crackle on every arc and the flicker on the bolt, by class', () => {
    const html = render()
    const arcs = (html.match(/class="evm-arc"/g) ?? []).length
    // 24 arcs per mark, each on its own beat; shared delays would blink.
    expect(arcs, 'both marks crackle').toBe(48)
    expect(html.match(/class="evm-bolt"/g) ?? [], 'the bolt in each fist').toHaveLength(2)

    // Only the delay may be inline; inline `animation:` bypasses the gate.
    expect(html, 'an inline animation bypasses the media query').not.toContain('animation:')
    const delays = [...html.matchAll(/animation-delay:(\d+)ms/g)].map((m) => m[1])
    expect(delays, 'one delay per arc, both marks').toHaveLength(48)
    expect(new Set(delays).size, 'staggered, not struck together').toBe(24)
  })

  it('runs the two keyframes only inside the no-preference gate', () => {
    const arc = gated('.evm-arc', MOTION).join('')
    const bolt = gated('.evm-bolt', MOTION).join('')
    expect(arc).toContain('evm-crackle')
    expect(bolt).toContain('evm-flicker')

    // Stepped reads as electrical; eased reads as a fade. Do not smooth it.
    expect(arc, 'the crackle is stepped, not eased').toContain('steps(1, end)')

    for (const selector of ['.evm-arc', '.evm-bolt']) {
      expect(
        ruleBodies(`${CSS}\n${MOTION}`, selector).filter((body) => /\banimation\s*:/.test(body)),
        `${selector} declares its animation once, inside the gate`,
      ).toHaveLength(1)
    }
  })

  it('still draws a discharge stilled — the rest state is a frame of the crackle', () => {
    // `evm-crackle` opens at `opacity: 0`: without a base opacity a reduced-motion
    // reader gets no lightning at all.
    const resting = ruleBodies(CSS, '.evm-arc')
    expect(resting, 'the resting form is paint, so it lives in index.css').toHaveLength(1)
    expect(gated('.evm-arc', CSS), 'a rest state inside the gate is no rest state').toEqual([])

    const opacity = /opacity:\s*([\d.]+)/.exec(resting[0])?.[1]
    expect(Number(opacity), 'the arcs are drawn at rest').toBeGreaterThan(0)
    // The crackle's own peak frame.
    expect(ruleBodies(MOTION, '@keyframes evm-crackle').join('')).toContain(`opacity: ${opacity}`)
  })
})

describe('Everymen task card — the poster rays (#2034)', () => {
  it('converges the burst on the sheet centre, not its upper third', () => {
    // Drawn once as `.em-burst` (#2393); assert both the mount and the CSS.
    expect(render(), 'the card mounts the kit ornament').toContain('class="em-burst"')
    const burst = ruleBodies(CSS, '.em-burst').join('\n')
    expect(burst).toContain('repeating-conic-gradient(from 0deg at 50% 50%')
    expect(burst).toContain('radial-gradient(130% 100% at 50% 16%, #000 40%, transparent 96%)')
  })
})
