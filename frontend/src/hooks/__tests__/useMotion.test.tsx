/**
 * #2154 — the animations off-switch, tested where its decisions actually live.
 *
 * Same posture as `useTheme.test.tsx`: vitest runs in `node` with no jsdom, so
 * the switch's decisions are extracted into pure seams and those seams are what
 * get asserted. The one thing that is NOT a pure function — the OS override —
 * gets a `window.matchMedia` shim, because "the OS always wins" is the whole
 * ruling and a subtract-only claim that is never exercised is not a claim.
 *
 * The CSS half is asserted here too. The attribute is inert without the rule in
 * `index.css`, and the failure mode is silent: the switch flips, the DOM
 * changes, and the page keeps moving. Nothing in a render test can see that.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import {
  DEFAULT_MOTION,
  MOTION_ATTRIBUTE,
  MotionProvider,
  applyMotion,
  effectiveMotion,
  nextMotion,
  readReducedMotion,
  resolveInitialMotion,
  scheduleMotionTick,
  useMotion,
  useMotionStilled,
} from '../useMotion'
import { readIndexCss } from '../../test/indexCss'

const INDEX_CSS = readIndexCss()

/** Pretend the OS has (or has not) asked for reduced motion. */
function withSystemReduced<T>(matches: boolean, body: () => T): T {
  const holder = globalThis as { window?: unknown }
  const previous = holder.window
  holder.window = {
    matchMedia: () => ({
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  }
  try {
    return body()
  } finally {
    if (previous === undefined) delete holder.window
    else holder.window = previous
  }
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('nextMotion — the switch flip', () => {
  it('returns the opposite setting', () => {
    expect(nextMotion('on')).toBe('off')
    expect(nextMotion('off')).toBe('on')
  })
})

describe('resolveInitialMotion — motion unless the reader turned it off', () => {
  it('honours a stored choice', () => {
    expect(resolveInitialMotion('on')).toBe('on')
    expect(resolveInitialMotion('off')).toBe('off')
  })

  it('defaults to on when nothing is stored', () => {
    expect(resolveInitialMotion(null)).toBe(DEFAULT_MOTION)
    expect(DEFAULT_MOTION).toBe('on')
  })

  it('ignores a junk stored value', () => {
    expect(resolveInitialMotion('shimmer')).toBe('on')
  })
})

/**
 * The ruling: motion lives inside `@media (prefers-reduced-motion: no-preference)`,
 * so this preference can only ever SUBTRACT. There must be no pair of inputs
 * that yields 'on' while the OS is asking for reduce.
 */
describe('effectiveMotion — subtract-only, the OS always wins', () => {
  it('leaves the choice alone when the OS has no preference', () => {
    expect(effectiveMotion('on', false)).toBe('on')
    expect(effectiveMotion('off', false)).toBe('off')
  })

  it('forces off when the OS asks for reduced motion, whatever was chosen', () => {
    expect(effectiveMotion('on', true)).toBe('off')
    expect(effectiveMotion('off', true)).toBe('off')
  })

  it('has no input at all that turns motion back on against the OS', () => {
    const everyInput: ['on' | 'off', boolean][] = [
      ['on', true],
      ['off', true],
    ]
    for (const [chosen, reduced] of everyInput) {
      expect(effectiveMotion(chosen, reduced), `${chosen}/${reduced}`).toBe('off')
    }
  })
})

describe('readReducedMotion — the OS probe', () => {
  it('reports the query result when matchMedia exists', () => {
    expect(withSystemReduced(true, readReducedMotion)).toBe(true)
    expect(withSystemReduced(false, readReducedMotion)).toBe(false)
  })

  it('answers false with no matchMedia to ask, so the switch stays usable', () => {
    expect(readReducedMotion()).toBe(false)
  })
})

describe('applyMotion — paints the cascade attribute', () => {
  it('writes data-motion on the document element', () => {
    const attrs: Record<string, string> = {}
    const holder = globalThis as { document?: unknown }
    const previous = holder.document
    holder.document = {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attrs[name] = value
        },
      },
    }
    try {
      applyMotion('off')
      expect(attrs[MOTION_ATTRIBUTE]).toBe('off')
      applyMotion('on')
      expect(attrs[MOTION_ATTRIBUTE]).toBe('on')
    } finally {
      holder.document = previous
    }
  })
})

function Probe() {
  const { chosen, motion, systemReduced } = useMotion()
  return <span data-testid="motion">{`${chosen}/${motion}/${systemReduced}`}</span>
}

const readProbe = (html: string) =>
  /<span data-testid="motion">([^<]+)<\/span>/.exec(html)?.[1]

describe('MotionProvider — what the tree reads', () => {
  it('serves the default, in effect, when the OS has no preference', () => {
    const html = withSystemReduced(false, () =>
      renderToStaticMarkup(
        <MotionProvider>
          <Probe />
        </MotionProvider>,
      ),
    )
    expect(readProbe(html)).toBe('on/on/false')
  })

  it('overrides the stored choice when the OS asks for reduced motion', () => {
    const html = withSystemReduced(true, () =>
      renderToStaticMarkup(
        <MotionProvider>
          <Probe />
        </MotionProvider>,
      ),
    )
    expect(readProbe(html), 'chosen is untouched; what is IN EFFECT is off').toBe(
      'on/off/true',
    )
  })

  it('refuses to hand out a setting outside the provider (no private copies)', () => {
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(/MotionProvider/)
  })
})

/**
 * The attribute is inert without this rule, and a missing rule is invisible:
 * the switch still flips and the DOM still changes. The `!important` half is
 * asserted separately because this tree writes many `transition:` declarations
 * inline in JSX, and a style attribute outranks every selector without it.
 */
describe('index.css carries the kill switch the attribute drives', () => {
  const rule = /\[data-motion="off"\][^{]*\{([^}]*)\}/.exec(INDEX_CSS)

  it('declares a rule selecting the off state', () => {
    expect(rule, 'no [data-motion="off"] rule in index.css').toBeTruthy()
  })

  it('reaches pseudo-elements as well as elements', () => {
    const selector = /(\[data-motion="off"\][^{]*)\{/.exec(INDEX_CSS)?.[1] ?? ''
    expect(selector).toContain('*::before')
    expect(selector).toContain('*::after')
  })

  it('stills both animation and transition, and does it with !important', () => {
    const body = rule?.[1] ?? ''
    expect(body).toMatch(/animation:\s*none\s*!important/)
    expect(body).toMatch(/transition:\s*none\s*!important/)
  })
})

/**
 * #2622 — the half of the switch a stylesheet cannot reach.
 *
 * Two faction vote skins animate from a `setInterval` re-render rather than a
 * CSS animation, so `[data-motion="off"]` had no property to null and they kept
 * ticking with the switch off. NOT an accessibility defect: both honoured the
 * OS query before this change and still do (the `systemReduced` cases below).
 * What was broken is only the device-local switch reaching them.
 *
 * The seam is this hook, and the harness has no DOM, so the scheduling decision
 * is asserted where it is made rather than by counting repaints.
 */

/** Pretend the reader has (or has not) stored a choice. */
function withStoredMotion<T>(stored: string | null, body: () => T): T {
  const holder = globalThis as { localStorage?: unknown }
  const previous = holder.localStorage
  holder.localStorage = { getItem: () => stored, setItem: () => {} }
  try {
    return body()
  } finally {
    if (previous === undefined) delete holder.localStorage
    else holder.localStorage = previous
  }
}

function StilledProbe() {
  return <span data-testid="stilled">{String(useMotionStilled())}</span>
}

const readStilled = (html: string) =>
  /<span data-testid="stilled">([^<]+)<\/span>/.exec(html)?.[1]

const renderStilled = (stored: string | null, systemReduced: boolean) =>
  readStilled(
    withStoredMotion(stored, () =>
      withSystemReduced(systemReduced, () =>
        renderToStaticMarkup(
          <MotionProvider>
            <StilledProbe />
          </MotionProvider>,
        ),
      ),
    ),
  )

describe('useMotionStilled — the answer a JS clock asks for', () => {
  it('is not stilled by default, so the skins animate as designed', () => {
    expect(renderStilled(null, false)).toBe('false')
  })

  it('is stilled when the reader turned the Settings switch off (#2622)', () => {
    expect(renderStilled('off', false)).toBe('true')
  })

  it('is stilled when the OS asks for reduced motion, switch untouched', () => {
    expect(renderStilled(null, true)).toBe('true')
  })

  it('takes the composed answer, never the raw stored choice', () => {
    // 'on' stored + OS asking = off in effect. A skin re-deriving the switch
    // for itself would animate here; reading `motion` cannot.
    expect(renderStilled('on', true)).toBe('true')
  })

  it('answers stilled outside a provider instead of throwing', () => {
    // A control must not be handed a private copy of the setting, so `useMotion`
    // throws. An ornament is the other case: rendered outside the app root it
    // should hold still, not start a clock nothing will stop.
    expect(readStilled(renderToStaticMarkup(<StilledProbe />))).toBe('true')
  })
})

describe('scheduleMotionTick — stilled means nothing is scheduled', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules no timer at all while motion is stilled', () => {
    const onTick = vi.fn()
    const stop = scheduleMotionTick(true, onTick, 120)
    expect(vi.getTimerCount(), 'a stilled clock must not hold a timer').toBe(0)
    vi.advanceTimersByTime(1000)
    expect(onTick).not.toHaveBeenCalled()
    stop()
  })

  it('ticks on its interval while motion is on', () => {
    const onTick = vi.fn()
    const stop = scheduleMotionTick(false, onTick, 120)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(360)
    expect(onTick).toHaveBeenCalledTimes(3)
    stop()
  })

  /**
   * The flip-while-mounted half, which a naive test misses: `stilled` is a dep
   * of the effect that calls this, so React runs this teardown the moment a
   * reader turns the switch off with a vote widget on screen — the widget does
   * not go on ticking until it unmounts.
   */
  it('tears down its timer, so a flip to off stops an already-running clock', () => {
    const onTick = vi.fn()
    const stop = scheduleMotionTick(false, onTick, 120)
    stop()
    expect(vi.getTimerCount(), 'teardown left a timer running').toBe(0)
    vi.advanceTimersByTime(1000)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('is safe to tear down a clock that never started', () => {
    expect(() => scheduleMotionTick(true, () => {}, 120)()).not.toThrow()
  })
})

/**
 * Neither skin may keep a private clock or a private copy of the OS query — a
 * second one would escape the switch exactly as the first pair did, and no
 * render in this DOM-less harness can see it.
 */
describe('the two JS-driven vote skins read the shared clock', () => {
  for (const skin of ['AlbescentVote', 'SingularityVote'] as const) {
    const source = readFileSync(
      fileURLToPath(new URL(`../../components/vote/${skin}.tsx`, import.meta.url)),
      'utf8',
    )

    it(`${skin} schedules no interval of its own`, () => {
      expect(source).not.toContain('setInterval')
    })

    it(`${skin} does not re-derive the motion state from matchMedia`, () => {
      expect(source).not.toContain('matchMedia')
    })

    it(`${skin} drives its clock from useMotionTick`, () => {
      expect(source).toContain('useMotionTick')
    })
  }
})
