import { test, expect, type Browser, type BrowserContext } from '@playwright/test'

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
 * Collaboration praxis lifecycle — two real logged-in characters on one task.
 *
 * THIS FILE DECIDES NOTHING (#2888, finishing #1780 — Molly's ruling of
 * 2026-08-18: *"move `e2e/`'s logic into plain modules under the app's build
 * graph, keep the spec as a thin Playwright driver"*). It acquires pages,
 * presses buttons and asserts. Everything it used to embed — how a fixture
 * account is minted and named, which task a collab is seeded on, what "a draft
 * two people have joined" consists of, what a member's submit does — lives in
 * `src/utils/collabScenario.ts` and `src/utils/e2eScenario.ts`, under the app's
 * own build graph, where `tsc --noEmit`, `eslint src` and vitest reach it in a
 * PR rather than a browser reaching it at 3am. Read those two before changing
 * anything here.
 *
 * That move also killed the `t: any` this file drove the API with: every
 * response is now read as the app's own generated contract (`TaskOut`,
 * `PraxisOut`), so a schema regen reds the PR typecheck instead of a nightly.
 *
 * Auth: the dev-only bot-login (POST /auth/dev-login) mints a distinct account
 * plus a levelled character per call. Collab CREATION requires level >=
 * era.collaboration_level_required, so the creator is seeded at
 * COLLAB_CREATOR_LEVEL; the invitee needs none.
 *
 * Mechanics (create / invite / accept / submit) run against the real API with
 * each character's own cookies; the assertions the user cares about are made
 * against the real PAGES (praxis detail, FieldDesk sidebar).
 *
 * Prereqs: backend on :8000 (seeded dev DB at head), frontend on :5173.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
// Unique per run so every test gets fresh accounts — no cross-run state bleed
// (a character that already holds a praxis on the task can't create/join another).
const RUN = Date.now().toString(36)

/** The acquired half of a fixture: the test's browser, the backend, this run. */
const scenarioFor = (browser: Browser): Scenario<BrowserContext> => ({
  browser,
  api: API,
  run: RUN,
})

const closeDraft = async (draft: CollabDraft<BrowserContext>): Promise<void> => {
  await draft.creator.ctx.close()
  await draft.invitee.ctx.close()
}

// Serial: these tests mutate one shared dev DB with interdependent gates
// (bank cap, one-active-membership-per-task, invite uniqueness). Parallel workers
// race on that shared state; run them one at a time.
test.describe.configure({ mode: 'serial' })

test.describe('collaboration lifecycle', () => {
  test('full lifecycle publishes the praxis with both players as members', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'life')
    try {
      expect(await bothSubmit(draft)).toBe('submitted')

      // Data: the published praxis records BOTH collaborators as members.
      const praxis = await fetchPraxis(draft.creator, draft.praxisId)
      const names = praxis.members.map((member) => member.character_display_name).sort()
      expect(names).toEqual([draft.creator.name, draft.invitee.name].sort())
      expect(praxis.members.every((member) => member.has_submitted)).toBe(true)

      // Page: the published praxis renders on its detail page.
      const page = await draft.creator.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}`)
      await expect(page.getByRole('heading', { name: `Collab life` })).toBeVisible()
      // Creator byline (scope to main — the name also appears in nav + sidebar card).
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
      // Scoped to the panel, not the whole <aside> (#1676). The sidebar names
      // one task in two places — the draft under "In progress tasks"
      // (→ /praxis/{id}/edit) and the task under "Recent activity"
      // (→ /tasks/{id}) — so an aside-wide getByText is a strict-mode
      // violation. That is not the duplication bug it looks like: different
      // sections, different destinations, both correct. `.first()` would pass
      // by accident and stop asserting WHICH section the draft appears in,
      // which is the whole claim of this test. `exact` keeps the panel's own
      // collapse control ("Collapse In progress tasks") out of the match.
      const inProgress = page.getByLabel('In progress tasks', { exact: true })
      await expect(inProgress.locator(`a[href="/praxis/${draft.praxisId}/edit"]`)).toBeVisible()
      await expect(inProgress.getByText(draft.task.title)).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })

  // Fixed (#344/#349): useMyActiveTasks now filters by membership
  // (GET /praxes?member_id=), so an invitee who JOINED the draft sees it too.
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

  // KNOWN GAP (bug): every praxis-detail archetype renders only
  // `created_by_display_name` (single creator byline) and never iterates
  // `praxis.members`, so a collaborator is not credited on the published page.
  // Intended behaviour: both collaborators are shown. Expected to fail until an
  // archetype renders the member list.
  test('the published praxis page credits both collaborators', async ({ browser }) => {
    test.fail()
    const draft = await seedCollabDraft(scenarioFor(browser), 'credit')
    try {
      await bothSubmit(draft)
      const page = await draft.invitee.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}`)
      // Scope to main: the collaborator's name must appear in the praxis CONTENT,
      // not merely in the nav/sidebar chrome (where the logged-in viewer's own
      // name shows regardless).
      await expect(page.getByRole('main').getByText(draft.invitee.name)).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })
})

