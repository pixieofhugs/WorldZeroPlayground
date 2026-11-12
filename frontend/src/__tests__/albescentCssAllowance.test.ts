/**
 * `scripts/bundle-budget.mjs`'s ALBESCENT_ALLOWANCE must match the real sheet
 * (#2719). The script re-implements the import-map read (it can't import
 * `indexCss.ts`), and a partial read would silently pass with a smaller count.
 * The count is re-implemented here, not imported, so the check isn't
 * tautological. The number itself is a ruling (#2649), not asserted correct.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { readIndexCss } from '../test/indexCss'

const BUDGET_SCRIPT = fileURLToPath(new URL('../../scripts/bundle-budget.mjs', import.meta.url))

/** Top-level class selectors: at-rules are transparent, nested rules excluded, lists split on commas. */
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
    // Same floor as the script: an unassembled sheet counts zero.
    const selectors = topLevelClassSelectors(readIndexCss())
    expect(selectors.length).toBeGreaterThan(200)
  })

  it('matches what Albescent declares today, so growth has to be decided', () => {
    const selectors = topLevelClassSelectors(readIndexCss())
    const albescent = selectors.filter((selector) => selector.startsWith('.alb'))

    // Non-vacuity.
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
