import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import i18n from '../../../i18n'
import type { TaskOut } from '../../../api/tasks'
import { FACTION_MANIFESTS, surfaceMap } from '../../../factions'
import { resolveVariant } from '../../../utils/factionDispatch'
import { ProposalActionsContext } from '../proposalActions'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

const SLUGS = ['na', ...FACTION_MANIFESTS.map((manifest) => manifest.slug)]
const PENDING = i18n.t('tasks:proposalCard.pendingReview')
const EDIT = i18n.t('tasks:proposalCard.edit')
const WITHDRAW = i18n.t('tasks:proposalCard.withdraw')

function pendingTask(slug: string): TaskOut {
  return {
    id: 9,
    title: 'Plant a tree',
    description: 'Dig.',
    point_value: 20,
    level_required: 2,
    status: 'pending',
    task_type: 'standard',
    created_by: 7,
    primary_faction_slug: slug,
    metatask_faction_slug: null,
    created_at: '2026-01-01T00:00:00Z',
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: 'task_status_closed',
    in_progress_praxis_id: null,
    submitted_praxis_id: null,
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
    notes: null,
    viewer_faction_multiplier: 1,
  }
}

function render(slug: string, own: boolean): string {
  const Card = resolveVariant(surfaceMap('taskCard'), slug)
  const actions = { ids: new Set(own ? [9] : []), onEdit: vi.fn(), onWithdraw: vi.fn() }
  return renderToStaticMarkup(
    <MemoryRouter>
      <ProposalActionsContext.Provider value={actions}>
        <Card task={pendingTask(slug)} basePoints={20} multiplier={1} inProgressCount={0} onSignup={() => {}} />
      </ProposalActionsContext.Provider>
    </MemoryRouter>,
  )
}

describe('own pending proposal card (#3771)', () => {
  it.each(SLUGS)('%s skin shows Pending review, Edit and Withdraw to its proposer', (slug) => {
    const html = render(slug, true)
    for (const label of [PENDING, EDIT, WITHDRAW]) expect(html).toContain(label)
  })

  it.each(SLUGS)("%s skin keeps today's CTA for anyone else", (slug) => {
    const html = render(slug, false)
    expect(html).toContain(i18n.t('tasks:detail.signup.denied.taskStatusClosed'))
    for (const label of [PENDING, EDIT, WITHDRAW]) expect(html).not.toContain(label)
  })
})
