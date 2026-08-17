/**
 * The seam: a profile praxis list that floats its OWN fleur medallion must
 * suppress the card's built-in Task Crown (#1960).
 *
 * The profile stamps a 44px FDL laurel at `top:-11 right:14` over the card that
 * holds the character's highest-scoring praxis. The card's `ScoreStamp` mounts a
 * second, smaller `TaskCrown` at its own corner whenever `is_top_for_task` — and
 * on a praxis that is both, the two fleur medallions land in the same corner,
 * the small one peeking out from behind the big one's rim. That is the reported
 * "fleur escaping the circle": two marks, not one mark drawn wrong.
 *
 * `PraxisCard`'s `showCrown` prop is the house answer — the six faction-page
 * bodies already pass `false` for exactly this reason. This file pins it for all
 * THREE profile mounts: the na body's desktop and phone branches, and the shared
 * `ProfileSkin` the seven faction kits delegate to.
 *
 * Counting, not snapshotting: `var(--fdl-disc)` is `TaskCrown`'s own disc token
 * and nothing else paints it, so its occurrence count IS the number of built-in
 * crowns on the page. The laurel is counted too, so "delete the laurel" cannot
 * pass this file.
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

/** The character's best praxis — the one the profile laurels — and a runner-up. */
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
    // Only the runner-up keeps a Task Crown; the laurelled card wears the laurel.
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
