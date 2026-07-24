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
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

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

/** Components only — `__tests__` holds this guard, which names `<style>` itself. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })
}

/** Comments legitimately mention `<style>` (this file's own header does). */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const toRelative = (path: string) => relative(SRC_DIR, path).split('\\').join('/')

describe('components never inject a stylesheet (#911, widened from #867)', () => {
  it('renders no <style> element anywhere under frontend/src', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((path) => /<style[\s>]/.test(stripComments(readFileSync(path, 'utf8'))))
      .map(toRelative)
      .filter((path) => !GRANDFATHERED.includes(path))
    expect(offenders).toEqual([])
  })

  it('every grandfathered entry still exists and still injects, so the list stays honest', () => {
    const stillInjecting = sourceFiles(SRC_DIR)
      .filter((path) => /<style[\s>]/.test(stripComments(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(GRANDFATHERED.filter((path) => !stillInjecting.includes(path))).toEqual([])
  })

  it('scans a non-empty set, so the guard cannot pass by finding nothing', () => {
    expect(sourceFiles(SRC_DIR).length).toBeGreaterThan(100)
  })
})
