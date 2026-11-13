#!/usr/bin/env node
/**
 * Did the Tailwind v4 migration lose a utility? (#2918)
 *
 * v4's scanner drops a candidate glued to a template interpolation
 * (`overflow-y-auto${...}`) and nothing else in CI notices: only the emitted sheet
 * knows. Ratchet, not a lock: every baseline class must still be emitted; new ones
 * are fine. A failure is a deliberate deletion (edit the baseline and say so) or
 * the scanner eating something. Baseline: v3's emitted set from origin/main.
 *
 *   npm run build && node scripts/utility-parity.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST_ASSETS = join(HERE, '..', 'dist', 'assets')
const BASELINE = join(HERE, 'utility-parity-v3-baseline.txt')

/** Every class with a rule; comments stripped first (the banner URL reads as `.com`). */
function emittedClasses(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const classes = new Set()
  let prelude = ''
  for (const character of clean) {
    if (character === '{' || character === '}' || character === ';') {
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

// A baseline that failed to load would make every comparison vacuously true.
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
