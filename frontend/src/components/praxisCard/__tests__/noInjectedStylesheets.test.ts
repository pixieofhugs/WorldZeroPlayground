/**
 * #867 — no praxis-card component may render a `<style>` element.
 *
 * A component-injected stylesheet duplicates on every mount, sits outside the
 * `[data-theme="dark"]` cascade, and bypasses the `prefers-reduced-motion`
 * guard that every animation in index.css is wrapped in. The specific keyframe
 * this issue removed (`@keyframes blink`, injected by the Singularity mobile
 * card) is incidental; the injection is the failure class, so that is what is
 * pinned here.
 *
 * A source scan rather than a render: the offending element is often nested
 * under a branch no fixture reaches, and this way one assertion covers every
 * archetype, present and future, without instantiating any of them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const PRAXIS_CARD_DIR = fileURLToPath(new URL('..', import.meta.url))

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

describe('praxis cards never inject a stylesheet (#867)', () => {
  it('renders no <style> element anywhere under praxisCard/', () => {
    const offenders = sourceFiles(PRAXIS_CARD_DIR)
      .filter((path) => /<style[\s>]/.test(stripComments(readFileSync(path, 'utf8'))))
      .map((path) => relative(PRAXIS_CARD_DIR, path))
    expect(offenders).toEqual([])
  })

  it('scans a non-empty set, so the guard cannot pass by finding nothing', () => {
    expect(sourceFiles(PRAXIS_CARD_DIR).length).toBeGreaterThan(10)
  })
})
