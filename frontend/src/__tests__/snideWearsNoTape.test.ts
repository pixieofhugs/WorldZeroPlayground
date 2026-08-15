/**
 * #1708 — S.N.I.D.E. wears no tape.
 *
 * Tape was *specified*, not accidental: `tape` is a first-class token in both
 * SNIDE palettes in the design kit and epic #1179's seam table names it
 * ("ground() — SNIDE grain + tape"). The owner overrode that seam on
 * 2026-08-14. This guard is the record, so a later fidelity pass against the
 * design does not quietly put the strips back.
 *
 * A SOURCE SCAN rather than a render, for `covenSpeaksOneIdentity`'s reason:
 * the strips sat on eleven surfaces, several of them behind a branch
 * (`membership.state !== 'none'`, a spotlit member, the composer's waiting
 * stage) that no fixture reaches. One assertion covers every surface, present
 * and future, without instantiating any of them.
 *
 * One name covers all three retirements, because each contains it: the
 * `--faction-snide-tape` token, its always-dark twin `--snide-tape`, and the
 * `.snide-tape` class the strips wore.
 *
 * NOT covered, deliberately — these are a different visual family and stay:
 *
 *  • `SnideTaskDetail`'s HAZARD tape (diagonal stripes on the action plate);
 *  • `SnidePraxisDetail`'s clippings "taped along the rail" — the clipping and
 *    its look are the archetype.
 *
 * Neither reaches for the retired name, so neither has to be excused here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

/** The retired strip, as the one substring every form of it contains. */
const RETIRED = /snide-tape/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path)
    return /\.(tsx?|css)$/.test(entry) ? [path] : []
  })
}

/**
 * A docstring may legitimately NAME the strip — several SNIDE headers explain
 * what came off, and this file's own header does. Only a declaration or a draw
 * call counts.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const toRelative = (path: string) => relative(SRC_DIR, path).split('\\').join('/')

describe('S.N.I.D.E. wears no tape (#1708)', () => {
  it('nothing declares, draws or reaches for the tape strip', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((path) => RETIRED.test(stripComments(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('scans a non-empty set, so the guard cannot pass by finding nothing', () => {
    expect(sourceFiles(SRC_DIR).length).toBeGreaterThan(100)
  })
})
