/**
 * Fixtures for the MOTION arm of the style ratchet (#2104).
 *
 * An inline `animation:` can't be gated by `prefers-reduced-motion` (a style
 * attribute isn't in a stylesheet), and hides the keyframe from consumer
 * analysis, pinning it to the render-blocking sheet (#2073).
 *
 * An AST rule, not a grep (`animation` is everywhere as prose), with its own id
 * so a legacy list can't un-ratchet it. Fixtures lint through the real
 * `eslint.config.js`; `npm run lint` is the "repo is clean" check.
 */
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-inline-animation'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

const lint = async (
  code: string,
  filePath = 'src/inlineAnimationFixture.tsx',
): Promise<string[]> => {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false })
  return result.messages.filter((m) => m.ruleId === RULE).map((m) => m.message)
}

const reports = async (code: string, filePath?: string): Promise<boolean> =>
  (await lint(code, filePath)).length > 0

describe('local/no-inline-animation reports a keyframe named inline', () => {
  it('flags the shorthand in a JSX style attribute — the #2104 shape', async () => {
    expect(
      await reports(
        "export const A = () => <span style={{ animation: 'wz-blink 1.4s ease-in-out infinite' }} />",
      ),
    ).toBe(true)
  })

  it('flags `animationName`, which starts the same motion one property along', async () => {
    expect(await reports("export const s = { animationName: 'wz-blink' }")).toBe(true)
  })

  it('flags a hoisted style object, not just a literal in the attribute', async () => {
    expect(
      await reports(
        "const s = { animation: 'ticker-roll 90s linear infinite' }\nexport const A = () => <div style={s} />",
      ),
    ).toBe(true)
  })

  it('flags the quoted key spelling too', async () => {
    expect(await reports("export const s = { 'animation': 'wz-blink 1s infinite' }")).toBe(true)
  })
})

describe('local/no-inline-animation stays silent on the per-instance timing props', () => {
  /** Inert without a name, which comes from a gated class: the way to stagger a set. */
  it('allows animationDelay and animationDuration', async () => {
    expect(await reports("export const s = { animationDelay: '1.5s' }")).toBe(false)
    expect(await reports('export const s = { animationDuration: `${d}s` }')).toBe(false)
  })

  /** A transition is bounded, reader-caused and names no keyframe: out of scope. */
  it('allows a transition', async () => {
    expect(await reports("export const s = { transition: 'background 150ms' }")).toBe(false)
  })

  /** `UaVote.tsx`'s inline `opacity: 0` keeps a halo hidden if the deferred sheet never lands (#2073). */
  it('allows the inline geometry a stranded-sheet fallback depends on', async () => {
    expect(await reports("export const s = { opacity: 0, transform: 'rotate(12deg)' }")).toBe(false)
  })
})
