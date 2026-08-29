/**
 * Read the site stylesheet — the whole sheet, not the file called `index.css`.
 *
 * #2891 cut `src/index.css` along the section boundaries #2890 drew, so the
 * rules live in `src/css/*.css` and the entry is an import map. Fifty-odd
 * guards here answer questions only the source text can answer — "what does
 * `--everymen-paper` evaluate to under `[data-theme='dark']`?", "does any rule
 * still name the retired token?", "is this pairing above 4.5:1?" — and every
 * one of them used to `readFileSync` that path.
 *
 * After the split that read returns eleven `@import` lines, and the guard that
 * fails loudly is the LUCKY case. The dangerous one filters the text for
 * matching rules and asserts over the survivors: it finds nothing, survives
 * nothing, and reports a perfect board while the faction contrast system goes
 * unchecked. So the read lives here, once, and every caller routes through it.
 *
 * Two deliberate properties:
 *
 *  - The parts are concatenated IN THE ORDER THE MAP IMPORTS THEM, which is the
 *    cascade. A guard that resolves a token by "last declaration wins" — which
 *    `utils/__tests__/cssVars.ts` does — gets the same answer the browser does
 *    only if this order is the import order, so it is read from the map rather
 *    than from a list kept here.
 *  - `@import '../fonts.css'` is left as a LITERAL LINE, unexpanded. That is
 *    what a caller saw before the split; expanding it would drop three
 *    `@font-face` blocks into every rule count in the suite and quietly move
 *    assertions that were never about fonts.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** `frontend/src`. */
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

/**
 * The import map. It holds no rule, so reading it is almost never what a test
 * wants — it is exported for the guard that checks the map against `src/css/`.
 */
export const INDEX_CSS_MAP = join(SRC_DIR, 'index.css')

/** The parts, absolute, in the order `index.css` imports them = the cascade. */
export function indexCssParts(): string[] {
  const map = readFileSync(INDEX_CSS_MAP, 'utf8')
  return [...map.matchAll(/^@import\s+'\.\/css\/([\w.-]+\.css)';$/gm)].map((match) =>
    join(SRC_DIR, 'css', match[1]),
  )
}

/** Every rule `src/index.css` pulls in, as one string, in cascade order. */
export function readIndexCss(): string {
  return indexCssParts()
    .map((path) => readFileSync(path, 'utf8'))
    .join('')
}
