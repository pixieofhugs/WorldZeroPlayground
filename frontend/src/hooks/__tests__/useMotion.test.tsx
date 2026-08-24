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
import { describe, it, expect, afterEach } from 'vitest'

import {
  DEFAULT_MOTION,
  MOTION_ATTRIBUTE,
  MotionProvider,
  applyMotion,
  effectiveMotion,
  nextMotion,
  readReducedMotion,
  resolveInitialMotion,
  useMotion,
} from '../useMotion'

const INDEX_CSS = readFileSync(
  fileURLToPath(new URL('../../index.css', import.meta.url)),
  'utf8',
)

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
