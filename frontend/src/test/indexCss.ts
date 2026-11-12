/**
 * Read the whole site stylesheet: `src/index.css` is an import map over
 * `src/css/*.css` (#2891). Reading the map alone would leave guards asserting
 * over nothing. Parts join in import order (= the cascade, which `cssVars.ts`
 * relies on); `@import '../fonts.css'` stays unexpanded.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** `frontend/src`. */
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

/** The import map itself (no rules); for the map-vs-`src/css/` guard. */
export const INDEX_CSS_MAP = join(SRC_DIR, 'index.css')

/** Absolute part paths in import (cascade) order. */
export function indexCssParts(): string[] {
  const map = readFileSync(INDEX_CSS_MAP, 'utf8')
  return [...map.matchAll(/^@import\s+'\.\/css\/([\w.-]+\.css)';$/gm)].map((match) =>
    join(SRC_DIR, 'css', match[1]),
  )
}

/** All parts as one string, cascade order. */
export function readIndexCss(): string {
  return indexCssParts()
    .map((path) => readFileSync(path, 'utf8'))
    .join('')
}
