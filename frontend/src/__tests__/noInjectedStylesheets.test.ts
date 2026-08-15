/**
 * #911 (widened from #867) — no component may render a `<style>` element.
 *
 * A component-injected stylesheet duplicates on every mount, sits outside the
 * `[data-theme="dark"]` cascade, is invisible to the `index.css` token
 * discipline and the `factionTokensDeclared` guard (#879), and — the reason
 * this became an accessibility bug — bypasses the `prefers-reduced-motion`
 * guard that every animation in index.css is wrapped in, unless the injected
 * rule happens to carry its own. Four Singularity duel surfaces redefined
 * `.sg-cursor` this way at the same specificity as the guarded index.css rule,
 * so which won depended on mount order (#911).
 *
 * #867 pinned this for `praxisCard/`; #911 promotes it to all of `frontend/src`,
 * same shape as the `no-raw-style-values` ratchet: a grandfathered allowlist
 * that ONLY EVER SHRINKS. No file may be added to it — a new injection is fixed
 * in place (route the animation through an index.css class) or, if it is a
 * genuinely one-off scoped keyframe with no index.css home, raised as its own
 * issue and, only then, added here with a reason.
 *
 * A source scan rather than a render: the offending element is often nested
 * under a branch no fixture reaches, so one assertion covers every component,
 * present and future, without instantiating any of them.
 */
import { describe, it, expect } from 'vitest'
// Components only — `sourceFiles` skips `__tests__` by default, and `__tests__`
// holds this guard, which names `<style>` itself. Comments are stripped for the
// same reason (this file's own header mentions the element).
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

/**
 * Grandfathered injections, keyed by path relative to `frontend/src`. This list
 * only shrinks. Each entry names why the injection has no index.css home yet.
 */
const GRANDFATHERED: readonly string[] = [
  // LevelUpPopup's confetti fall: a self-contained, correctly reduced-motion-
  // guarded keyframe local to one popup. Moving it into index.css is its own
  // change (out of #911's blink-consolidation scope), not a defect to fix here.
  'components/LevelUpPopup.tsx',
]

const injectors = (): string[] =>
  sourceFiles()
    .filter((path) => /<style[\s>]/.test(readStripped(path)))
    .map(toRelative)

describe('components never inject a stylesheet (#911, widened from #867)', () => {
  it('renders no <style> element anywhere under frontend/src', () => {
    expect(injectors().filter((path) => !GRANDFATHERED.includes(path))).toEqual([])
  })

  it('every grandfathered entry still exists and still injects, so the list stays honest', () => {
    const stillInjecting = injectors()
    expect(GRANDFATHERED.filter((path) => !stillInjecting.includes(path))).toEqual([])
  })

  // "scans a non-empty set" is asserted once, with the shared walk, in
  // `src/test/__tests__/sourceScan.test.ts`.
})
