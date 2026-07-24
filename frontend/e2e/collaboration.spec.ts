import { test, expect, type Browser, type BrowserContext } from '@playwright/test'

/**
 * Collaboration praxis lifecycle — two real logged-in characters on one task.
 *
 * Auth: the dev-only bot-login (POST /auth/dev-login) is extended with query
 * params so one call mints a distinct account + a leveled character:
 *   ?key=<id>&name=<display>&level=<n>
 * Collab CREATION requires level >= era.collaboration_level_required (1 in Era 1),
 * so the creator ("Alice") is seeded at level 1; the invitee ("Bob") needs no level.
 *
 * Mechanics (create / invite / accept / edit / submit) run against the real API
 * with each character's own cookies; the assertions the user cares about are made
 * against the real PAGES (praxis detail, FieldDesk sidebar).
 *
 * Prereqs: backend on :8000 (seeded dev DB at head), frontend on :5173.
 */

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'
// Unique per run so every test gets fresh accounts — no cross-run state bleed
// (a character that already holds a praxis on the task can't create/join another).
const RUN = Date.now().toString(36)

interface Player {
  ctx: BrowserContext
  characterId: number
  name: string
}

/** Bot-login in a fresh browser context; returns the context + seeded character. */
async function login(browser: Browser, key: string, name: string, level: number): Promise<Player> {
  const ctx = await browser.newContext()
  const res = await ctx.request.post(
    `${API}/auth/dev-login?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&level=${level}`,
  )
  expect(res.ok(), `dev-login failed for ${key} — is the backend up on ${API}?`).toBeTruthy()
  const body = await res.json()
  return { ctx, characterId: body.character_id, name }
}

/** First active task that any level-0 character may attempt. */
async function pickOpenTask(player: Player): Promise<{ id: number; title: string }> {
  const res = await player.ctx.request.get(`${API}/tasks`)
  const tasks = await res.json()
  const task = tasks.find((t: any) => (t.level_required ?? 0) === 0)
  expect(task, 'no level-0 task in the seeded DB — run backend/seed.py').toBeTruthy()
  return { id: task.id, title: task.title }
}

/**
 * Seed a collab draft: Alice (creator, L1) creates a collab praxis on a fresh
 * task, invites Bob (L0), Bob accepts. Returns both players + the draft, still
 * in_progress. `suffix` keeps this test's accounts distinct from other tests'.
 */
let pairSeq = 0

async function seedCollabDraft(browser: Browser, suffix: string) {
  // Short, unique names: the derived @handle truncates to 14 chars, so the
  // distinguishing token must come first (role letter + seq) to avoid collisions
  // between concurrently-created characters.
  const s = pairSeq++
  const alice = await login(browser, `a-${RUN}-${s}`, `A${s}-${RUN}`, 1)
  const bob = await login(browser, `b-${RUN}-${s}`, `B${s}-${RUN}`, 0)
  const task = await pickOpenTask(alice)

  const created = await alice.ctx.request.post(`${API}/praxes`, {
    data: { task_id: task.id, type: 'collab', title: `Collab ${suffix}`, body_text: 'draft' },
  })
  expect(created.ok(), `collab create failed: ${await created.text()}`).toBeTruthy()
  const praxis = await created.json()

  const invited = await alice.ctx.request.post(`${API}/praxes/${praxis.id}/invite`, {
    data: { invitee_id: bob.characterId },
  })
  expect(invited.ok(), `invite failed: ${await invited.text()}`).toBeTruthy()
  const invite = await invited.json()

  const accepted = await bob.ctx.request.post(
    `${API}/praxes/${praxis.id}/invite/${invite.id}/respond`,
    { data: { accept: true } },
  )
  expect(accepted.ok(), `accept failed: ${await accepted.text()}`).toBeTruthy()

  return { alice, bob, task, praxisId: praxis.id as number }
}

