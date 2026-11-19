// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, refetch: async () => {} }),
}))

import Beat3 from '../onboarding/beats/Beat3'
import { normalizeFeedItem } from '../../components/feed/normalizeFeedItem'

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))

afterEach(cleanup)

describe('the welcome flow reads only eager copy', () => {
  it('draws its task cards with the route-loaded namespaces gone', () => {
    // A missing key throws under test, so a read of a lazy namespace fails here.
    for (const ns of ['admin', 'forms']) i18n.removeResourceBundle('en', ns)
    const { container } = render(
      <MemoryRouter>
        <Beat3 confidence={0.6} />
      </MemoryRouter>,
    )
    expect(container.textContent).not.toMatch(/taskCard\./)
  })

  it('draws the Sidebar nudge row with the route-loaded namespaces gone', () => {
    for (const ns of ['admin', 'forms']) i18n.removeResourceBundle('en', ns)
    const row = normalizeFeedItem({
      type: 'nudge',
      item_key: 'nudge:1',
      timestamp: '2026-01-01T00:00:00Z',
      actor_display_name: 'Ada',
      actor_faction_slug: 'coven',
      actor_avatar_url: null,
      payload: { nudge_id: 4, praxis_id: 12, praxis_type: 'collab', from_character_id: 8, task_title: 'Plant a tree' },
      context_faction_slug: 'coven',
    })
    expect(row?.action).toBe('nudged you to submit your part of')
  })
})
