/**
 * The source-scan harness guards itself, once, on behalf of every sweep.
 *
 * Six source-scanning tests each carried their own copy of "reads a non-empty
 * file set, so it cannot pass by finding nothing" — the same assertion about
 * the same directory walk, six times, back when each of them owned a private
 * copy of that walk. There is one walk now, so there is one of these.
 *
 * That assertion is the reason this file exists: a sweep whose scan silently
 * returns nothing reports green forever, and green is exactly what a broken
 * guard looks like from the outside.
 */
import { describe, it, expect } from 'vitest'
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../sourceScan'

describe('the scan sees the codebase', () => {
  it('reads a non-empty file set, so no sweep can pass by finding nothing', () => {
    expect(sourceFiles().length).toBeGreaterThan(100)
  })

  it('collects TypeScript source and nothing else by default', () => {
    expect(sourceFiles().every((path) => /\.tsx?$/.test(path))).toBe(true)
  })

  it('skips __tests__ by default, so a guard does not find its own fixtures', () => {
    expect(sourceFiles().filter((path) => toRelative(path).includes('__tests__'))).toEqual([])
  })

  it('includes __tests__ on request, for the sweeps that allowlist instead', () => {
    const withTests = sourceFiles({ includeTests: true })
    expect(withTests.filter((path) => toRelative(path).includes('__tests__')).length).
      toBeGreaterThan(0)
    expect(withTests.length).toBeGreaterThan(sourceFiles().length)
  })

  it('honours a custom match, so a sweep can reach CSS', () => {
    const css = sourceFiles({ match: /\.css$/ })
    expect(css.map(toRelative)).toContain('index.css')
    expect(css.every((path) => path.endsWith('.css'))).toBe(true)
  })

  it('reports paths relative to src, with forward slashes on every platform', () => {
    expect(toRelative(`${SRC_DIR}components\\Foo.tsx`.replace(/\\/g, '/'))).toBe(
      'components/Foo.tsx',
    )
    expect(toRelative(sourceFiles()[0])).not.toContain('\\')
  })
})

describe('stripComments hides prose from the sweeps', () => {
  it('drops block and line comments, which is where retired names live on', () => {
    expect(stripComments('/* --eph-vellum */ const a = 1')).not.toContain('--eph-vellum')
    expect(stripComments('// <style> here\nconst a = 1')).not.toContain('<style>')
  })

  it('leaves real code alone', () => {
    expect(stripComments('const a = "--eph-vellum"')).toContain('--eph-vellum')
  })
})
