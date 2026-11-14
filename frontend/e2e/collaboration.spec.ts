import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

import forms from '../src/locales/en/forms.json' with { type: 'json' }
import praxisCopy from '../src/locales/en/praxis.json' with { type: 'json' }
import {
  COLLAB_CREATOR_LEVEL,
  COLLAB_INVITEE_LEVEL,
  bothSubmit,
  seedCollabDraft,
  seedPendingInvites,
  selectOpenTask,
  type CollabDraft,
} from '../src/utils/collabScenario'
import {
  createPraxis,
  fetchPraxis,
  fetchTasks,
  loginPlayer,
  submitPraxis,
  type Scenario,
} from '../src/utils/e2eScenario'

/**
 * Collaboration praxis lifecycle, two real characters on one task.
 *
 * Thin Playwright driver (#2888): all scenario logic lives in
 * `src/utils/collabScenario.ts` and `src/utils/e2eScenario.ts`, under the app's
 * typecheck/lint/vitest. Read those first.
 *
 * Prereqs: backend on :8000 (seeded dev DB at head), frontend on :5173.
 */

/** Waits for the room's first sync: `fill` refuses read-only content at once (#3191). */
async function fillBody(page: Page, text: string) {
  const content = page.locator('.cm-content').first()
  await expect(content).toHaveAttribute('contenteditable', 'true')
  await content.fill(text)
}

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
// Fresh accounts per run: a character holding a praxis on a task can't join another.
const RUN = Date.now().toString(36)

const scenarioFor = (browser: Browser): Scenario<BrowserContext> => ({
  browser,
  api: API,
  run: RUN,
})

const closeDraft = async (draft: CollabDraft<BrowserContext>): Promise<void> => {
  await draft.creator.ctx.close()
  await draft.invitee.ctx.close()
}

// Serial: shared dev DB with interdependent gates (bank cap, one membership
// per task, invite uniqueness).
test.describe.configure({ mode: 'serial' })
// No retries (#2453): a retry hid a real seed fault.
test.describe.configure({ retries: 0 })

test.describe('collaboration lifecycle', () => {
  test('full lifecycle publishes the praxis with both players as members', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'life')
    try {
      expect(await bothSubmit(draft)).toBe('submitted')

      const praxis = await fetchPraxis(draft.creator, draft.praxisId)
      const names = praxis.members.map((member) => member.character_display_name).sort()
      expect(names).toEqual([draft.creator.name, draft.invitee.name].sort())
      expect(praxis.members.every((member) => member.has_submitted)).toBe(true)

      const page = await draft.creator.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}`)
      await expect(page.getByRole('heading', { name: `Collab life` })).toBeVisible()
      // Scoped to main: the name also appears in nav + sidebar.
      await expect(page.getByRole('main').getByRole('link', { name: draft.creator.name })).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })

  test('the creator sees the shared draft in their active-tasks sidebar', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'side-a')
    try {
      const page = await draft.creator.ctx.newPage()
      await page.goto('/')
      // Scoped to the panel (#1676): the task also appears under "Recent
      // activity", legitimately; `.first()` would stop asserting WHICH section.
      // `exact` excludes the "Collapse In progress tasks" control.
      const inProgress = page.getByLabel('In progress tasks', { exact: true })
      await expect(inProgress.locator(`a[href="/praxis/${draft.praxisId}/edit"]`)).toBeVisible()
      await expect(inProgress.getByText(draft.task.title)).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })

  // #344: useMyActiveTasks filters by membership, not creator.
  test('the invitee ALSO sees the shared draft in their active-tasks sidebar', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'side-b')
    try {
      const page = await draft.invitee.ctx.newPage()
      await page.goto('/')
      const sidebar = page.locator('aside')
      await expect(sidebar.locator(`a[href="/praxis/${draft.praxisId}/edit"]`)).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })

  // KNOWN GAP: archetypes render only the creator byline, never `praxis.members`.
  test('the published praxis page credits both collaborators', async ({ browser }) => {
    test.fail()
    const draft = await seedCollabDraft(scenarioFor(browser), 'credit')
    try {
      await bothSubmit(draft)
      const page = await draft.invitee.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}`)
      // Main only: the viewer's own name shows in the chrome regardless.
      await expect(page.getByRole('main').getByText(draft.invitee.name)).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })
})

/*
 * UI-driven collab flow (#955): every collab action is a real click; only
 * dev-login and GET /tasks stay on the API.
 *
 * No faction copy (#2453): `selectOpenTask` doesn't fix the task's faction, so
 * press test ids, not labels. `Collab` is the one label kept: every archetype
 * reads the shared `editPraxis.composer.modeCollab` key, and
 * `src/__tests__/e2eAnchors.test.ts` guards it.
 */

const COLLAB_MODE = 'Collab'

