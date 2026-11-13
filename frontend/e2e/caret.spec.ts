import { test, expect, type Page } from '@playwright/test'

import { selectOpenTask } from '../src/utils/collabScenario'
import { createPraxis, fetchTasks, loginPlayer } from '../src/utils/e2eScenario'
import { scenarioFor } from './duel.helpers'

/**
 * #3150: the drawn caret at column 0 must be inside `.cm-scroller`'s clip box.
 * CodeMirror hangs the caret 0.6px left of the text (`margin-left: -0.6px`) and
 * our theme zeroes the line padding, so only real layout can catch it; CSS-rule
 * checks missed it twice. Measures whichever skin the first open task wears
 * (the rule lives in the shared theme).
 */

// Layout is quantised to 1/64px; the defect is 0.6px.
const SLACK_PX = 0.1

// Wider than the 0.6px defect (so the unfixed caret still counts as column 0
// and then fails the clip check), narrower than one glyph.
const AT_LINE_START_PX = 1.5

interface Boxes {
  caret: { left: number; right: number; top: number; width: number; height: number }
  clip: { left: number; right: number }
  line: { textLeft: number; top: number; bottom: number }
}

/**
 * Retries until the drawn caret has ARRIVED at line `lineIndex`'s start:
 * CodeMirror redraws it a frame after the keystroke, and a stale read passes
 * with the fix reverted. Checks vertical too (after Enter the stale caret is
 * at the line above's start).
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
 * #3171: same claim at the right edge (1.5px caret). Needs the scroller's
 * padding-right (offset by a negative margin). An unbroken run wraps by
 * character, so `End` lands within a glyph of the edge.
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
        const content = root.querySelector('.cm-content')?.getBoundingClientRect()
        if (!caret || !clip || !line || !content) return null
        return { caret, clip, line, content }
      })
      expect(m, 'no drawn caret, scroller or line').not.toBeNull()
      // Arrived (stale caret is on a later visual line).
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
      // The clip check alone passes without the padding-right; this doesn't.
      expect(
        m!.clip.right - m!.content.right,
        `scroller ${m!.clip.right}, content ${m!.content.right}`,
      ).toBeGreaterThanOrEqual(m!.caret.width - SLACK_PX)
    }).toPass({ timeout: 5_000 })
  } finally {
    await player.ctx.close()
  }
})