/* ==========================================================================
 * UI-DRIVEN collab flow (#955) — every collab action goes through a REAL
 * clicked button. Only account scaffolding (dev-login) and the task lookup
 * (GET /tasks) stay on the API; there are no real buttons for those.
 *
 * NO FACTION COPY, AND NO COPY AT ALL WHERE A SLOT WILL DO (#2453). This block
 * used to quote three Snide-voiced strings — /PULL THIS JOB/i, /THE GANG/i and
 * a cast label — on the reasoning that the seed's only level-0 task is
 * Snide-faction. Two of those strings are in no catalog anywhere in this repo
 * and have not been for weeks, and `selectOpenTask` never guaranteed the faction
 * in the first place: it returns whichever level-0 task the API lists first, so
 * a seed edit silently re-skins every control this spec presses. The `Collab`
 * mode chip is the one label kept, because every archetype builds its chips from
 * the SAME shared key (`editPraxis.composer.modeCollab`) — exactly as
 * duel.helpers.ts presses `Duel` — and `src/__tests__/e2eAnchors.test.ts` fails
 * the PR-blocking suite if either word moves.
 *
 * The four red steps (C1–C4) are `test.fail()` — the button is missing or
 * wrong today, and the named fix issue flips each one green (deletes its
 * `test.fail()`). See #953 for the full action → button investigation.
 * ========================================================================== */

// The collab option on the ModePicker. Shared across all eight archetypes; see
// the block comment above for why this one stays a label.
const COLLAB_MODE = 'Collab'