test.describe('collaboration UI (clicked buttons)', () => {
  test('create via ModePicker, invite, accept, cast, and publish', async ({ browser }) => {
    const scenario = scenarioFor(browser)
    const alice = await loginPlayer(scenario, 'ua', COLLAB_CREATOR_LEVEL)
    const bob = await loginPlayer(scenario, 'ub', COLLAB_INVITEE_LEVEL)
    const task = selectOpenTask(await fetchTasks(alice))
    try {
      // 1. Alice signs up → solo composer.
      const aPage = await alice.ctx.newPage()
      await aPage.goto(`/tasks/${task.id}`)
      await aPage.getByTestId('task-signup-cta').click()
      await aPage.waitForURL(/\/praxis\/\d+\/edit/)
      const praxisId = Number(aPage.url().match(/\/praxis\/(\d+)\/edit/)![1])

      // 2. Flip solo → collab through the ModePicker.
      await aPage.getByRole('button', { name: COLLAB_MODE, exact: true }).click()

      // 3. Invite Bob. The search box sits behind the `+ invite` chip (#1417).
      await aPage.getByTestId('composer-invite-open').click()
      await aPage.getByTestId('composer-invite-search').fill(bob.name)
      await aPage.getByRole('listbox').getByRole('button', { name: bob.name }).click()
      await expect(aPage.getByText(bob.name)).toBeVisible()

      // 4. Bob accepts from Updates → Requests; lands on the shared composer.
      const bPage = await bob.ctx.newPage()
      await bPage.goto('/updates?filter=requests')
      await bPage.getByRole('main').getByRole('button', { name: 'Accept' }).click()
      await bPage.waitForURL(/\/praxis\/\d+\/edit/)

      // 5. Both write BEFORE either proposes: an edit after a proposal cancels
      //    it (ADR-0079).
      await fillBody(bPage, 'Bob weaves his part')
      await aPage.goto(`/praxis/${praxisId}/edit`)
      // Sign-up mints an untitled praxis, and publish() silently refuses one
      // after the confirm is dismissed (#2453).
      await aPage.getByTestId('praxis-title').fill(`Collab ui-${RUN}`)
      await fillBody(aPage, 'Alice weaves her part')

      // Wait for the debounced room flush (`_FLUSH_DEBOUNCE_SECONDS`, 2s): it
      // fires `on_room_edit`, which would cancel an earlier propose. `body_text`
      // on the record is the only observable.
      await expect
        .poll(async () => (await fetchPraxis(alice, praxisId)).body_text, {
          timeout: 15_000,
          message: 'the praxis room never flushed to the record',
        })
        .toContain('Alice weaves her part')

      // 6. Alice proposes. `data-collab-signal`, not catalog labels.
      const aPrimary = aPage.getByTestId('composer-primary')
      await expect(aPrimary).toHaveAttribute('data-collab-signal', 'propose')
      await aPrimary.click()
      const confirm = aPage.getByTestId('confirm-dialog')
      await expect(confirm).toHaveAttribute('data-confirm-kind', 'proposePublish')
      await confirm.getByTestId('confirm-accept').click()

      // 7. Bob is the last approval outstanding, so his press publishes.
      await bPage.goto(`/praxis/${praxisId}/edit`)
      const bPrimary = bPage.getByTestId('composer-primary')
      await expect(bPrimary).toHaveAttribute('data-collab-signal', 'approve')
      await bPrimary.click()

      await expect(bPage.getByTestId('collab-success')).toBeVisible()

      // 8. Published praxis shows the creator byline.
      const view = await alice.ctx.newPage()
      await view.goto(`/praxis/${praxisId}`)
      await expect(
        view.getByRole('main').getByRole('link', { name: alice.name }),
      ).toBeVisible()
    } finally {
      await alice.ctx.close()
      await bob.ctx.close()
    }
  })

  // C1 (#959)
  test('C1: a member can kick a co-author from the roster pill', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'ui-kick')
    try {
      const page = await draft.creator.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}/edit`)
      const kick = page.getByRole('button', {
        name: forms.editPraxis.invite.kickMemberAria.replace('{{name}}', draft.invitee.name),
      })
      await kick.click()
      await page.getByTestId('confirm-accept').click()
      await expect(kick).toBeHidden()
      const after = await fetchPraxis(draft.creator, draft.praxisId)
      expect(after.members.map((m) => m.character_id)).not.toContain(draft.invitee.characterId)
    } finally {
      await closeDraft(draft)
    }
  })

  // C2 (#958)
  test('C2: a member can leave the collab from a standalone control', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'ui-leave')
    try {
      const page = await draft.invitee.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}/edit`)
      await page.getByRole('button', { name: forms.editPraxis.leaveAction }).click()
      await page.getByTestId('confirm-accept').click()
      await page.waitForURL('**/tasks')
      const after = await fetchPraxis(draft.creator, draft.praxisId)
      expect(after.members.map((m) => m.character_id)).not.toContain(draft.invitee.characterId)
    } finally {
      await closeDraft(draft)
    }
  })

  // C3 (#958): the holdout must not get the owner unsubmit control (it 422s).
  test('C3: a holdout on a pending collab is not shown the unsubmit control', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'ui-holdout')
    try {
      await submitPraxis(draft.creator, draft.praxisId)
      const page = await draft.invitee.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}`)
      // A pending collab opens in the composer, where "unsubmit" is the waiting
      // surface's edit act; the detail page's own control is only for published praxes.
      const reopen = forms.editPraxis.collab.awaitingEditAction
      const unsubmit = praxisCopy.detail.owner.unsubmit
      const creatorPage = await draft.creator.ctx.newPage()
      await creatorPage.goto(`/praxis/${draft.praxisId}`)
      await expect(creatorPage.getByRole('button', { name: reopen })).toBeVisible()

      // The count checks pass vacuously before the surface draws: wait for the holdout's composer.
      await expect(page.getByTestId('composer-primary')).toBeVisible()
      await expect(page.getByRole('button', { name: reopen })).toHaveCount(0)
      await expect(page.getByRole('button', { name: unsubmit, exact: true })).toHaveCount(0)
    } finally {
      await closeDraft(draft)
    }
  })

  // C4 (#960): the Requests queue (ADR-0070) shows one card, newest first, so
  // the oldest of six is five "Still waiting" presses away.
  test('C4: the oldest of six pending invites is still reachable', async ({ browser }) => {
    const seeded = await seedPendingInvites(scenarioFor(browser), 6)
    try {
      const page = await seeded.invitee.ctx.newPage()
      await page.goto('/updates')
      const queue = page.getByRole('region', { name: 'Requests' })
      await expect(queue.getByRole('button', { name: /6 left/ })).toBeVisible()
      for (let skipped = 0; skipped < 5; skipped++) {
        await queue.getByRole('button', { name: 'Still waiting' }).click()
      }
      await expect(queue.getByText(seeded.tasks[0].title).first()).toBeVisible()
      await expect(queue.getByRole('button', { name: 'Accept', exact: true })).toBeVisible()
    } finally {
      await seeded.inviter.ctx.close()
      await seeded.invitee.ctx.close()
    }
  })
})

/**
 * Presence (#1744): two live browsers drawing each other's caret (unit tests
 * cover the rest). `y-codemirror.next` skips the local client, so each page
 * sees only the OTHER caret.
 */
test.describe('presence: carets and the roster dot', () => {
  test('P1: each member sees the other caret, and it goes when they leave', async ({
    browser,
  }) => {
    test.setTimeout(90_000)
    const draft = await seedCollabDraft(scenarioFor(browser), 'presence')
    try {
      const aPage = await draft.creator.ctx.newPage()
      const bPage = await draft.invitee.ctx.newPage()
      await aPage.goto(`/praxis/${draft.praxisId}/edit`)
      await bPage.goto(`/praxis/${draft.praxisId}/edit`)

      // A caret exists only once its owner's cursor is in the document.
      await fillBody(aPage, 'Alice is typing')
      await fillBody(bPage, 'Bob is typing')

      await expect(aPage.locator('.cm-ySelectionCaret')).toHaveCount(1)
      await expect(aPage.locator('.cm-ySelectionInfo')).toHaveText(draft.invitee.name)
      await expect(bPage.locator('.cm-ySelectionInfo')).toHaveText(draft.creator.name)

      await expect(
        aPage.getByRole('img', { name: `${draft.invitee.name} is here now` }),
      ).toBeVisible()

      await bPage.close()
      await expect(aPage.locator('.cm-ySelectionCaret')).toHaveCount(0, { timeout: 5_000 })
      await expect(
        aPage.getByRole('img', { name: `${draft.invitee.name} is here now` }),
      ).toHaveCount(0)
    } finally {
      await closeDraft(draft)
    }
  })

  // ADR-0073: no presence chrome for an audience of one.
  test('P2: a solo author alone in their room draws no caret', async ({ browser }) => {
    const scenario = scenarioFor(browser)
    const solo = await loginPlayer(scenario, 'p', COLLAB_INVITEE_LEVEL)
    const task = selectOpenTask(await fetchTasks(solo))
    try {
      const praxis = await createPraxis(solo, {
        task_id: task.id,
        type: 'solo',
        title: `Solo ${RUN}`,
        body_text: 'draft',
      })

      const page = await solo.ctx.newPage()
      await page.goto(`/praxis/${praxis.id}/edit`)
      await fillBody(page, 'Just me in here')
      await expect(page.locator('.cm-ySelectionCaret')).toHaveCount(0)
      await expect(page.getByRole('img', { name: /is here now/ })).toHaveCount(0)
    } finally {
      await solo.ctx.close()
    }
  })
})
