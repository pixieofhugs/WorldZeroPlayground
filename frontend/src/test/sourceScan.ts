/**
 * The shared harness for the repo's SOURCE-SCANNING guards.
 *
 * A dozen tests here answer a question no render can: "does any file, anywhere
 * under `frontend/src`, still reach for X?" The offending line is usually
 * inside a branch (`membership.state === 'gate'`, a `danger` ternary, an empty
 * state) that no fixture reaches, so one scan covers every surface, present and
 * future, without instantiating any of them. Each of those tests used to carry
 * its own copy of this walk, its own comment stripper and its own path
 * relativiser — nine copies that drifted in three directions (some skipped
 * `__tests__`, some did not; one wanted `.css` too).
 *
 * So the walk lives here and the *predicate* stays in the test, which is the
 * only part that was ever different.
 *
 * Note this module is itself under `src/`, so it appears in its own scans —
 * exactly as `preloadArchetypes.ts` next door always has. It names no token and
 * renders no element, so it is never a finding.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/** `frontend/src`, the root every scan walks and every path is reported against. */
export const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

export interface ScanOptions {
  /** Where to start. Defaults to all of `frontend/src`. */
  dir?: string
  /**
   * Recurse into `__tests__` directories. Off by default: a guard is asking
   * about SHIPPED code, and the guard's own fixtures name the thing it forbids.
   * The sweeps that scan everything (and allowlist their own fixtures instead)
   * pass `true`.
   */
  includeTests?: boolean
  /** Which files to collect. Defaults to TypeScript source. */
  match?: RegExp
}

/** Every source file under `dir`, depth-first. */
export function sourceFiles({
  dir = SRC_DIR,
  includeTests = false,
  match = /\.tsx?$/,
}: ScanOptions = {}): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      return !includeTests && entry === '__tests__'
        ? []
        : sourceFiles({ dir: path, includeTests, match })
    }
    return match.test(entry) ? [path] : []
  })
}

/**
 * Strip JS/TS comments, so prose that NAMES a retired token — every one of
 * these guards explains itself in a header, and the components explain what
 * came off — is not mistaken for a declaration. Only a draw call counts.
 *
 * For CSS use `utils/__tests__/cssVars.ts`'s stripper instead: it leaves `//`
 * alone, which matters the moment a `url(https://…)` appears.
 */
export const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

/** A path as the guards report it: relative to `src/`, forward slashes on Windows. */
export const toRelative = (path: string): string =>
  relative(SRC_DIR, path).split('\\').join('/')

/** Read a scanned file with its comments already gone. */
export const readStripped = (path: string): string =>
  stripComments(readFileSync(path, 'utf8'))
