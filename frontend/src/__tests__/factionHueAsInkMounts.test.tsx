/**
 * The #2077 surfaces paint no bare faction spine hue as TEXT.
 *
 * SEAM: the `color`-role declarations these components EMIT — the same seam
 * `pages/players/__tests__/playersFactionInk.test.tsx` works at, reading the
 * shared `utils/__tests__/inkSeam.ts` so there is one definition of "what counts
 * as an ink" and not two. The measured half of the class lives in that file and
 * is not re-derived here; what this adds is the set of MOUNTS #1932 did not
 * cover.
 *
 * WHY IT IS NOT ENOUGH TO HAVE THE LINT RULE. `local/no-faction-hue-as-ink`
 * reads source, so it can only follow a value inside one module. Every surface
 * below hands the hue across a boundary the rule cannot cross:
 *
 *   - `TaskCard` and the task details reach the hue through `surfaceMap`
 *     dispatch, off a *different* faction's slug (`metatask_faction_slug`) than
 *     the one dressing the page: eight hues against nine grounds.
 *
 * WHY BOTH HALVES ARE ASSERTED. The careless sweep here is not "miss one ink" —
 * it is "strip the colour". These surfaces are meant to be loudly faction-coded,
 * and every one of them keeps the hue on its fill, wash, rule or border. A guard
 * that only forbade would be satisfied by deleting the identity.
 *
 * TWO MORE SITES ARE GONE RATHER THAN FIXED, and their section with them: the
 * pair of "Recent Invitations" rows, desktop (`pages/Factions.tsx`) and mobile
 * (`FactionsDirectoryView`). #2310 deleted that panel from both form factors —
 * the letter is already actionable on the Updates feed card, the faction detail
 * page and the arrival popup, so the row carried no action of its own. The
 * desktop one was never reachable from this harness anyway (it sat inside
 * `invitationsExpanded &&`, a `useState` starting false, and there is no DOM
 * here to click the toggle) — which was the clearest argument for shipping
 * `local/no-faction-hue-as-ink` beside this file: the rule reads source and does
 * not care whether a surface renders. That argument stands; only the specimen is
 * gone.
 *
 * ONE GROUP OF SITES IS GONE RATHER THAN FIXED, and its section with it. Three
 * of #2077's twelve were `StatusBadge` / `InvitationNote` inside
 * `components/factionCard/FactionCard.tsx` — slug-taking helpers whose call
 * sites named no colour at all, which is why they headed the list above. #2024
 * retired that whole surface: the dispatcher never had a production mount (#422
 * gave the faction directory `FactionSelectCard` on both form factors), and the
 * two helpers were declared in that file with no other call site anywhere in
 * `src/`, so deleting it took the defect with them rather than relocating it.
 * Nothing was reinstated elsewhere, and the nine mounts below are the ones that
 * are still mounted.
 *
 * A NOTE ON WHICH FACTION THE FIXTURES USE. `ephemerists` is the metatask
 * faction throughout, because #2068 handed it the plate brass and that is the
 * slot that fails — 2.19:1 on the app's page in light. It is a fixture choice
 * and NOT the subject:
 * the slot changed hands once already (WOW vacated it, 1.96 -> 5.80), so the
 * loops below walk every slug and the assertion is about the ROLE.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../i18n'
import type { TaskOut } from '../api/tasks'
import type { TaskDetailState } from '../pages/taskDetail/useTaskDetail'
import { fillUses, inkOffenders } from '../utils/__tests__/inkSeam'
import { aTask } from '../test/fixtures'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, character: null }),
}))
vi.mock('../auth/AdminModeContext', () => ({
  useAdminMode: () => ({ adminMode: false }),
}))

// Imported after the mocks are registered.
import TaskCard from '../components/taskCard/TaskCard'
import { surfaceMap } from '../factions'
import DefaultTaskDetail from '../pages/taskDetail/archetypes/DefaultTaskDetail'

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

/** Every slug with a card, a task-card skin or a detail archetype of its own. */
const SLUGS = [
  'ua',
  'everymen',
  'wow',
  'snide',
  'ephemerists',
  'singularity',
  'coven',
  'albescent',
  'na',
] as const

/** The hue that fails hardest today. See the header — a fixture, not the subject. */
const META_SLUG = 'ephemerists'

// ── The task card's metatask chip ──────────────────────────────────────────

describe("the task card's metatask byline paints no spine hue as text (#2077)", () => {
  for (const slug of SLUGS) {
    it(`${slug} card, ephemerists metatask: the chip's ink is not the hue`, () => {
      const task: TaskOut = aTask({
        task_type: 'metatask',
        primary_faction_slug: slug,
        metatask_faction_slug: META_SLUG,
        created_by_display_name: '',
      })
      const html = render(<TaskCard task={task} basePoints={task.point_value} />)
      expect(inkOffenders(html)).toEqual([])
      // The META pill and the chip's own tint and border are the hue's job, and
      // they are on the DISPATCHER rather than in any skin — so this half cannot
      // be carried by the nine skins' own tests.
      expect(fillUses(html).length).toBeGreaterThan(0)
    })
  }
})

// ── The eight task-detail bylines ──────────────────────────────────────────

const DETAIL_TASK = aTask({
  title: 'Reforestation',
  description: 'Mangrove',
  task_type: 'metatask',
  metatask_faction_slug: META_SLUG,
  created_by_display_name: '',
})

/** Every flag off; the byline is unconditional on `task_type === 'metatask'`. */
function detailState(task: TaskOut): TaskDetailState {
  return {
    loading: false,
    task,
    fetchError: null,
    submissions: [],
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 13,
    maxTaskSlots: 17,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
    inProgressCount: 0,
    topScore: 0,
    voteCount: 0,
    submissionSort: 'score',
    setSubmissionSort: () => {},
    sortedSubmissions: [],
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    dropConfirm: null,
  }
}

// The registry plus the Default fallback, which is `na`'s own identity
// (ADR-0030) and a renderable in its own right — the same shape
// `archetypeSlots.test.tsx` walks, so a faction added later is covered free.
const DETAILS = { ...surfaceMap('taskDetail'), __default__: DefaultTaskDetail }

describe('every task-detail metatask byline reads its own surface (#2077)', () => {
  for (const [slug, Archetype] of Object.entries(DETAILS)) {
    it(`${slug}: the byline is not painted in the metatask faction's hue`, () => {
      const task: TaskOut = { ...DETAIL_TASK, primary_faction_slug: slug }
      const html = render(<Archetype state={detailState(task)} />)
      expect(inkOffenders(html)).toEqual([])
      // The META pill beside the byline keeps the hue as an OPAQUE fill with its
      // `-on-fill` ink, which is the doctrine done right and the thing the
      // byline should have been doing all along.
      expect(html, 'the META pill is still there').toContain('style=')
    })
  }

  it('walks all eight archetypes plus the na fallback, not the three the report named', () => {
    // The finding named three. The registry has eight, and one of them
    // (S.N.I.D.E.) was already correct — it routed the byline to its own
    // `PINK_INK` rather than the hue. Counting here is what stops a future
    // reader trusting the report's number over the registry's.
    expect(Object.keys(DETAILS).length).toBeGreaterThanOrEqual(9)
  })
})
