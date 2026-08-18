/**
 * Fixtures for the MOTION arm of the style ratchet (#2104).
 *
 * An inline `animation:` names a keyframe from a place no `@media` query can
 * reach. `@media (prefers-reduced-motion: no-preference)` is a property of the
 * STYLESHEET, and a style attribute is not in a stylesheet — so the animation
 * runs for a reader who asked for none, and no amount of care in `index.css`
 * can gate it. `ActivityTicker.tsx` did exactly this to the homepage's "LIVE"
 * dot and to its 90s marquee: both blinked and rolled forever through the
 * preference (#2104), reaching `wz-blink` from outside the one-keyframe-one-
 * guard structure #911 built for precisely that reason.
 *
 * It has a second, quieter cost. A keyframe referenced by an inline string is
 * invisible to consumer analysis, so #2073 could not move `@keyframes wz-blink`
 * into the deferred `src/motion.ornament.css` — one style attribute pinned a
 * keyframe to the render-blocking sheet.
 *
 * WHY A LINT ARM AND NOT A WIDENING OF `noInjectedStylesheets.test.ts`
 * -------------------------------------------------------------------
 * That guard greps stripped source for `<style`, which is honest for an element
 * name and hopeless for a property: `animation` appears in ~40 files as prose,
 * inside `animationDelay`, and in long comments about `index.css`. The
 * distinction that matters is syntactic — is this identifier a KEY of an object
 * that becomes a style attribute — and only an AST can see it. So the guard
 * grows as an ESLint arm, in the plugin the colour/tier/polarity arms already
 * live in, as its OWN id for the mechanical reason that file states: the
 * ratchet turns a whole RULE off per file, so a shared id would let a legacy
 * list silently un-ratchet this one.
 *
 * The seam is the RULE AS WIRED, not the regex — same reasoning as
 * `rawColourRule.test.ts`: every hole the px arm has been patched for was
 * between "the pattern matches" and "the visitor ever sees the node". These
 * lint real source text through the real `eslint.config.js`.
 *
 * There is deliberately no "and the repo is clean" case here. `npm run lint` IS
 * that assertion, over the same tree with the same config, and it fails CI in
 * its own step; running `eslint.lintFiles(['src'])` a second time inside vitest
 * takes longer than the whole rest of this file and proves the same thing.
 */
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const RULE = 'local/no-inline-animation'

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

/** Rule ids reported for `code`, judged as if it lived at `filePath`. */
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

  /**
   * The laundering route the colour arm learned the hard way (#1932): a `const`
   * holding the value, then `style={s}`. The KEY is what this rule reads, so
   * the value never has to be resolved — a hoisted style object is caught by
   * the same visitor that catches the literal in the attribute.
   */
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
  /**
   * `animation-delay` and `animation-duration` are INERT without an
   * `animation-name`, and the name only ever arrives from a gated class. That
   * is not a loophole, it is the established pattern: `LevelUpPopup`'s confetti,
   * `praxisCard/shared.tsx`'s Albescent sparks and `EverymenTaskCard`'s arcs all
   * carry a per-element beat inline while the animation itself lives on the
   * class. Flagging these would delete the only correct way to stagger a set.
   */
  it('allows animationDelay and animationDuration', async () => {
    expect(await reports("export const s = { animationDelay: '1.5s' }")).toBe(false)
    expect(await reports('export const s = { animationDuration: `${d}s` }')).toBe(false)
  })

  /**
   * A `transition` is deliberately NOT this rule's business, and the repo holds
   * ~70 of them. The argument that convicts `animation` does not carry: a
   * transition runs once, bounded, in response to a state change the reader
   * caused, and it names no keyframe, so it pins nothing to the critical path.
   * Nearly every one here eases a colour. Banning them is a different change
   * with a different justification, and it is not #2104's.
   */
  it('allows a transition', async () => {
    expect(await reports("export const s = { transition: 'background 150ms' }")).toBe(false)
  })

  /**
   * `UaVote.tsx` carries the mandala's geometry inline, including a
   * load-bearing `opacity: 0` on `.ua-mandala-halo` — the reason a
   * never-arriving deferred sheet does not strand a halo on screen (#2073).
   * It names no keyframe, so it needs no exemption entry: this rule reads keys,
   * and that key is not one of them.
   */
  it('allows the inline geometry a stranded-sheet fallback depends on', async () => {
    expect(await reports("export const s = { opacity: 0, transform: 'rotate(12deg)' }")).toBe(false)
  })
})
