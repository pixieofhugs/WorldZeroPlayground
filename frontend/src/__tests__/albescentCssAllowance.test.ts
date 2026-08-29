/**
 * Albescent's named CSS allowance is a real number about the real sheet (#2719).
 *
 * `scripts/bundle-budget.mjs` pins how many top-level class selectors Albescent
 * may declare in the blocking stylesheet, and fails CI when it grows. That guard
 * has exactly one way to go quietly wrong, and it is the way this repo has been
 * bitten before: it can stop seeing the stylesheet.
 *
 * The script is plain Node run from `npm run budget`, so it cannot import
 * `src/test/indexCss.ts` and has to re-implement the import-map read that #2891
 * made necessary. Two readers of one sheet is a divergence waiting to happen,
 * and the divergence is SILENT — a script that assembles half the parts reports
 * a smaller Albescent count, which reads as a comfortable pass. The allowance
 * would then be guarding nothing while printing `ok`.
 *
 * So this file re-derives the number from `readIndexCss()` — the helper every
 * other source-reading guard in the repo routes through — and asserts it equals
 * the allowance literal in the script.
 *
 * WHY THE COUNT IS RE-IMPLEMENTED HERE RATHER THAN IMPORTED. Importing the
 * script's own parser would make this tautological: it would prove the script
 * agrees with itself, which it does by construction. Two independent walks over
 * two independently assembled strings agreeing on 50 is the assertion worth
 * making. The cost is that a deliberate change to the counting rule has to be
 * made twice, and that is the point — the rule is part of the decision.
 *
 * WHAT THIS DOES NOT ASSERT: that 50 is the right number. It is not a
 * measurement, it is a ruling (#2649 decision: "the asymmetry is right, the
 * silence is not"). Raising it is a review conversation with a ledger line, and
 * this test failing is how that conversation starts.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { readIndexCss } from '../test/indexCss'

const BUDGET_SCRIPT = fileURLToPath(new URL('../../scripts/bundle-budget.mjs', import.meta.url))

/**
 * Every top-level class selector in the assembled sheet.
 *
 * Grouping at-rules are transparent — a rule inside `@media` or `@layer` is
 * still a rule of the sheet — and a selector nested inside another style rule is
 * not top-level. Selector lists are split on commas, because `.a, .b { }` is two
 * selectors' worth of surface area however it is punctuated.
 */
function topLevelClassSelectors(css: string): string[] {
  const sheet = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors: string[] = []
  const open: ('at-rule' | 'rule')[] = []
  let head = ''
  for (const character of sheet) {
    if (character === '{') {
      const isAtRule = head.trimStart().startsWith('@')
      if (!isAtRule && !open.includes('rule')) {
        for (const selector of head.split(',')) {
          const trimmed = selector.trim()
          if (trimmed.startsWith('.')) selectors.push(trimmed)
        }
      }
      open.push(isAtRule ? 'at-rule' : 'rule')
      head = ''
    } else if (character === '}') {
      open.pop()
      head = ''
    } else {
      head += character
    }
  }
  return selectors
}

/** The allowance the budget script enforces, read as text so it cannot drift. */
function declaredAllowance(): number {
  const script = readFileSync(BUDGET_SCRIPT, 'utf8')
  const match = script.match(/^const ALBESCENT_ALLOWANCE = (\d+)$/m)
  expect(
    match,
    `scripts/bundle-budget.mjs no longer declares \`const ALBESCENT_ALLOWANCE = <n>\` on one
line. Either the allowance was removed — in which case #2719's ruling has been
undone and that needs saying out loud — or it was reformatted, in which case this
reader needs updating rather than deleting.`,
  ).not.toBeNull()
  return Number(match![1])
}

describe("Albescent's named CSS allowance", () => {
  it('is measured against a sheet that actually assembled', () => {
    // The floor the script itself uses. Eleven `@import` lines yield zero, and a
    // guard counting zero `.alb` selectors passes with room to spare.
    const selectors = topLevelClassSelectors(readIndexCss())
    expect(selectors.length).toBeGreaterThan(200)
  })

  it('matches what Albescent declares today, so growth has to be decided', () => {
    const selectors = topLevelClassSelectors(readIndexCss())
    const albescent = selectors.filter((selector) => selector.startsWith('.alb'))

    // Non-vacuity: a zero here would satisfy any ceiling. Albescent is the
    // widest ornament vocabulary in the repo (ADR-0083); it is never zero.
    expect(albescent.length).toBeGreaterThan(0)

    expect(
      albescent.length,
      `Albescent declares ${albescent.length} top-level class selectors; the allowance in
scripts/bundle-budget.mjs is ${declaredAllowance()}. These are two independent readings of
one stylesheet and they must agree.

If you ADDED Albescent rules: \`npm run budget\` is failing too. Raise
ALBESCENT_ALLOWANCE and add a ledger line saying what the growth bought (#2719).

If you DELETED Albescent rules: lower it, and take the win on the record.

If you changed neither: the budget script's copy of the import-map read has
drifted from src/test/indexCss.ts, and the allowance has been guarding a
partial sheet. That is the failure this test exists for.`,
    ).toBe(declaredAllowance())
  })
})
