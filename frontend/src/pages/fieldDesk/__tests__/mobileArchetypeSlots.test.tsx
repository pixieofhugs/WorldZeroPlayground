/**
 * Mobile FieldDesk-home slot invariant — the home twin of the taskDetail
 * mobileArchetypeSlots test. Walks surfaceMap('mobileFieldDesk') plus the Default
 * mobile home and asserts each skin emits the invariant content slots from the
 * (hand-built) FieldDeskHomeState: the identity block (name + level + era
 * points + the level track + all-time), the active-tasks list, the empty state,
 * and the primary actions. Presentation-only — the skins take state, so no
 * hooks or network are involved.
 *
 * THE PENDING ROW IS A THREE-STATE SLOT (#1554), and every skin has to hold all
 * three: an obligation, other news, and a caught-up row that keeps its shape and
 * stops being a link. The third is asserted per skin rather than once on
 * `PendingRowPill`, because the failure it guards against is a skin quietly
 * going back to its own `{pendingCount > 0 && <Link …>}`.
 *
 * THE FACTION WORD AND THE VOTE COUNT ARE NOT SLOTS ANY MORE (#1553). The
 * identity block dropped "Unaffiliated · Level 4" down to "Level 4" (the art
 * already says the faction) and dropped the votes tile outright — a vote count
 * is an input, not an achievement. A faction assertion here would also have
 * passed for the wrong reason: every skin still names the faction on its
 * active-task rows.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { surfaceMap } from '../../../factions'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import FactionSigil from '../../../components/sigil/FactionSigil'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import { CAST_VOTES_LINK, FIND_TASK_LINK, UPDATES_LINK } from '../homeDestinations'
import { REQUESTS_QUEUE_LINK } from '../../updates/requestsQueueAnchor'
import type { CharacterOut } from '../../../api/auth'
import { aPraxisCard } from '../../../test/fixtures'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'molly',
  display_name: 'Mollusk',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 340,
  all_time_score: 900,
  faction_slug: 'wow',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const ACTIVE_TASK = aPraxisCard({
  task_title: 'Sunday Soup',
  task_point_value: 30,
  task_level_required: 1,
  status: 'in_progress',
  title: null,
  created_by_id: 42,
  created_by_display_name: 'Mollusk',
  submitted_at: null,
  score: 0,
  points_from_votes: 0,
  task_faction_slug: 'wow',
})

function baseState(overrides: Partial<FieldDeskHomeState> = {}): FieldDeskHomeState {
  return {
    character: CHARACTER,
    eraName: 'Era 3',
    levelTrack: { nextLevel: 5, pointsToNext: 160, nextThreshold: 500, fillPercent: 68 },
    activeTasks: [ACTIVE_TASK],
    pendingRow: { kind: 'requests', count: 2, to: REQUESTS_QUEUE_LINK },
    loadingTasks: false,
    ...overrides,
  }
}

const archetypes = { ...surfaceMap('mobileFieldDesk'), __default__: DefaultFieldDesk }

/**
 * The lead mark on an in-progress row is the TASK's faction sigil (#1711).
 *
 * Probed by DIFFERENCE rather than by presence: a skin draws its own faction's
 * mark all over its own page (Coven's sparkle rule, WOW's crest), so
 * "the coven sparkle is in the markup" would pass on CovenFieldDesk however the
 * row is drawn. Rendering the same skin twice with two different TASK factions
 * and requiring the count to move by exactly one is the assertion that only
 * holds if the row dispatches on `task_faction_slug`.
 *
 * The mark is identified by its path geometry, taken from `FactionSigil` itself
 * rather than transcribed — a re-drawn sigil moves both sides together, a row
 * that stops asking for one does not.
 */
function sigilPath(slug: string): string {
  const html = renderToStaticMarkup(<FactionSigil slug={slug} />)
  const match = html.match(/ d="([^"]+)"/)
  if (!match) throw new Error(`the ${slug} sigil draws no path to probe`)
  return match[1]
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

function withTaskFaction(slug: string): FieldDeskHomeState {
  return baseState({ activeTasks: [{ ...ACTIVE_TASK, task_faction_slug: slug }] })
}

