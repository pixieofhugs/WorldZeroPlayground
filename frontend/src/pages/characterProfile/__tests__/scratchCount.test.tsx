import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, vi } from 'vitest'

import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => mocks.formFactor }))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

function render(slug: string, ff: 'desktop' | 'mobile'): string {
  mocks.formFactor = ff
  const character: CharacterOut = {
    id: 7,
    username: 'wren',
    display_name: 'Wren Aldercross',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 320,
    all_time_score: 320,
    faction_slug: slug,
    status: 'active',
    created_at: '2026-06-01T00:00:00Z',
    badges: [],
    invitations: [],
  }
  const props: ProfileBodyProps = {
    character,
    submissions: [],
    proposedTasks: [],
    progression: { nextLevel: 4, currentThreshold: 200, nextThreshold: 500, progressPercent: 40 },
    identityActions: null,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
}

describe('scratch', () => {
  it('counts', () => {
    for (const ff of ['desktop', 'mobile'] as const) {
      for (const slug of ['na', 'albescent', 'ua', 'coven', 'snide', 'ephemerists', 'singularity', 'everymen', 'wow']) {
        const html = render(slug, ff)
        const text = html.replace(/<[^>]*>/g, ' ')
        const count = html.split('Wren Aldercross').length - 1
        const player = /player/i.test(text)
        console.log(`${ff} ${slug}: name=${count} playerWord=${player}`)
      }
    }
  })
})
