/**
 * #1711: the rail's in-progress row draws the task's faction sigil beside the
 * mode pill. Probed by difference between two factions, so a hardcoded one
 * can't pass. The mark is the only faction cue, so it must be named.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { PraxisCardOut } from '../../../api/praxis'
import { markFills, occurrences, sigilPath } from '../../../utils/__tests__/sigilInk'
import { factionCssVar, factionName } from '../../../utils/factions'

const panelsMock = vi.fn()
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => panelsMock(),
}))

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

  it('names the faction it is drawing', () => {
    expect(renderRail('coven')).toContain(`aria-label="${factionName('coven')}"`)
  })

  // #2723: `factionCssVar` carries both themes; `currentColor` was page ink.
  it("paints the mark in the task faction's own hue", () => {
    expect(markFills(renderRail('ephemerists'), 'ephemerists')).toContain(
      factionCssVar('ephemerists'),
    )
    expect(markFills(renderRail('snide'), 'snide')).toContain(factionCssVar('snide'))
  })

  it('leaves no mark drawing in the page ink', () => {
    expect(markFills(renderRail('ephemerists'), 'ephemerists')).not.toContain('currentColor')
  })

  it('keeps the mode pill beside it', () => {
    expect(renderRail('coven')).toContain(i18n.t('common:praxisType.solo'))
  })
})
