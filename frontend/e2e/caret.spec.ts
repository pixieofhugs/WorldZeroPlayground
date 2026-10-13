import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { selectOpenTask } from '../src/utils/collabScenario'
import { createPraxis, fetchTasks, loginPlayer, type Scenario } from '../src/utils/e2eScenario'

/**
 * #3150 — the write-up's drawn caret is inside the box that clips it when it
 * sits at the start of a line.
 *
 * The seam is the real browser's layout, because nothing short of it can see
 * this: CodeMirror's base theme hangs the caret 0.6px to the LEFT of the text
 * (`margin-left: -0.6px`, room it expects from a line's left padding), the
 * composer's theme zeroes that padding because the skin owns it, and
 * `.cm-scroller` clips. At column 0 the caret was 0.4px inside its clip box and
 * painted nothing. Every earlier check on this caret asserted that a CSS rule
 * existed (`bodyEditorCaret.test.ts`) and passed through two wrong diagnoses
 * (#1852, #2970), so this one measures boxes instead.
 *
 * Three positions, one claim. They are the same bug, not three: an empty
 * write-up is merely the case where the caret is ALWAYS at column 0, which is
 * why it was reported as "no cursor until you type".
 *
 * Whichever skin the first open task wears is the one measured. That is fine:
 * the rule lives in the shared theme all eight mount. What this cannot say is
 * that the caret LOOKS right on each of them — that is a pair of eyes.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
const RUN = Date.now().toString(36)

const scenarioFor = (browser: Browser): Scenario<BrowserContext> => ({ browser, api: API, run: RUN })

// Layout is quantised to 1/64px and the caret's `left` is computed by
// subtraction, so "inside" gets a hair of slack. The defect is 0.6px.
const SLACK_PX = 0.1

async function expectCaretInsideScroller(page: Page, where: string): Promise<void> {
  const caret = page.locator('.cm-cursor-primary')
  await expect(caret, `${where}: no drawn caret`).toBeVisible()
  const caretBox = await caret.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect)
  const clipBox = await page
    .locator('.cm-scroller')
    .first()
    .evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect)
  const said = `${where}: caret ${caretBox.left}–${caretBox.right}, scroller ${clipBox.left}–${clipBox.right}`
  expect(caretBox.width, said).toBeGreaterThan(0)
  expect(caretBox.height, said).toBeGreaterThan(0)
  expect(caretBox.left, said).toBeGreaterThanOrEqual(clipBox.left - SLACK_PX)
  expect(caretBox.right, said).toBeLessThanOrEqual(clipBox.right + SLACK_PX)
}

test('the write-up caret at the start of a line is inside the box that clips it', async ({ browser }) => {
  const scenario = scenarioFor(browser)
  const player = await loginPlayer(scenario, 'caret', 0)
  try {
    const task = selectOpenTask(await fetchTasks(player))
    // No title, no body: exactly what a sign-up click mints.
    const praxis = await createPraxis(player, { task_id: task.id, type: 'solo' })

    const page = await player.ctx.newPage()
    await page.goto(`/praxis/${praxis.id}/edit`)
    const body = page.locator('.cm-content').first()
    // Editable is the praxis room finishing its first sync (#1742).
    await expect(body).toBeEditable()

    await body.click()
    await expectCaretInsideScroller(page, 'empty write-up after a click')

    await page.keyboard.type('abc')
    await page.keyboard.press('Home')
    await expectCaretInsideScroller(page, 'text, then Home')

    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await expectCaretInsideScroller(page, 'start of a second line after Enter')
  } finally {
    await player.ctx.close()
  }
})