test.describe('collaboration UI (clicked buttons)', () => {
  // The happy path drives create → invite → accept → cast → publish entirely
  // through real buttons. It stays green: every control on this path ships today.
  test('create via ModePicker, invite, accept, cast, and publish', async ({ browser }) => {
    const scenario = scenarioFor(browser)
    const alice = await loginPlayer(scenario, 'ua', COLLAB_CREATOR_LEVEL)
    const bob = await loginPlayer(scenario, 'ub', COLLAB_INVITEE_LEVEL)
    const task = selectOpenTask(await fetchTasks(alice))
    try {
      // 1. Alice signs up on the task → lands on the (solo) composer. By slot:
      //    all eight task-detail archetypes render one sign-up control, and
      //    since #1497 they all read the SAME shared label out of `signupCta.ts`
      //    — so the faction-voiced string this line used to quote had not
      //    existed anywhere in the app for weeks (#2453).
      const aPage = await alice.ctx.newPage()
      await aPage.goto(`/tasks/${task.id}`)
      await aPage.getByTestId('task-signup-cta').click()
      await aPage.waitForURL(/\/praxis\/\d+\/edit/)
      const praxisId = Number(aPage.url().match(/\/praxis\/(\d+)\/edit/)![1])

      // 2. Flip solo → collab through the ModePicker.
      await aPage.getByRole('button', { name: COLLAB_MODE, exact: true }).click()

      // 3. Invite Bob. The search box is a DISCLOSURE since #1417 — it sits
      //    behind the `+ invite` chip rather than holding a permanent row of the
      //    composer — which is what hung this test for thirty seconds and then
      //    took the whole serial file down with it. Open the chip, then search.
      await aPage.getByTestId('composer-invite-open').click()
      await aPage.getByTestId('composer-invite-search').fill(bob.name)
      await aPage.getByRole('listbox').getByRole('button', { name: bob.name }).click()
      // The roster's pending-invite row confirms the invite landed.
      await expect(aPage.getByText(bob.name)).toBeVisible()

      // 4. Bob accepts on the collab feed card (Requests tab of Updates). The
      //    accept navigates him onto the shared composer.
      const bPage = await bob.ctx.newPage()
      await bPage.goto('/updates?filter=requests')
      await bPage.getByRole('main').getByRole('button', { name: 'Accept' }).click()
      await bPage.waitForURL(/\/praxis\/\d+\/edit/)

      // 5. Both write their part. BOTH BEFORE EITHER PROPOSES: since ADR-0079
      //    (#1811) the first keystroke after a proposal goes live cancels it, so
      //    editing between the propose and the approve would loop this step for
      //    ever. The old "cast, cast" pair predates that redesign entirely.
      //    The body is a CodeMirror editor bound to the praxis room since #1742,
      //    not a textarea. Playwright fills a contenteditable, and auto-waits for
      //    it to become editable -- which is the room finishing its first sync.
      await bPage.locator('.cm-content').first().fill('Bob weaves his part')
      await aPage.goto(`/praxis/${praxisId}/edit`)
      // Title first, and typed rather than posted: `handleSignup` creates the
      // praxis with a task id and a type and NOTHING else, and `publish()`
      // refuses an untitled praxis client-side (`errors.titleRequired`) — after
      // the propose confirm has already been dismissed, so the refusal was
      // invisible and Alice's proposal simply never existed (#2453).
      await aPage.getByTestId('praxis-title').fill(`Collab ui-${RUN}`)
      await aPage.locator('.cm-content').first().fill('Alice weaves her part')

      // Let the room's debounced flush land BEFORE proposing. The document is
      // written to the record on a trailing-edge debounce
      // (`praxis_room._FLUSH_DEBOUNCE_SECONDS`, 2s) and that same flush is what
      // fires `on_room_edit` — so a propose issued within the window is
      // cancelled two seconds later by the player's own last keystroke, and Bob
      // arrives to find no proposal to approve. `body_text` reaching the record
      // is the flush; there is no other observable for it.
      await expect
        .poll(async () => (await fetchPraxis(alice, praxisId)).body_text, {
          timeout: 15_000,
          message: 'the praxis room never flushed to the record',
        })
        .toContain('Alice weaves her part')

      // 6. Alice proposes publishing. `data-collab-signal` says which of the two
      //    acts the one primary slot performs — the labels ("Propose publishing"
      //    / "Approve — this one publishes it") are catalog copy and the whole
      //    vocabulary was replaced once already by #1811.
      const aPrimary = aPage.getByTestId('composer-primary')
      await expect(aPrimary).toHaveAttribute('data-collab-signal', 'propose')
      await aPrimary.click()
      // Propose is the one of the three that asks first: it starts a clock on
      // everybody else (composerConfirms.proposePublishConfirm).
      const confirm = aPage.getByTestId('confirm-dialog')
      await expect(confirm).toHaveAttribute('data-confirm-kind', 'proposePublish')
      await confirm.getByTestId('confirm-accept').click()

      // 7. Bob is the last approval outstanding, so his press publishes.
      await bPage.goto(`/praxis/${praxisId}/edit`)
      const bPrimary = bPage.getByTestId('composer-primary')
      await expect(bPrimary).toHaveAttribute('data-collab-signal', 'approve')
      await bPrimary.click()

      // The last approval seals consensus → the closing beat renders for Bob.
      await expect(bPage.getByTestId('collab-success')).toBeVisible()

      // 8. The published praxis renders on its detail page (creator byline in
      //    main — mirrors the green API-driven lifecycle assertion above).
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

  // C1 (→ #959): a kick control on another member's roster pill removes them.
  // CollabRoster renders member pills but ships NO kick affordance, so
  // POST /praxes/{id}/kick/{member_id} is unreachable from the UI.
  test('C1: a member can kick a co-author from the roster pill', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'ui-kick')
    try {
      const page = await draft.creator.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}/edit`)
      await expect(
        page.getByRole('button', {
          name: new RegExp(`(kick|remove).*${draft.invitee.name}`, 'i'),
        }),
      ).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })

  // C2 (→ #958): a standalone "Leave collab" button on the composer. Today the
  // only way to leave is via the bank-full drop-to-accept modal, so a member
  // who simply wants out has no button.
  test('C2: a member can leave the collab from a standalone control', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'ui-leave')
    try {
      const page = await draft.invitee.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}/edit`)
      await expect(page.getByRole('button', { name: /leave/i })).toBeVisible()
    } finally {
      await closeDraft(draft)
    }
  })

  // C3 (→ #958): a holdout (hasn't cast) viewing a `pending` collab on the
  // detail page should see a CAST control. Today the page falls through to the
  // owner "unsubmit" control, which 422s because the holdout never submitted.
  test('C3: a holdout on a pending collab is not shown the unsubmit control', async ({ browser }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'ui-holdout')
    try {
      // The creator casts (API) → the collab enters `pending`; the invitee is
      // the holdout.
      await submitPraxis(draft.creator, draft.praxisId)
      const page = await draft.invitee.ctx.newPage()
      await page.goto(`/praxis/${draft.praxisId}`)
      // The unsubmit control must NOT be offered to a member who never cast.
      //
      // KNOWN VACUOUS, DELIBERATELY LEFT (#2453 → #1795). `exact: true` against
      // the bare word cannot match: the control reads `praxis.owner.unsubmit`,
      // "unsubmit to edit". So this line has been green by matching nothing —
      // the #2452 shape. It is not re-anchored here because this test has never
      // once executed (the file's head failed before it), so tightening it now
      // would be predicting its result rather than reading it, and a newly-red
      // C3 would suppress C4 and both presence tests all over again. #2453's job
      // is to make these eight RUN; triaging what they then say is #1795's.
      await expect(
        page.getByRole('button', { name: 'unsubmit', exact: true }),
      ).toHaveCount(0)
    } finally {
      await closeDraft(draft)
    }
  })

  // C4 (→ #960): with more than 5 pending invites the oldest must stay
  // accept-reachable. The requests inbox (usePendingRequests) caps its fetch at
  // 5, so the sixth-oldest invite silently falls off with no other surface.
  test('C4: the oldest of six pending invites is still reachable', async ({ browser }) => {
    const seeded = await seedPendingInvites(scenarioFor(browser), 6)
    try {
      const page = await seeded.invitee.ctx.newPage()
      await page.goto('/')
      // The invitee's pending-requests inbox lives in the sidebar; the oldest
      // invite's task must still show there (it's dropped by the limit-5 fetch
      // today).
      await expect(page.locator('aside').getByText(seeded.tasks[0].title)).toBeVisible()
    } finally {
      await seeded.inviter.ctx.close()
      await seeded.invitee.ctx.close()
    }
  })
})

