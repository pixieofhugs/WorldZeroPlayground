/**
 * The profile's FDL laurel on its top praxis must suppress the card's own
 * `TaskCrown` (#1960), or two fleurs share one corner. `var(--fdl-disc)` is
 * painted only by `TaskCrown`, so its count is the crown count; the laurel is
 * counted too.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { aPraxisCard } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

const LAURELLED = aPraxisCard({
  id: 101,
  title: 'I broke the site',
  score: 29,
  task_faction_slug: 'snide',
  is_top_for_task: true,
})
const RUNNER_UP = aPraxisCard({
  id: 102,
  title: 'A quieter finding',
  score: 8,
  task_faction_slug: 'snide',
  is_top_for_task: true,
})

function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function renderBody(overrides: Partial<CharacterOut> = {}): string {
  const props: ProfileBodyProps = {
    character: makeCharacter(overrides),
    submissions: [LAURELLED, RUNNER_UP],
    proposedTasks: [],
    progression: {
      nextLevel: 8,
      currentThreshold: 1500,
      nextThreshold: 2000,
      pointsIntoLevel: 380,
      levelSpan: 500,
      progressPercent: 76,
    },
    identityActions: null,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
}

const count = (markup: string, needle: string) => markup.split(needle).length - 1

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe('profile praxis list — one fleur per card (#1960)', () => {
  it('drops the built-in crown on the laurelled card (na, desktop)', () => {
    const markup = renderBody()
    expect(count(markup, 'title="Top praxis"')).toBe(1)
    // Only the runner-up keeps a Task Crown.
    expect(count(markup, 'var(--fdl-disc)')).toBe(1)
  })

  it('drops the built-in crown on the laurelled card (na, phone)', () => {
    mocks.formFactor = 'mobile'
    const markup = renderBody()
    expect(count(markup, 'title="Top praxis"')).toBe(1)
    expect(count(markup, 'var(--fdl-disc)')).toBe(1)
  })

  it('drops the built-in crown on the laurelled card (faction kit)', () => {
    const markup = renderBody({ faction_slug: 'snide' })
    expect(count(markup, 'title="Top praxis"')).toBe(1)
    expect(count(markup, 'var(--fdl-disc)')).toBe(1)
  })
})
