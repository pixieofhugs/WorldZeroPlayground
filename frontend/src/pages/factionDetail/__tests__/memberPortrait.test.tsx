/**
 * The whole `/factions/:slug` page spends `avatar_url` at both member mounts
 * (#2226). Tested at the page, not the medallion: the bug was bodies never
 * threading the URL in. Spotlight and roster portraits use different paths so
 * wiring only one still fails. Not covered: Ephemerists (#2228), WOW/albescent
 * (no portrait slot).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import { mediaUrl } from '../../../utils/media'

const mocks = vi.hoisted(() => ({
  state: undefined as unknown as FactionDetailState,
}))

vi.mock('../useFactionDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useFactionDetail')>()),
  useFactionDetail: () => mocks.state,
}))

// Loaded after the mock, so the page picks it up.
const FactionDetail = (await import('../../FactionDetail')).default

/** The five kits whose faction body draws a member medallion at both mounts. */
const KITS = ['coven', 'everymen', 'singularity', 'ua', 'snide'] as const

const SPOTLIGHT_PORTRAIT = 'avatars/spotlight.jpg'
const ROSTER_PORTRAIT = 'avatars/roster.jpg'

function aCharacter(over: Partial<CharacterOut>): CharacterOut {
  return {
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
    ...over,
  }
}

const membership: Membership = {
  state: 'none',
  currentFactionSlug: null,
  join: async () => {},
  joining: false,
  joinError: null,
}

function pageHtml(slug: string, members: CharacterOut[]): string {
  mocks.state = {
    slug,
    loading: false,
    faction: { slug, status: 'visible' } as FactionDetailState['faction'],
    fetchError: null,
    members,
    tasks: [],
    recentPraxis: [],
    onSignup: undefined,
    signupMsg: null,
    membership,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionDetail slug={slug} />
    </MemoryRouter>,
  )
}

/** Top scorer takes the spotlight; the second takes the roster row. */
const WITH_PORTRAITS: CharacterOut[] = [
  aCharacter({ id: 7, display_name: 'Ada Reed', all_time_score: 340, avatar_url: SPOTLIGHT_PORTRAIT }),
  aCharacter({ id: 8, display_name: 'Bo Vance', all_time_score: 12, avatar_url: ROSTER_PORTRAIT }),
]

const WITHOUT_PORTRAITS: CharacterOut[] = WITH_PORTRAITS.map((m) => ({ ...m, avatar_url: '' }))

describe('a faction page draws a member portrait where it has one (#2226)', () => {
  for (const slug of KITS) {
    it(`${slug} spends avatar_url at the spotlight and the roster row`, () => {
      const html = pageHtml(slug, WITH_PORTRAITS)
      expect(
        html,
        `${slug}'s SPOTLIGHT medallion still takes a name and nothing else`,
      ).toContain(mediaUrl(SPOTLIGHT_PORTRAIT))
      expect(
        html,
        `${slug}'s ROSTER medallion still takes a name and nothing else`,
      ).toContain(mediaUrl(ROSTER_PORTRAIT))
    })

    it(`${slug} falls back to the monogram when there is no portrait`, () => {
      const html = pageHtml(slug, WITHOUT_PORTRAITS)
      // No `img` at all: the monogram is the fallback.
      expect(html, `${slug} draws an image for a member with no portrait`).not.toMatch(/<img[^>]*src=""/)
      expect(html, `${slug} points a member image at the media root itself`).not.toContain(mediaUrl('x').slice(0, -1))
    })
  }
})
