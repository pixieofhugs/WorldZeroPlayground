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
