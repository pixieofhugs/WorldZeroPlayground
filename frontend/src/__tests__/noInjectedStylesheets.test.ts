/**
 * #911 (widened from #867) — no component may render a `<style>` element.
 *
 * An injected sheet duplicates per mount, escapes the dark-theme cascade and
 * token guards, and bypasses the `prefers-reduced-motion` gate (a11y). The
 * allowlist only shrinks: route new animations through an index.css class.
 * A source scan, since offenders often sit in branches no fixture reaches.
 */
import { describe, it, expect } from 'vitest'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

/** Relative to `frontend/src`; each entry says why it has no index.css home yet. */
const GRANDFATHERED: readonly string[] = [
  // Confetti: self-contained, already reduced-motion-guarded.
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
})
