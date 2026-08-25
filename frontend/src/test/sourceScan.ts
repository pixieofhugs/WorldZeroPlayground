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

import {
  FACTION_ROLES,
  factionRoleProperty,
  factionRoleVar,
  type FactionGround,
} from '../utils/factionRoles'

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

/* -------------------------------------------------------------------------- */
/* Role reads                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fold every role read in `text` down to the token the role map names.
 *
 * A guard that asks "does this surface paint itself in the faction's own ink?"
 * used to answer by looking for `--faction-ua-card-text` in the source or in the
 * rendered markup. Since #2659 the surface spreads a map and reads
 * `var(--leaf-task-detail-ink)` instead, so the token name is no longer written
 * anywhere the guard can see it — it is computed. Twelve guards were widened
 * one at a time to accept the transitional `var(--x-ink, var(--faction-…))`
 * shape, and two of them grew a private `foldRoleReads` to do it; both copies
 * broke the moment the fallback came off (#2689).
 *
 * So the fold lives here, and it resolves rather than pattern-matches. It reads
 * the declarations out of the same text it is folding — either the
 * `factionRoleVars("ua", "leaf-task-detail")` call in a source file, or the
 * `--leaf-task-detail-ink:var(--faction-ua-card-text)` React renders into a
 * style attribute — so a guard gets the token whether or not a fallback is
 * still there, and keeps asserting the thing it was written to assert.
 *
 * It deliberately does NOT know the role vocabulary's tokens itself. Everything
 * comes back through `factionRoleVar`, so a repointed role moves this on the
 * same commit and no second table exists to drift.
 */
export function resolveRoleReads(text: string): string {
  const tokens = roleDeclarations(text)
  if (tokens.size === 0) return text

  let out = ''
  let cursor = 0
  for (let i = text.indexOf('var('); i !== -1; i = text.indexOf('var(', i + 1)) {
    if (i < cursor) continue
    const closed = balancedEnd(text, i + 3)
    if (closed === null) continue
    const [property] = splitOnTopLevelComma(text.slice(i + 4, closed))
    const token = tokens.get(property)
    if (token === undefined) continue
    out += text.slice(cursor, i) + token
    cursor = closed + 1
  }
  return out + text.slice(cursor)
}

/**
 * `--<prefix>-<role>` → the token it resolves to, harvested from whichever of
 * the two shapes the text is in. A CSS declaration wins over a call, because a
 * rendered style attribute is what the browser actually got.
 */
function roleDeclarations(text: string): Map<string, string> {
  const tokens = new Map<string, string>()

  const call = new RegExp(
    String.raw`factionRoleVars\(\s*["'\`]([\w-]+)["'\`]\s*,\s*["'\`]([\w-]+)["'\`]\s*(?:,\s*["'\`](\w+)["'\`]\s*)?\)`,
    'g',
  )
  for (const [, slug, prefix, ground] of text.matchAll(call)) {
    for (const role of FACTION_ROLES) {
      tokens.set(
        factionRoleProperty(prefix, role),
        factionRoleVar(slug, role, (ground ?? 'sheet') as FactionGround),
      )
    }
  }

  for (const [, property, token] of text.matchAll(
    /(--[\w-]+)\s*:\s*(var\(--faction-[\w-]+\))/g,
  )) {
    tokens.set(property, token)
  }

  return tokens
}

/** Index of the `)` closing the `(` at `open`, or null. */
function balancedEnd(text: string, open: number): number | null {
  let depth = 0
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1
    else if (text[i] === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return null
}

/** `--x-ink, var(--y)` → `["--x-ink", "var(--y)"]`; no comma → one element. */
function splitOnTopLevelComma(body: string): [string, string | null] {
  let depth = 0
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '(') depth += 1
    else if (body[i] === ')') depth -= 1
    else if (body[i] === ',' && depth === 0) {
      return [body.slice(0, i).trim(), body.slice(i + 1).trim()]
    }
  }
  return [body.trim(), null]
}