/**
 * Presence (#1744) — the only assertions in this repo that can see a caret.
 *
 * Everything else about presence is unit-testable: the derivation, the paint
 * and the sanitizing proxy in `roomPresence.test.ts`, the roster dot in
 * `CollabRoster.test.tsx`. What no unit test can reach is the actual claim —
 * that two real browsers in one room draw each other, and that closing one
 * takes its caret away. That needs two contexts, a live WebSocket and the
 * CodeMirror plugin, so it lives here (nightly, `.github/workflows/e2e.yml`).
 *
 * Locators are the library's own class names: `.cm-ySelectionCaret` is the
 * widget span, `.cm-ySelectionInfo` the hover label carrying the name. Each
 * page sees only the OTHER player's caret — `y-codemirror.next` skips the local
 * client id, which is also why a solo author alone in their room draws nothing.
 */
test.describe('presence: carets and the roster dot', () => {
  test('P1: each member sees the other caret, and it goes when they leave', async ({
    browser,
  }) => {
    const draft = await seedCollabDraft(scenarioFor(browser), 'presence')
    try {
      const aPage = await draft.creator.ctx.newPage()
      const bPage = await draft.invitee.ctx.newPage()
      await aPage.goto(`/praxis/${draft.praxisId}/edit`)
      await bPage.goto(`/praxis/${draft.praxisId}/edit`)

      // A caret exists only once its owner's cursor is IN the document, so both
      // have to put a selection there. `fill` auto-waits on the editor becoming
      // editable, which is the room finishing its first sync.
      await aPage.locator('.cm-content').first().fill('Alice is typing')
      await bPage.locator('.cm-content').first().fill('Bob is typing')

      // The creator sees exactly one remote caret: the invitee's, labelled with
      // their name.
      await expect(aPage.locator('.cm-ySelectionCaret')).toHaveCount(1)
      await expect(aPage.locator('.cm-ySelectionInfo')).toHaveText(draft.invitee.name)
      await expect(bPage.locator('.cm-ySelectionInfo')).toHaveText(draft.creator.name)

      // The roster's live dot names the same fact in words, on the invitee's row.
      await expect(
        aPage.getByRole('img', { name: `${draft.invitee.name} is here now` }),
      ).toBeVisible()

      // Presence is ephemeral: closing the tab closes the socket, and the caret
      // must go with it. This is the half that distinguishes "he's not here"
      // from the persistent workflow state beside it.
      await bPage.close()
      await expect(aPage.locator('.cm-ySelectionCaret')).toHaveCount(0)
      await expect(
        aPage.getByRole('img', { name: `${draft.invitee.name} is here now` }),
      ).toHaveCount(0)
    } finally {
      await closeDraft(draft)
    }
  })

  // Presence chrome must not appear for an audience of one (ADR-0073). Nothing
  // gates on the praxis type: the plugin skips the local client, so a solo
  // author is alone in a room that draws nobody.
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
      await page.locator('.cm-content').first().fill('Just me in here')
      await expect(page.locator('.cm-ySelectionCaret')).toHaveCount(0)
      // And no roster at all, which `CollabRoster` already gates on positively.
      await expect(page.getByRole('img', { name: /is here now/ })).toHaveCount(0)
    } finally {
      await solo.ctx.close()
    }
  })
})
