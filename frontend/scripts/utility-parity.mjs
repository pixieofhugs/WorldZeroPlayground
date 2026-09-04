#!/usr/bin/env node
/**
 * Did the Tailwind v4 migration lose a utility? (#2918)
 *
 * WHY THIS EXISTS AS A COMMITTED SCRIPT AND NOT A PARAGRAPH IN A PR
 * -----------------------------------------------------------------
 * The load-bearing evidence for the v3 → v4 migration was "404 classes before,
 * 407 after, none lost". That claim was produced by a throwaway diff on one
 * machine, which is the weakest possible form of evidence for the strongest
 * claim in the change. This is the same diff, committed, so a reviewer can
 * re-run it instead of believing it.
 *
 * WHAT IT CATCHES THAT NOTHING ELSE DOES
 * --------------------------------------
 * v4's class scanner is not v3's. It drops a candidate that runs straight into
 * a template interpolation — `overflow-y-auto${...}` in `DuelSealSheet.tsx`
 * offered its class name to nothing, and the utility simply stopped being
 * emitted. Every check in CI stayed green: tsc sees a valid string, eslint sees
 * a valid string, vitest renders the class onto an element and never asks
 * whether a rule exists for it, and the byte budget got very slightly SMALLER,
 * which reads as a win. Only the emitted stylesheet knows.
 *
 * WHAT IT DOES NOT DO. It is a no-regression ratchet, not a lock: a class in
 * `BASELINE` must still be emitted, but new ones are fine and expected — real
 * feature work adds utilities. A failure means a class that used to be in the
 * sheet is not any more, which is either a deliberate deletion (update the
 * baseline in the same commit, and say what you deleted) or the scanner
 * quietly eating something.
 *
 * The baseline is Tailwind v3's emitted set, captured on `origin/main` at
 * 0d2712a0, the commit this migration branched from. Once v4 has shipped and
 * settled, this file and its baseline can go: its whole job is to hold the
 * migration honest across the version boundary.
 *
 *   npm run build && node scripts/utility-parity.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST_ASSETS = join(HERE, '..', 'dist', 'assets')
const BASELINE = join(HERE, 'utility-parity-v3-baseline.txt')

/**
 * Every class name the sheet actually declares a rule for.
 *
 * Comments are stripped FIRST — the minified sheet opens with Tailwind's own
 * `https://tailwindcss.com` banner, and a naive scan reads `.com` out of it as
 * a class. Only selector preludes are read, at any nesting depth, so a class
 * name appearing inside a `url()` or a string value is not mistaken for a rule.
 */
function emittedClasses(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const classes = new Set()
  let prelude = ''
  for (const character of clean) {
    if (character === '{' || character === '}' || character === ';') {
      // An at-rule prelude (`@media …`) contributes no class of its own, but a
      // selector nested inside one does, so every prelude is read the same way.
      for (const [, name] of prelude.matchAll(/\.(-?[_a-zA-Z][\w-]*(?:\\.[\w-]*)*)/g)) {
        classes.add(name.replace(/\\/g, ''))
      }
      prelude = ''
    } else {
      prelude += character
    }
  }
  return classes
}

function blockingSheet() {
  const sheets = readdirSync(DIST_ASSETS).filter(
    (name) => name.startsWith('index-') && name.endsWith('.css'),
  )
  if (sheets.length !== 1) {
    console.error(
      `utility-parity: expected exactly one dist/assets/index-*.css, found ${sheets.length}.` +
        ' Run `npm run build` first — a check that cannot find the sheet is blind, not passing.',
    )
    process.exit(1)
  }
  return readFileSync(join(DIST_ASSETS, sheets[0]), 'utf8')
}

const baseline = readFileSync(BASELINE, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))

// Same reason `bundle-budget.mjs` floors its selector count: a baseline that
// failed to load would make every comparison below vacuously true.
if (baseline.length < 300) {
  console.error(
    `utility-parity: baseline holds only ${baseline.length} classes — it did not load. Blind, not passing.`,
  )
  process.exit(1)
}

const emitted = emittedClasses(blockingSheet())
const missing = baseline.filter((name) => !emitted.has(name)).sort()
const added = [...emitted].filter((name) => !baseline.includes(name)).sort()

console.log(`\nUtility parity — ${baseline.length} in the v3 baseline, ${emitted.size} emitted now\n`)
if (added.length) {
  console.log(`  ${added.length} added since v3 (expected — new work adds utilities):`)
  console.log(`    ${added.join(' ')}\n`)
}

if (missing.length) {
  console.error(
    `  ${missing.length} class(es) IN THE BASELINE ARE NO LONGER EMITTED:\n` +
      `    ${missing.join(' ')}\n\n` +
      'Every element still carrying one of these renders with no rule behind it.\n' +
      'The usual cause is a class name the scanner cannot see — most often a utility\n' +
      'written flush against a template interpolation (`font-body${…}`), which v3\n' +
      'extracted and v4 does not. Put a space before the `${`.\n' +
      'If the deletion was deliberate, update the baseline in the same commit.\n',
  )
  process.exit(1)
}

console.log('  No utility lost against v3.\n')
