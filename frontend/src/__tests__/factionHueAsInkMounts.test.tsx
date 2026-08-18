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
 *   - the two invitation rows put the hue in a `<Trans>` interpolation component,
 *     where the ink and the copy are assembled in different files.
 *
 * WHY BOTH HALVES ARE ASSERTED. The careless sweep here is not "miss one ink" —
 * it is "strip the colour". These surfaces are meant to be loudly faction-coded,
 * and every one of them keeps the hue on its fill, wash, rule or border. A guard
 * that only forbade would be satisfied by deleting the identity.
 *
 * ONE OF THE TWELVE SITES IS NOT REACHABLE FROM HERE, and it is the clearest
 * argument for shipping the lint rule beside this file. `pages/Factions.tsx`
 * draws the desktop invitation row inside `invitationsExpanded &&`, whose
 * `useState` starts false — and this harness has no DOM, so no click can open
 * it (§ the mobile twin is a pure view component and IS rendered below). A
 * render guard cannot see a state no route walk produces, which is #694's
 * lesson: "the surface is skinned by a faction" is not the same claim as "the
 * sweep has been there". `local/no-faction-hue-as-ink` reads it out of the
 * source and does not care whether it renders.
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
 * slot that fails — 2.19:1 on the app's page in light, 2.04:1 on the faction
 * wash the invitation rows lay down. It is a fixture choice and NOT the subject:
 * the slot changed hands once already (WOW vacated it, 1.96 -> 5.80), so the
 * loops below walk every slug and the assertion is about the ROLE.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../i18n'
import type { InvitationLetterOut } from '../api/factions'
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
import FactionsDirectoryView from '../pages/factions/mobileArchetypes/FactionsDirectoryView'

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

// ── The two invitation rows ────────────────────────────────────────────────

const LETTERS: InvitationLetterOut[] = SLUGS.filter((slug) => slug !== 'na').map((slug) => ({
  faction_slug: slug,
  delivered_at: '2026-01-01T00:00:00Z',
  note: 'Come and see',
}))

describe('the invitation rows mark the faction name by WEIGHT, not hue (#2077)', () => {
  it('mobile: the directory view inks no faction name in its own hue', () => {
    const html = render(
      <FactionsDirectoryView
        factions={LETTERS.map(({ faction_slug }) => ({ slug: faction_slug, status: 'visible' }))}
        factionPage={null}
        invitations={LETTERS}
        loading={false}
        error={null}
        unaffiliated
        onVisit={() => {}}
      />,
    )
    expect(inkOffenders(html)).toEqual([])
    // The row's wash and its 3px left rule are the hue's, and they are what make
    // the row readable AS an invitation from that faction.
    expect(fillUses(html).length).toBeGreaterThan(0)
  })

  it('the name still carries a weight of its own', () => {
    // The fix deletes a `color` from a two-declaration span. Delete the other
    // one by accident and the name stops being marked out at all — which no ink
    // assertion would notice.
    const html = render(
      <FactionsDirectoryView
        factions={[{ slug: META_SLUG, status: 'visible' }]}
        factionPage={null}
        invitations={[LETTERS[0]]}
        loading={false}
        error={null}
        unaffiliated
        onVisit={() => {}}
      />,
    )
    expect(html).toContain('font-weight:700')
  })
})
