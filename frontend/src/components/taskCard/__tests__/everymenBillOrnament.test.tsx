/**
 * The Everymen bill's v3 ornament (#2034, epic #2027).
 *
 * THE SEAM IS THE CARD'S RENDERED OUTPUT — this repo has no jsdom, so nothing
 * here can measure a box. What it can pin is the shape the design asks for and
 * the two things a later edit is most likely to undo by accident:
 *
 * 1. The points seal is the SHARED {@link PointsRoundel}, not a second circle
 *    drawn in the card. Everymen was the one faction where the shared total mark
 *    existed and only one of its two surfaces used it (#2042's survey).
 * 2. The fists-and-lightning flank the CTA and NOTHING ELSE — they are
 *    `aria-hidden`, they carry no hit box, and they live inside the `cta &&`
 *    block, so a card with no sign-up on offer draws no sparks either.
 *
 * The 44px tap floor and the "no two hit boxes overlap" rule are asserted in
 * `taskCardsV3.test.tsx`; what is provable HERE is that the ornament adds no
 * second interactive thing to the row, which is the way this card could break
 * that rule.
 *
 * THE DISCHARGE MOVES SINCE #2071, and that adds a second seam: the two
 * stylesheets read as source. The arcs' crackle and the bolt's flicker live in
 * `src/motion.ornament.css`, delivered past first paint; the arcs' RESTING
 * opacity stayed in `index.css`, because it is paint. Neither half is checkable
 * from the markup, and both are invisible in a green build.
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

const sheet = (name: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8'))

const CSS = sheet('index.css')
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
    // The roundel's own geometry: the double ring on a 0..100 viewBox. A card
    // that went back to a bordered <span> loses this and goes red.
    expect(html).toContain('<svg viewBox="0 0 100 100"')
    expect(html).toContain('r="46"')
    expect(html).toContain('r="40"')
  })

  it('announces the figure and the shared unit word as one mark', () => {
    const html = render()
    const unit = i18n.t('feed:taskCard.pointsUnit', { count: POINTS })
    expect(html).toContain(`aria-label="${POINTS} ${unit}"`)
    // #1911 restored the unit word on the struck seal; the stamp uppercases it,
    // so the catalog's "Points" still strikes as POINTS. Do not undo it.
    expect(html.replace(/<[^>]*>/g, '')).toContain(unit)
  })

  it('carries no praxis legend — a task is not yet on the record', () => {
    // `PointsRoundel`'s arc reads "★ VERIFIED ★ ON THE RECORD", which is a claim
    // only a scored praxis can make. The task card omits it, which is why
    // `arcLabel` is optional.
    expect(render()).not.toContain('textPath')
  })
})

describe('Everymen task card — fists-and-lightning at the CTA (#2034)', () => {
  it('flanks the sign-up with a mirrored pair', () => {
    const html = render()
    const marks = [...html.matchAll(/data-evm-bolt/g)]
    expect(marks).toHaveLength(2)
    // One drawing, struck twice: the leading mark is the mirror.
    expect(html).toContain('scaleX(-1)')
  })

  it('adds no second control to the CTA row', () => {
    const html = render()
    // The row's only hit box is the button. The marks are decorative spans with
    // pointer events off, so no 44px box can overlap another at any card width.
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
    // Two marks, one drawing: 24 generated arcs each, and every one of them
    // strikes on its own beat. A mark whose arcs shared a delay would blink.
    expect(arcs, 'both marks crackle').toBe(48)
    expect(html.match(/class="evm-bolt"/g) ?? [], 'the bolt in each fist').toHaveLength(2)

    // The class carries the animation; the DELAY is the only per-instance
    // number, and it is a number, not a colour, so it may be inline. An inline
    // `animation:` would bypass the reduced-motion gate entirely, which is the
    // recorded reason this was deferred rather than bodged.
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

    // `steps(1, end)` is load-bearing: eased, the crackle reads as a fade;
    // stepped, it reads as electrical. Do not smooth it.
    expect(arc, 'the crackle is stepped, not eased').toContain('steps(1, end)')

    // Nowhere else — an ungated twin in either sheet is motion for a reader who
    // asked for none, decided by file order rather than by preference.
    for (const selector of ['.evm-arc', '.evm-bolt']) {
      expect(
        ruleBodies(`${CSS}\n${MOTION}`, selector).filter((body) => /\banimation\s*:/.test(body)),
        `${selector} declares its animation once, inside the gate`,
      ).toHaveLength(1)
    }
  })

  it('still draws a discharge stilled — the rest state is a frame of the crackle', () => {
    // THE BUG THIS EXISTS FOR: `evm-crackle` opens at `opacity: 0`, so with no
    // base opacity a reduced-motion reader — or anyone who never receives the
    // deferred motion sheet — gets a fist and a bolt with NO lightning, and the
    // mark loses the thing it is a picture of.
    const resting = ruleBodies(CSS, '.evm-arc')
    expect(resting, 'the resting form is paint, so it lives in index.css').toHaveLength(1)
    expect(gated('.evm-arc', CSS), 'a rest state inside the gate is no rest state').toEqual([])

    const opacity = /opacity:\s*([\d.]+)/.exec(resting[0])?.[1]
    expect(Number(opacity), 'the arcs are drawn at rest').toBeGreaterThan(0)
    // And it is a frame somebody drew, not a fourth appearance: the crackle's
    // own peak.
    expect(ruleBodies(MOTION, '@keyframes evm-crackle').join('')).toContain(`opacity: ${opacity}`)
  })
})

describe('Everymen task card — the poster rays (#2034)', () => {
  it('converges the burst on the sheet centre, not its upper third', () => {
    // The design's one portable line in the Everymen flourish block. Only the
    // conic gradient moves; the two corner glows and the mask keep their own
    // anchors, so the copy stays legible under the rays.
    //
    // THE DRAWING LEFT THIS FILE in #2393: the card wrote the geometry out
    // inline, and so did eight other Everymen surfaces, each at its own pitch.
    // The owner ruled one drawing per faction, so the geometry is `.em-burst`
    // in index.css and the card mounts it. Both halves are asserted — a card
    // that stopped mounting the class would still pass a stylesheet-only check.
    expect(render(), 'the card mounts the kit ornament').toContain('class="em-burst"')
    const burst = ruleBodies(CSS, '.em-burst').join('\n')
    expect(burst).toContain('repeating-conic-gradient(from 0deg at 50% 50%')
    expect(burst).toContain('radial-gradient(130% 100% at 50% 16%, #000 40%, transparent 96%)')
  })
})
