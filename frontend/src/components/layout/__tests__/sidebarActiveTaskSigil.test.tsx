/**
 * #1711 — what the rail's in-progress row says about a task's faction.
 *
 * THE SEAM is the row itself: `ActiveTasksBody` renders a title link and a mode
 * pill, and the faction the task belongs to was nowhere in it. The sigil is
 * added BESIDE the pill rather than in place of it — the two facts are
 * different (what kind of praxis, whose faction) and both survive.
 *
 * Probed by DIFFERENCE, like the mobile FieldDesk twin: the rail is drawn on
 * the site's own default chrome, but a presence check on one faction's geometry
 * would still pass on a row that had hardcoded that faction. Rendering the same
 * rail twice with two different task factions and requiring the mark to move is
 * the assertion that only holds if the row asks `task_faction_slug`.
 *
 * Unlike the mobile rows, this one carries NO faction word, so the mark is the
 * only faction cue — hence the accessible name, asserted here rather than left
 * to a reviewer's eye.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { PraxisCardOut } from '../../../api/praxis'
import FactionSigil from '../../sigil/FactionSigil'
import { factionName } from '../../../utils/factions'

const panelsMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => panelsMock(),
}))

// Effects never run under `renderToStaticMarkup`; mock the two hooks that would
// otherwise sit at their loading defaults and render a signed-out rail.
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character: null } as unknown as CurrentUser }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => null,
}))

import Sidebar from '../Sidebar'

function activeTask(taskFactionSlug: string): PraxisCardOut {
  return {
    id: 55,
    task_id: 7,
    task_title: 'Sunday Soup',
    task_point_value: 30,
    task_level_required: 1,
    type: 'solo',
    status: 'in_progress',
    title: null,
    moderation_status: 'visible',
    created_by_id: 42,
    created_by_display_name: 'Mollusk',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    submitted_at: null,
    member_count: 1,
    score: 0,
    voter_count: 0,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    is_top_for_task: false,
    task_faction_slug: taskFactionSlug,
    applied_metatasks: [],
    body_text: null,
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    duel_id: null,
    media_items: [],
    members: [],
    opponent_display_name: null,
    opponent_faction_slug: null,
    opponent_avatar_url: '',
    opponent_praxis_id: null,
    submit_proposed_at: null,
    viewer_can_vote: true,
    viewer_vote: null,
    voted_by_name: null,
  }
}

function renderRail(taskFactionSlug: string): string {
  panelsMock.mockReturnValue({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [activeTask(taskFactionSlug)],
    refetch: vi.fn(),
    loading: false,
  })
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  )
}

/** The mark's own geometry, taken from `FactionSigil` rather than transcribed. */
function sigilPath(slug: string): string {
  const html = renderToStaticMarkup(<FactionSigil slug={slug} />)
  const match = html.match(/ d="([^"]+)"/)
  if (!match) throw new Error(`the ${slug} sigil draws no path to probe`)
  return match[1]
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

beforeEach(() => {
  panelsMock.mockReset()
})

describe('the in-progress row in the rail', () => {
  it("draws the TASK's faction sigil", () => {
    const coven = renderRail('coven')
    const snide = renderRail('snide')
    expect(occurrences(coven, sigilPath('coven')), 'a coven task draws the coven mark').toBe(
      occurrences(snide, sigilPath('coven')) + 1,
    )
    expect(occurrences(snide, sigilPath('snide')), 'a snide task draws the snide mark').toBe(
      occurrences(coven, sigilPath('snide')) + 1,
    )
  })

  /**
   * The mark is the row's ONLY faction cue — nothing spells the faction out —
   * so it is named rather than hidden. The name comes from the same catalog the
   * rest of the site reads, so a renamed faction moves both together.
   */
  it('names the faction it is drawing', () => {
    expect(renderRail('coven')).toContain(`aria-label="${factionName('coven')}"`)
  })

  /** Both facts survive: the mode pill is not what the sigil replaced. */
  it('keeps the mode pill beside it', () => {
    expect(renderRail('coven')).toContain(i18n.t('common:praxisType.solo'))
  })
})
