/**
 * Shared walk for SOURCE-SCANNING guards ("does any file under `src` still reach
 * for X?", including branches no fixture reaches). The predicate stays in each
 * test. This module is in its own scans but names no token.
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

/** `frontend/src`. */
export const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

export interface ScanOptions {
  /** Where to start. Defaults to all of `frontend/src`. */
  dir?: string
  /** Recurse into `__tests__`. Off by default: guards ask about shipped code. */
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
 * Strip JS/TS comments so prose naming a token isn't a finding. For CSS use
 * `utils/__tests__/cssVars.ts`'s stripper (this one eats `url(https://…)`).
 */
export const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

/** Relative to `src/`, forward slashes. */
export const toRelative = (path: string): string =>
  relative(SRC_DIR, path).split('\\').join('/')

export const readStripped = (path: string): string =>
  stripComments(readFileSync(path, 'utf8'))

/**
 * Fold role reads (`var(--leaf-task-detail-ink)`) back to the faction token, so a
 * token-hunting guard still sees surfaces that spread a role map (#2659, #2689).
 * Declarations come from the same text: a `factionRoleVars(slug, prefix)` call or
 * a rendered `--prefix-role:var(--faction-…)`. Tokens resolve via
 * `factionRoleVar`; no second table.
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

/** `--<prefix>-<role>` → token. A rendered CSS declaration wins over a call. */
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