/** Both members edit then submit; consensus seals to `submitted` on the last submit. */
async function bothEditAndSubmit(seed: Awaited<ReturnType<typeof seedCollabDraft>>) {
  const { alice, bob, praxisId } = seed
  await alice.ctx.request.put(`${API}/praxes/${praxisId}`, { data: { body_text: 'Alice contribution' } })
  await bob.ctx.request.put(`${API}/praxes/${praxisId}`, { data: { body_text: 'Alice + Bob contribution' } })
  await alice.ctx.request.post(`${API}/praxes/${praxisId}/submit`)
  const last = await bob.ctx.request.post(`${API}/praxes/${praxisId}/submit`)
  return (await last.json()).status as string
}

// Serial: these tests mutate one shared dev DB with interdependent gates
// (bank cap, one-active-membership-per-task, invite uniqueness). Parallel workers
// race on that shared state; run them one at a time.
test.describe.configure({ mode: 'serial' })

test.describe('collaboration lifecycle', () => {
  test('full lifecycle publishes the praxis with both players as members', async ({ browser }) => {
    const seed = await seedCollabDraft(browser, 'life')
    try {
      const status = await bothEditAndSubmit(seed)
      expect(status).toBe('submitted')

      // Data: the published praxis records BOTH collaborators as members.
      const detail = await seed.alice.ctx.request.get(`${API}/praxes/${seed.praxisId}`)
      const praxis = await detail.json()
      const names = praxis.members.map((m: any) => m.character_display_name).sort()
      expect(names).toEqual([seed.alice.name, seed.bob.name].sort())
      expect(praxis.members.every((m: any) => m.has_submitted)).toBe(true)

      // Page: the published praxis renders on its detail page.
      const page = await seed.alice.ctx.newPage()
      await page.goto(`/praxes/${seed.praxisId}`)
      await expect(page.getByRole('heading', { name: `Collab life` })).toBeVisible()
      // Creator byline (scope to main — the name also appears in nav + sidebar card).
      await expect(page.getByRole('main').getByRole('link', { name: seed.alice.name })).toBeVisible()
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })

  test('the creator sees the shared draft in their active-tasks sidebar', async ({ browser }) => {
    const seed = await seedCollabDraft(browser, 'side-a')
    try {
      const page = await seed.alice.ctx.newPage()
      await page.goto('/')
      const sidebar = page.locator('aside')
      await expect(sidebar.locator(`a[href="/praxes/${seed.praxisId}/edit"]`)).toBeVisible()
      await expect(sidebar.getByText(seed.task.title)).toBeVisible()
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })

  // Fixed (#344/#349): useMyActiveTasks now filters by membership
  // (GET /praxes?member_id=), so an invitee who JOINED the draft sees it too.
  test('the invitee ALSO sees the shared draft in their active-tasks sidebar', async ({ browser }) => {
    const seed = await seedCollabDraft(browser, 'side-b')
    try {
      const page = await seed.bob.ctx.newPage()
      await page.goto('/')
      const sidebar = page.locator('aside')
      await expect(sidebar.locator(`a[href="/praxes/${seed.praxisId}/edit"]`)).toBeVisible()
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })

  // KNOWN GAP (bug): every praxis-detail archetype renders only
  // `created_by_display_name` (single creator byline) and never iterates
  // `praxis.members`, so a collaborator is not credited on the published page.
  // Intended behaviour: both collaborators are shown. Expected to fail until an
  // archetype renders the member list.
  test('the published praxis page credits both collaborators', async ({ browser }) => {
    test.fail()
    const seed = await seedCollabDraft(browser, 'credit')
    try {
      await bothEditAndSubmit(seed)
      const page = await seed.bob.ctx.newPage()
      await page.goto(`/praxes/${seed.praxisId}`)
      // Scope to main: the collaborator's name must appear in the praxis CONTENT,
      // not merely in the nav/sidebar chrome (where the logged-in viewer's own
      // name shows regardless).
      await expect(page.getByRole('main').getByText(seed.bob.name)).toBeVisible()
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })
})

/* ==========================================================================
 * UI-DRIVEN collab flow (#955) — every collab action goes through a REAL
 * clicked button. Only account scaffolding (dev-login) and the task lookup
 * (GET /tasks) stay on the API; there are no real buttons for those.
 *
 * The seed's only level-0 task is Snide-faction ("FLIP THE SYSTEM"), so the
 * composer, task page, and cast button render the SNIDE archetype. The labels
 * below are that faction's voiced copy; the invite-search box, the feed Accept
 * button, and the detail-page unsubmit control are shared (faction-invariant)
 * strings from the `forms`/`feed`/`praxis` catalogs.
 *
 * The four red steps (C1–C4) are `test.fail()` — the button is missing or
 * wrong today, and the named fix issue flips each one green (deletes its
 * `test.fail()`). See #953 for the full action → button investigation.
 * ========================================================================== */

// Snide (the level-0 task's faction) control labels.
const SNIDE_SIGNUP = /PULL THIS JOB/i //   task page: create the draft
const SNIDE_COLLAB_MODE = /THE GANG/i //   ModePicker: the collab option
const SNIDE_CAST = /count me in/i //       PublishButton: cast + cast-final

/** First `count` distinct-titled tasks any high-level character may attempt. */
async function pickTasks(
  player: Player,
  count: number,
): Promise<Array<{ id: number; title: string }>> {
  const res = await player.ctx.request.get(`${API}/tasks`)
  const tasks = await res.json()
  const seen = new Set<string>()
  const usable: Array<{ id: number; title: string }> = []
  for (const task of tasks as any[]) {
    if ((task.level_required ?? 0) > 8) continue
    if (seen.has(task.title)) continue
    seen.add(task.title)
    usable.push({ id: task.id, title: task.title })
    if (usable.length === count) break
  }
  expect(
    usable.length,
    `need ${count} distinct seeded tasks for the >5-invite test`,
  ).toBe(count)
  return usable
}

test.describe('collaboration UI (clicked buttons)', () => {
  // The happy path drives create → invite → accept → cast → publish entirely
  // through real buttons. It stays green: every control on this path ships today.
  test('create via ModePicker, invite, accept, cast, and publish', async ({ browser }) => {
    const s = pairSeq++
    const alice = await login(browser, `ua-${RUN}-${s}`, `UA${s}-${RUN}`, 1)
    const bob = await login(browser, `ub-${RUN}-${s}`, `UB${s}-${RUN}`, 0)
    const task = await pickOpenTask(alice)
    try {
      // 1. Alice signs up on the task → lands on the (solo) composer.
      const aPage = await alice.ctx.newPage()
      await aPage.goto(`/tasks/${task.id}`)
      await aPage.getByRole('button', { name: SNIDE_SIGNUP }).click()
      await aPage.waitForURL(/\/praxes\/\d+\/edit/)
      const praxisId = Number(aPage.url().match(/\/praxes\/(\d+)\/edit/)![1])

      // 2. Flip solo → collab through the ModePicker.
      await aPage.getByRole('button', { name: SNIDE_COLLAB_MODE }).click()

      // 3. Invite Bob through the InviteSearch box (shared aria-label), picking
      //    his result from the live search dropdown.
      const search = aPage.getByRole('textbox', { name: 'search players to invite' })
      await search.fill(bob.name)
      await aPage.getByRole('listbox').getByRole('button', { name: bob.name }).click()
      // The pending-invite pill confirms the invite landed.
      await expect(aPage.getByText(bob.name)).toBeVisible()

      // 4. Bob accepts on the collab feed card (Requests tab of Updates). The
      //    accept navigates him onto the shared composer.
      const bPage = await bob.ctx.newPage()
      await bPage.goto('/updates?filter=requests')
      await bPage.getByRole('main').getByRole('button', { name: 'Accept' }).click()
      await bPage.waitForURL(/\/praxes\/\d+\/edit/)

      // 5. Both edit the body, then cast through the footer PublishButton.
      //    Alice reloads so her roster reflects Bob's membership (her cast label
      //    depends on the live member count) before she casts.
      await aPage.goto(`/praxes/${praxisId}/edit`)
      await aPage.locator('textarea').first().fill('Alice weaves her part')
      await aPage.getByRole('button', { name: SNIDE_CAST }).click()

      await bPage.goto(`/praxes/${praxisId}/edit`)
      await bPage.locator('textarea').first().fill('Bob weaves his part')
      await bPage.getByRole('button', { name: SNIDE_CAST }).click()

      // The last cast seals consensus → the closing beat renders for Bob.
      await expect(bPage.getByText(/out there/i)).toBeVisible()

      // 6. The published praxis renders on its detail page (creator byline in
      //    main — mirrors the green API-driven lifecycle assertion above).
      const view = await alice.ctx.newPage()
      await view.goto(`/praxes/${praxisId}`)
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
    const seed = await seedCollabDraft(browser, 'ui-kick')
    try {
      const page = await seed.alice.ctx.newPage()
      await page.goto(`/praxes/${seed.praxisId}/edit`)
      await expect(
        page.getByRole('button', {
          name: new RegExp(`(kick|remove).*${seed.bob.name}`, 'i'),
        }),
      ).toBeVisible()
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })

  // C2 (→ #958): a standalone "Leave collab" button on the composer. Today the
  // only way to leave is via the bank-full drop-to-accept modal, so a member
  // who simply wants out has no button.
  test('C2: a member can leave the collab from a standalone control', async ({ browser }) => {
    const seed = await seedCollabDraft(browser, 'ui-leave')
    try {
      const page = await seed.bob.ctx.newPage()
      await page.goto(`/praxes/${seed.praxisId}/edit`)
      await expect(page.getByRole('button', { name: /leave/i })).toBeVisible()
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })

  // C3 (→ #958): a holdout (hasn't cast) viewing a `pending` collab on the
  // detail page should see a CAST control. Today the page falls through to the
  // owner "unsubmit" control, which 422s because the holdout never submitted.
  test('C3: a holdout on a pending collab is not shown the unsubmit control', async ({ browser }) => {
    const seed = await seedCollabDraft(browser, 'ui-holdout')
    try {
      // Alice casts (API) → the collab enters `pending`; Bob is the holdout.
      await seed.alice.ctx.request.post(`${API}/praxes/${seed.praxisId}/submit`)
      const page = await seed.bob.ctx.newPage()
      await page.goto(`/praxes/${seed.praxisId}`)
      // The unsubmit control must NOT be offered to a member who never cast.
      await expect(
        page.getByRole('button', { name: 'unsubmit', exact: true }),
      ).toHaveCount(0)
    } finally {
      await seed.alice.ctx.close()
      await seed.bob.ctx.close()
    }
  })

  // C4 (→ #960): with more than 5 pending invites the oldest must stay
  // accept-reachable. The requests inbox (usePendingRequests) caps its fetch at
  // 5, so the sixth-oldest invite silently falls off with no other surface.
  test('C4: the oldest of six pending invites is still reachable', async ({ browser }) => {
    const s = pairSeq++
    const inviter = await login(browser, `ci-${RUN}-${s}`, `CI${s}-${RUN}`, 8)
    const bob = await login(browser, `cb-${RUN}-${s}`, `CB${s}-${RUN}`, 0)
    const tasks = await pickTasks(inviter, 6)
    try {
      // Six collabs, one per task, oldest first — all invite the same Bob.
      const oldestTaskTitle = tasks[0].title
      for (const task of tasks) {
        const created = await inviter.ctx.request.post(`${API}/praxes`, {
          data: { task_id: task.id, type: 'collab', title: `C4 ${task.id}`, body_text: 'x' },
        })
        expect(created.ok(), `collab create failed: ${await created.text()}`).toBeTruthy()
        const praxis = await created.json()
        const invited = await inviter.ctx.request.post(`${API}/praxes/${praxis.id}/invite`, {
          data: { invitee_id: bob.characterId },
        })
        expect(invited.ok(), `invite failed: ${await invited.text()}`).toBeTruthy()
      }
      const page = await bob.ctx.newPage()
      await page.goto('/')
      // Bob's pending-requests inbox lives in the sidebar; the oldest invite's
      // task must still show there (it's dropped by the limit-5 fetch today).
      await expect(page.locator('aside').getByText(oldestTaskTitle)).toBeVisible()
    } finally {
      await inviter.ctx.close()
      await bob.ctx.close()
    }
  })
})
