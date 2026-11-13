/**
 * #2166: no text under the vote stars, per faction via the real `VoteUI`
 * dispatcher. Gone: "Voted N pts" (`chrome.voted`), the tier caption and its
 * idle placeholder, and the aggregate tally ("none", owner ruling).
 *
 * Accepted by the owner, do not "fix": a praxis CARD no longer says how many
 * voted (the detail page's "Who voted" panel does). `aria-pressed` must
 * survive, since it is now the only SR carrier of the cast value.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  user: null as CurrentUser | null,
  castVote: vi.fn(async () => ({}) as unknown),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refetch: async () => {} }),
}))
vi.mock('../../../api/votes', () => ({
  castVote: mocks.castVote,
}))
// `useTheme()` throws outside a ThemeProvider (#701); light stands for both.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

import VoteUI from '../VoteUI'

/** Every `vote` surface slug plus `na`'s fallback. */
const SLUGS = [
  'na',
  'albescent',
  'coven',
  'ephemerists',
  'everymen',
  'singularity',
  'snide',
  'ua',
  'wow',
] as const

/** The tier-5 word each ladder used to print under its control. */
const TIER_5_WORD: Record<string, string> = {
  na: 'brilliant',
  coven: 'iconic',
  ephemerists: 'platinum',
  everymen: 'legendary',
  singularity: 'VERIFIED',
  snide: 'ANARCHY',
  ua: 'radiant',
  wow: 'legendary!',
  // Albescent has no tier words (#783).
}

function currentUser(): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character: {
      id: 9,
      username: 'ada',
      display_name: 'Ada',
      bio: '',
      tagline: '',
      avatar_url: '',
      location: '',
      level: 8,
      score: 100,
      all_time_score: 100,
      faction_slug: 'na',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      badges: [],
      invitations: [],
    },
    is_admin: false,
    is_owner: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    can_vote: true,
    vote_level_required: 1,
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: 'Era 3',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  }
}

function renderCast(slug: string): string {
  return renderToStaticMarkup(
    <VoteUI factionSlug={slug} praxisId={7} currentValue={5} points={44} totalVotes={12} />,
  )
}

function renderIdle(slug: string): string {
  return renderToStaticMarkup(<VoteUI factionSlug={slug} praxisId={7} />)
}

/** Visible text only, not attributes. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/** Rendered with matching props, so its absence is a real negative. */
const TALLY = '12 votes · 44 pts'

describe('the vote widget prints nothing under its stars (#2166)', () => {
  for (const slug of SLUGS) {
    it(`${slug}: a cast vote adds no words`, () => {
      mocks.user = currentUser()
      const body = text(renderCast(slug))

      expect(body).not.toContain('Voted')
      expect(body).not.toContain('5 pts')
      expect(body.toLowerCase()).not.toContain('your vote')
      const word = TIER_5_WORD[slug]
      if (word) expect(body).not.toContain(word)

      expect(body).not.toContain(TALLY)
      expect(body).not.toContain('44 pts')
      expect(body).not.toContain('12 votes')
    })

    it(`${slug}: the untouched control adds no words either`, () => {
      mocks.user = currentUser()
      const body = text(renderIdle(slug))
      expect(body.toLowerCase()).not.toContain('cast a vote')
      expect(body).not.toContain('Voted')
    })

    it(`${slug}: the cast star announces itself through aria-pressed`, () => {
      mocks.user = currentUser()
      const html = renderCast(slug)
      expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1)
      expect((html.match(/aria-pressed="false"/g) ?? []).length).toBe(4)
    })
  }
})

/* Asserted on the JSON, not via `i18n.t`, so no dead key looks referenced. */

const CATALOG = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../locales/en/votes.json', import.meta.url)), 'utf8'),
) as { chrome: Record<string, string> }

describe('votes.json loses the keys the widget stopped reading (#2166)', () => {
  for (const key of ['voted', 'idle', 'tag', 'tally_one', 'tally_other']) {
    it(`chrome.${key} is gone`, () => {
      expect(Object.keys(CATALOG.chrome)).not.toContain(key)
    })
  }

  it('keeps the keys the widget still reads', () => {
    // Guards against a sweep taking the whole `chrome` branch.
    expect(Object.keys(CATALOG.chrome).sort()).toEqual([
      'levelGate',
      'loginGate',
      'rateAria',
      'rateAriaPlain',
      'saveError',
    ])
  })
})
