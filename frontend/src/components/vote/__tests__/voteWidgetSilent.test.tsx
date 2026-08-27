/**
 * #2166 — NOTHING IS PRINTED UNDER THE VOTE STARS.
 *
 * THE SEAM IS THE RENDERED WIDGET'S OWN TEXT, per faction, driven through the
 * real `VoteUI` dispatcher rather than through nine direct imports — the point
 * of the change is that a viewer sees no words beneath the control, and that is
 * a property of what each skin renders, not of any one file.
 *
 * The stars carry the fact. Everything that stood under them restated it:
 *
 *  1. `chrome.voted` — "Voted 5 pts" — from the shell's summary block, which
 *     every skin mounts, AND a second time from `WowVote`'s own caption slot, so
 *     the WOW card printed the line twice.
 *  2. the caption line — the tier adjective plus `· your vote` (`chrome.tag`),
 *     and its uncast placeholder `cast a vote` (`chrome.idle`).
 *  3. the aggregate tally — "12 votes · 44 pts" (`chrome.tally`). The owner's
 *     third ruling on #2166 pulled this one too: "no text under the stars,
 *     none." An earlier revision of THIS FILE asserted the tally survived; that
 *     assertion is inverted below, which is the whole reason it is called out
 *     here rather than quietly edited.
 *
 * Ephemerists had already done 1 and 2 to itself in #1638; the other eight
 * follow, and all nine lose 3.
 *
 * THE CONSEQUENCE, NAMED AND ACCEPTED BY THE OWNER — do not "fix" it: on a
 * praxis CARD nothing now states how many people voted. The score stamp still
 * shows the vote contribution, so the points are accounted for, but one vote and
 * ten no longer read differently. On the praxis DETAIL page nothing is lost —
 * the "Who voted" panel lists the voters and carries its own count.
 *
 * WHAT MUST SURVIVE, and is asserted here so the deletion cannot overshoot:
 *
 *  • `aria-pressed` on the cast control. A screen-reader user used to learn
 *    which star was theirs from the adjective line; with the line gone the cast
 *    value must be announced from the control itself, or "no text" is a
 *    regression rather than a tidy-up.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run) — every
 * assertion is made on markup produced from props.
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
// `useTheme()` throws outside a ThemeProvider by design (#701), and CovenVote
// forks its whole plate on it. The fork is irrelevant here — no caption line
// survives on either side — so the light half stands for both.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

import VoteUI from '../VoteUI'

/**
 * Every slug that claims the `vote` surface, plus `na` for the spectrum-sweep
 * fallback every themed-but-unskinned faction lands on. Nine widgets.
 */
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
  // Albescent ships no tier words at all (#783) — its caption was the bare
  // numeral, which is covered by the whole-text assertion below.
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
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: 'Era 3',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  }
}

/** A cast vote of 5 on a praxis that already carries a tally. */
function renderCast(slug: string): string {
  return renderToStaticMarkup(
    <VoteUI factionSlug={slug} praxisId={7} currentValue={5} points={44} totalVotes={12} />,
  )
}

/** The untouched control: nothing cast, no tally yet. */
function renderIdle(slug: string): string {
  return renderToStaticMarkup(<VoteUI factionSlug={slug} praxisId={7} />)
}

/** Visible text only — attributes (aria-labels included) are not read aloud here. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/** The aggregate line the widget used to print. Rendered with `points={44}`
 *  and `totalVotes={12}`, so its absence is a real negative, not a props miss. */
const TALLY = '12 votes · 44 pts'

describe('the vote widget prints nothing under its stars (#2166)', () => {
  for (const slug of SLUGS) {
    it(`${slug}: a cast vote adds no words`, () => {
      mocks.user = currentUser()
      const body = text(renderCast(slug))

      // 1. "Voted 5 pts" — the shell's copy, and WOW's second copy of it.
      expect(body).not.toContain('Voted')
      expect(body).not.toContain('5 pts')
      // 2. the caption line: the tier adjective and its `· your vote` tag.
      expect(body.toLowerCase()).not.toContain('your vote')
      const word = TIER_5_WORD[slug]
      if (word) expect(body).not.toContain(word)

      // 3. the aggregate tally. It IS a different fact from the viewer's cast,
      //    which is why the first pass kept it — but the ruling is "none", and
      //    the card's own score stamp already carries the vote contribution.
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
      // Exactly one of the five is the viewer's, and it says so on the control
      // — which is the only place left that carries the cast value now that the
      // adjective line is gone.
      expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1)
      expect((html.match(/aria-pressed="false"/g) ?? []).length).toBe(4)
    })
  }
})

/* -------------------------------------------------------------------------- *
 * The catalog. A string with no reader is dead copy, and a key kept alive by a
 * negative assertion is one the next dead-key sweep cannot tell from a live one
 * (the note EphemeristsVote's #1638 test leaves) — so these are asserted absent
 * from the JSON itself, not through `i18n.t`.
 * -------------------------------------------------------------------------- */

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
    // The gate, the save error and the per-star name are all still rendered;
    // this is the guard against the sweep taking the whole `chrome` branch.
    expect(Object.keys(CATALOG.chrome).sort()).toEqual([
      'loginGate',
      'rateAria',
      'rateAriaPlain',
      'saveError',
    ])
  })
})
