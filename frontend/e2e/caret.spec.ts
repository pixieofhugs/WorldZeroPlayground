import { test, expect, type Page } from '@playwright/test'

import { selectOpenTask } from '../src/utils/collabScenario'
import { createPraxis, fetchTasks, loginPlayer } from '../src/utils/e2eScenario'
import { scenarioFor } from './duel.helpers'

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

// Layout is quantised to 1/64px and the caret's `left` is computed by
// subtraction, so "inside" gets a hair of slack. The defect is 0.6px.
const SLACK_PX = 0.1

// How far the caret's left edge may sit from the line's text start and still
// count as "at the line start". Wider than the 0.6px defect, so the unfixed
// caret is still RECOGNISED as being at column 0 and then fails the clip
// check below; far narrower than one typed glyph, so a caret still parked
// after `abc` is not.
const AT_LINE_START_PX = 1.5

interface Boxes {
  caret: { left: number; right: number; top: number; width: number; height: number }
  clip: { left: number; right: number }
  line: { textLeft: number; top: number; bottom: number }
}

/**
 * The drawn caret, once it has ARRIVED at the start of line `lineIndex`.
 *
 * CodeMirror moves the drawn caret in a later animation frame than the
 * keystroke (`drawSelection`'s layer redraws through `requestMeasure`), so one
 * read straight after `Home` or `Enter` measures where the caret WAS: after
 * `abc`, well inside the scroller, and the clip check passes with the fix
 * reverted. So the read retries until the caret is at this line's text start,
 * horizontally and on this line vertically (after `Enter` the stale caret is
 * also at a line start, the one above).
 */
async function caretAtLineStart(page: Page, lineIndex: number, where: string): Promise<Boxes> {
  const editor = page.locator('.cm-editor').first()
  let boxes: Boxes | null = null
  await expect(async () => {
    boxes = await editor.evaluate((root, index): Boxes | null => {
      const caret = root.querySelector('.cm-cursor-primary')?.getBoundingClientRect()
      const clip = root.querySelector('.cm-scroller')?.getBoundingClientRect()
      const lineEl = root.querySelectorAll('.cm-content > .cm-line')[index]
      if (!caret || !clip || !lineEl) return null
      const line = lineEl.getBoundingClientRect()
      return {
        caret: { left: caret.left, right: caret.right, top: caret.top, width: caret.width, height: caret.height },
        clip: { left: clip.left, right: clip.right },
        line: {
          textLeft: line.left + parseFloat(getComputedStyle(lineEl).paddingLeft),
          top: line.top,
          bottom: line.bottom,
        },
      }
    }, lineIndex)
    expect(boxes, `${where}: no drawn caret, scroller or line ${lineIndex}`).not.toBeNull()
    const { caret, line } = boxes!
    const said = `${where}: caret left ${caret.left} top ${caret.top}, line ${lineIndex} text starts ${line.textLeft}, spans ${line.top}–${line.bottom}`
    expect(Math.abs(caret.left - line.textLeft), `not at the line start — ${said}`).toBeLessThanOrEqual(
      AT_LINE_START_PX,
    )
    expect(caret.top, `not on the line — ${said}`).toBeGreaterThanOrEqual(line.top - AT_LINE_START_PX)
    expect(caret.top, `not on the line — ${said}`).toBeLessThan(line.bottom)
  }).toPass({ timeout: 5_000 })
  return boxes!
}

async function expectCaretInsideScroller(page: Page, lineIndex: number, where: string): Promise<void> {
  const { caret, clip } = await caretAtLineStart(page, lineIndex, where)
  const said = `${where}: caret ${caret.left}–${caret.right}, scroller ${clip.left}–${clip.right}`
  // Soft, so one run reports all three positions rather than the first.
  expect.soft(caret.width, said).toBeGreaterThan(0)
  expect.soft(caret.height, said).toBeGreaterThan(0)
  expect.soft(caret.left, said).toBeGreaterThanOrEqual(clip.left - SLACK_PX)
  expect.soft(caret.right, said).toBeLessThanOrEqual(clip.right + SLACK_PX)
}

test('the write-up caret at the start of a line is inside the box that clips it', async ({ browser }) => {
  const scenario = scenarioFor(browser)
  const player = await loginPlayer(scenario, 'cr', 0)
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
    await expectCaretInsideScroller(page, 0, 'empty write-up after a click')

    await page.keyboard.type('abc')
    await page.keyboard.press('Home')
    await expectCaretInsideScroller(page, 0, 'text, then Home')

    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await expectCaretInsideScroller(page, 1, 'start of a second line after Enter')
  } finally {
    await player.ctx.close()
  }
})

/**
 * #3171 — the same claim at the RIGHT edge, at the 1.5px weight. The caret sits
 * wholly right of its text position, so at the end of a visual line that fills
 * the scroller it needs the scroller's own inline room (padding-right, paid back
 * by an equal negative margin so text never moves).
 *
 * One unbroken run wraps by character, so `End` on the first visual line parks
 * the caret at that line's end, within a glyph of the right edge. That is the
 * nearest a browser test gets to "exactly full"; a caret that clips there clips
 * at flush too.
 */
test('the write-up caret at the end of a full-width line is inside the box that clips it', async ({
  browser,
}) => {
  const scenario = scenarioFor(browser)
  const player = await loginPlayer(scenario, 'cr', 0)
  try {
    const task = selectOpenTask(await fetchTasks(player))
    const praxis = await createPraxis(player, { task_id: task.id, type: 'solo' })

    const page = await player.ctx.newPage()
    await page.goto(`/praxis/${praxis.id}/edit`)
    const body = page.locator('.cm-content').first()
    await expect(body).toBeEditable()

    await body.click()
    await page.keyboard.type('w'.repeat(400))
    await page.keyboard.press('Control+Home')
    await page.keyboard.press('End')

    const editor = page.locator('.cm-editor').first()
    await expect(async () => {
      const m = await editor.evaluate((root) => {
        const caret = root.querySelector('.cm-cursor-primary')?.getBoundingClientRect()
        const clip = root.querySelector('.cm-scroller')?.getBoundingClientRect()
        const line = root.querySelector('.cm-content > .cm-line')?.getBoundingClientRect()
        if (!caret || !clip || !line) return null
        return { caret, clip, line }
      })
      expect(m, 'no drawn caret, scroller or line').not.toBeNull()
      // Arrived: on the first visual line, in its right half (the stale caret
      // is at the end of the typed run, on a later visual line).
      expect(m!.caret.top, 'caret has not moved to the first visual line').toBeLessThan(
        m!.line.top + m!.caret.height,
      )
      expect(m!.caret.left, 'caret not yet at the line end').toBeGreaterThan(
        (m!.line.left + m!.line.right) / 2,
      )
      const said = `caret ${m!.caret.left}–${m!.caret.right}, scroller ${m!.clip.left}–${m!.clip.right}`
      expect(m!.caret.width, said).toBeGreaterThanOrEqual(1.5 - SLACK_PX)
      expect(m!.caret.right, said).toBeLessThanOrEqual(m!.clip.right + SLACK_PX)
      expect(m!.caret.left, said).toBeGreaterThanOrEqual(m!.clip.left - SLACK_PX)
    }).toPass({ timeout: 5_000 })
  } finally {
    await player.ctx.close()
  }
})
