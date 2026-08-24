/** TEMPORARY (#2299): captures rendered join-panel copy for a before/after diff. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { writeFileSync } from 'node:fs'
import { describe, it, vi } from 'vitest'
import '../../../i18n'
import type { FactionDetailState, Membership, MembershipState } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import { aPraxisCard } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  state: undefined as unknown as FactionDetailState,
}))
vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => mocks.formFactor }))
vi.mock('../useFactionDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useFactionDetail')>()),
  useFactionDetail: () => mocks.state,
}))
const FactionDetail = (await import('../../FactionDetail')).default

const MEMBER: CharacterOut = {
  id: 7,
  username: 'ada',
  display_name: 'Ada Reed',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 120,
  all_time_score: 340,
  faction_slug: 'everymen',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}
const PRAXIS = aPraxisCard({
  task_id: 11,
  task_title: 'Plant a tree',
  task_point_value: 20,
  title: 'My sapling',
  created_by_id: 7,
  created_by_display_name: 'Ada Reed',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  score: 24,
  voter_count: 3,
  task_faction_slug: 'everymen',
})
function stateFor(
  slug: string,
  state: MembershipState,
  joining: boolean,
  current: string | null,
): FactionDetailState {
  const membership: Membership = {
    state,
    currentFactionSlug: current,
    join: async () => {},
    joining,
    joinError: null,
  }
  return {
    slug,
    loading: false,
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [MEMBER],
    tasks: [],
    recentPraxis: [PRAXIS],
    viewerFactionSlug: current,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership,
  }
}
function decode(v: string): string {
  return v
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
const SLUGS = [
  'coven',
  'ephemerists',
  'everymen',
  'singularity',
  'snide',
  'ua',
  'wow',
  'albescent',
]
const STATES = ['none', 'eligible', 'gate', 'member', 'burned'] as MembershipState[]
const VARIANTS = [
  ['', false, null],
  ['-joining', true, null],
  ['-switch', false, 'coven'],
] as const

describe('capture', () => {
  it('writes the rendered copy', () => {
    const out: Record<string, string> = {}
    for (const formFactor of ['desktop', 'mobile'] as const) {
      for (const slug of SLUGS) {
        for (const state of STATES) {
          for (const [label, joining, current] of VARIANTS) {
            mocks.formFactor = formFactor
            mocks.state = stateFor(slug, state, joining, current)
            const html = renderToStaticMarkup(
              <MemoryRouter>
                <FactionDetail slug={slug} />
              </MemoryRouter>,
            )
            out[`${formFactor}/${slug}/${state}${label}`] = decode(
              html.replace(/<[^>]*>/g, '\n'),
            )
              .replace(/\n+/g, '\n')
              .trim()
          }
        }
      }
    }
    writeFileSync(process.env.CAPTURE_OUT as string, JSON.stringify(out, null, 1), 'utf8')
  })
})