describe('mobile FieldDesk-home content-slot invariant', () => {
  for (const [slug, Skin] of Object.entries(archetypes)) {
    it(`${slug} renders the identity block`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'character name slot').toContain('Mollusk')
      expect(text, 'level slot').toContain('Level 4')
      expect(text, 'points/score slot').toContain('340')
      expect(text, 'era slot').toContain('Era 3')
      expect(text, 'all-time slot').toContain('900')
      expect(html, 'profile link slot').toContain('href="/characters/42"')
      expect(html, 'edit link slot').toContain('href="/characters/42/edit"')
    })

    it(`${slug} renders the level track`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(html, 'progress track slot').toContain('role="progressbar"')
      expect(html, 'fill width slot').toContain('width:68%')
      expect(text, 'to-next-level slot').toContain('160 to Level 5')
    })

    it(`${slug} holds the track back until the era curve lands`, () => {
      const { html, text } = render(<Skin state={baseState({ levelTrack: null })} />)
      expect(html, 'no progressbar without a target').not.toContain('role="progressbar"')
      expect(text, 'points figure still reads').toContain('340')
    })

    it(`${slug} renders the active-tasks list (continue link)`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'active task title slot').toContain('Sunday Soup')
      expect(html, 'continue-in-progress slot').toContain('href="/praxis/55/edit"')
    })

    /**
     * #1711. Five skins marked the row with their OWN fixed accent (a red
     * square, an acid square, an ochre square, a gilt sparkle) and three drew
     * no faction mark at all; only Default's dot tracked the task. The mark now
     * says the same true thing on all eight.
     */
    it(`${slug} marks the in-progress row with the TASK's faction`, () => {
      // Probed inside the test, not at module scope: the faction manifests
      // register as their modules evaluate, and a `sigilPath` call during this
      // file's own import would resolve every slug to the fallback.
      const COVEN_MARK = sigilPath('coven')
      const SNIDE_MARK = sigilPath('snide')
      const coven = render(<Skin state={withTaskFaction('coven')} />).html
      const snide = render(<Skin state={withTaskFaction('snide')} />).html
      expect(
        occurrences(coven, COVEN_MARK),
        'a coven task draws the coven mark',
      ).toBe(occurrences(snide, COVEN_MARK) + 1)
      expect(
        occurrences(snide, SNIDE_MARK),
        'a snide task draws the snide mark',
      ).toBe(occurrences(coven, SNIDE_MARK) + 1)
    })

    it(`${slug} renders the empty state when no active tasks`, () => {
      const { text } = render(<Skin state={baseState({ activeTasks: [] })} />)
      expect(text.toLowerCase(), 'empty-tasks slot').toContain('nothing in progress')
    })

    /**
     * #1554: both CTAs land on an ALREADY-NARROWED view. The hrefs are asserted
     * rather than the labels alone because "Find a Task" pointing at the whole
     * catalogue renders identically to one that works — see
     * `homeDestinations.test.ts`, which proves the two query strings actually
     * turn the axes on at the destination.
     */
    it(`${slug} lands its primary action on the tasks it can sign up for`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text.toLowerCase(), 'find-task slot').toContain('find a task')
      expect(html, 'eligible-tasks link slot').toContain(`href="${FIND_TASK_LINK}"`)
    })

    it(`${slug} lands its secondary action on praxes awaiting this vote`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text.toLowerCase(), 'cast-votes slot').toContain('cast your votes')
      expect(html, 'needs-my-vote link slot').toContain(`href="${CAST_VOTES_LINK}"`)
    })

    /**
     * Proposing has ONE home and it is `/tasks` (#1556 + this issue). The
     * assertion is on the route, not the label: a link left here would be a
     * second, ungated entry point to a page that 403s the viewer it lets in.
     */
    it(`${slug} offers no propose entry point — /tasks owns it`, () => {
      const { html } = render(<Skin state={baseState()} />)
      expect(html, 'propose lives on /tasks now').not.toContain('/propose-task')
    })

    // ── the pending row's three states (#1554) ──────────────────────────────
    it(`${slug} points the pending row at the requests queue`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'requests copy').toContain('2 pending requests')
      expect(html, 'queue anchor').toContain(`href="${REQUESTS_QUEUE_LINK}"`)
    })

    it(`${slug} points the pending row at unfiltered Updates when only news waits`, () => {
      const { html, text } = render(
        <Skin state={baseState({ pendingRow: { kind: 'notifications', count: 0, to: UPDATES_LINK } })} />,
      )
      expect(text, 'notifications copy').toContain('New updates')
      expect(html, 'unfiltered updates').toContain(`href="${UPDATES_LINK}"`)
    })

    it(`${slug} dead-ends the pending row rather than linking nowhere`, () => {
      const { html, text } = render(
        <Skin state={baseState({ pendingRow: { kind: 'clear', count: 0, to: null } })} />,
      )
      // The pill STAYS — it is a sentence, not a control that got hidden.
      expect(text, 'caught-up copy').toContain('All caught up')
      // ...and it is not a link at all. A pill that still looks pressable and
      // goes nowhere is worse than no pill, so neither Updates href survives.
      expect(html, 'no route out of a caught-up row').not.toContain('/updates')
    })

    it(`${slug} draws no pending row until the panels land`, () => {
      const { text } = render(<Skin state={baseState({ pendingRow: null })} />)
      // Zero-because-unknown must not render as "All caught up" over a queue
      // with four invites in it, then swap under the reader.
      expect(text, 'nothing claimed while loading').not.toContain('All caught up')
    })
  }
})
