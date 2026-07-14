// Shared, fully-typed fixtures for the World Zero design-sync previews.
//
// Every value is annotated against the REAL domain types imported (type-only,
// erased at build) from frontend/src/api/*. Content is realistic World Zero
// material — real-sounding task titles and faction-flavored praxis prose — so a
// captured cell reads like the live app, not foo/bar. Factories fill every
// required field; `overrides` shallow-merges on top.
//
// Import from a preview with:  import { makeTask, taskFor } from './_fixtures'

import type { TaskOut } from '../../frontend/src/api/tasks'
import type { CharacterOut, CurrentUser, BadgeOut } from '../../frontend/src/api/auth'
import type {
  PraxisOut,
  PraxisCardOut,
  PraxisMemberOut,
  PraxisInviteOut,
  MediaItemOut,
} from '../../frontend/src/api/praxis'
import type { CommentOut } from '../../frontend/src/api/comments'
import type { ActivityFeedItem } from '../../frontend/src/api/activityFeed'
import type { CredentialCardProps } from '../../frontend/src/components/CredentialCard'

// The seven live faction slugs. `na`/null are the neutral (default) treatment.
export const FACTION_SLUGS: string[] = [
  'ua',
  'wow',
  'snide',
  'ephemerists',
  'singularity',
  'everymen',
  'albescent',
]

// A stable ISO timestamp so captures are deterministic (no "now"-relative drift).
const NOW = '2026-07-01T15:04:00Z'
const EARLIER = '2026-06-28T09:12:00Z'

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function makeTask(overrides: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 101,
    title: 'Plant a native tree',
    description:
      'Choose a species native to your region, plant it in soil that will hold it for decades, and photograph the sapling beside something for scale.',
    point_value: 30,
    level_required: 2,
    status: 'active',
    task_type: 'standard',
    created_by: 7,
    primary_faction_slug: 'ua',
    metatask_faction_slug: null,
    is_task_vision_eligible: true,
    created_at: NOW,
    can_submit_praxis: true,
    allowed_modes: ['solo', 'collab'],
    eligible_for_current_user: true,
    ...overrides,
  }
}

// Faction-flavored task titles — each reads in that faction's register.
const TASK_TITLE_BY_SLUG: Record<string, string> = {
  ua: 'Render the old library facade in charcoal',
  wow: 'Host a sidewalk chalk festival for the block',
  snide: 'Wheatpaste an original poem on a condemned wall',
  ephemerists: 'Catalogue every bench along the river walk',
  singularity: 'Log one week of your resting heart rate',
  everymen: 'Organize a neighborhood tool library',
  albescent: "Sit with a stranger's grief for one hour",
}

/** A task set to a faction, with a title in that faction's voice. */
export function taskFor(slug: string, overrides: Partial<TaskOut> = {}): TaskOut {
  return makeTask({
    primary_faction_slug: slug,
    title: TASK_TITLE_BY_SLUG[slug] ?? makeTask().title,
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

const SAMPLE_BADGES: BadgeOut[] = [
  { key: 'sock_puppeteer', name: 'Sock Puppeteer' },
  { key: 'first_light', name: 'First Light' },
]

export function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: 'ada_reed',
    display_name: 'Ada Reed',
    bio: 'Cartographer of small kindnesses. Plants trees she will not sit beneath.',
    avatar_url: null,
    location: 'Portland, OR',
    level: 4,
    score: 320,
    all_time_score: 1180,
    faction_slug: 'ua',
    status: 'active',
    created_at: EARLIER,
    badges: SAMPLE_BADGES,
    invitations: [],
    ...overrides,
  }
}

// Faction-appropriate display names, so an avatar/byline reads in-voice.
const NAME_BY_SLUG: Record<string, string> = {
  ua: 'Ada Reed',
  wow: 'Pip Marigold',
  snide: 'Rax Vandal',
  ephemerists: 'Dr. Iris Vale',
  singularity: 'node_44',
  everymen: 'Sam Okafor',
  albescent: 'The Quiet Hand',
}

/** A character enrolled in a faction, named in that faction's voice. */
export function characterFor(
  slug: string,
  overrides: Partial<CharacterOut> = {},
): CharacterOut {
  return makeCharacter({
    faction_slug: slug,
    display_name: NAME_BY_SLUG[slug] ?? makeCharacter().display_name,
    ...overrides,
  })
}

// The carried life on /auth/me — a logged-in UA player who can do everything a
// mid-level character can. Faction fan-outs can clone this via makeCharacter.
export const mockUser: CurrentUser = {
  account_id: 1,
  character: makeCharacter(),
  is_admin: false,
  can_create_additional_character: true,
  can_start_as_albescent: false,
  albescent_revealed: false,
  can_propose_task: true,
  can_propose_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
  second_character_level_required: 5,
  era_name: 'Era One',
}

// ---------------------------------------------------------------------------
// Praxis (proof-of-work)
// ---------------------------------------------------------------------------

const SAMPLE_MEMBERS: PraxisMemberOut[] = [
  {
    id: 1,
    praxis_id: 501,
    character_id: 7,
    character_display_name: 'Ada Reed',
    has_submitted: true,
    joined_at: EARLIER,
  },
  {
    id: 2,
    praxis_id: 501,
    character_id: 12,
    character_display_name: 'Sam Okafor',
    has_submitted: false,
    joined_at: EARLIER,
  },
]

const SAMPLE_INVITE: PraxisInviteOut = {
  id: 1,
  praxis_id: 501,
  inviter_id: 7,
  invitee_id: 19,
  inviter_display_name: 'Ada Reed',
  invitee_display_name: 'Pip Marigold',
  status: 'pending',
  created_at: EARLIER,
}

const SAMPLE_MEDIA: MediaItemOut[] = [
  {
    id: 1,
    praxis_id: 501,
    type: 'image',
    file_path: 'media/praxis/501/sapling.jpg',
    display_order: 0,
    created_at: NOW,
  },
]

// Faction-flavored proof narration, keyed by faction slug.
const PRAXIS_BODY_BY_SLUG: Record<string, string> = {
  ua: 'Two hours at the north portico with a stick of vine charcoal. I let the cornice go soft and pressed hard only where the light broke — the whole facade came alive in the smudging.',
  wow: 'We covered the whole block in chalk suns and sea monsters! Six kids, one very patient dog, and a rainbow that took four of us to finish. Absolute joy.',
  snide: 'Printed forty copies at 2am, wheatpasted the lot before the sweepers came through. The poem is about rent. It is still up as of this morning.',
  ephemerists: 'Sixty-one benches logged, each with coordinates, a condition note, and the name carved into it if any. Bench 44 remembers someone called Marguerite.',
  singularity: 'Seven days of resting HR, sampled on waking. Mean 58, variance tightening after day four. Attaching the raw series and the rolling average.',
  everymen: 'The tool library opens Saturday. Twelve neighbors donated, one lent a shed, and we built a lending log out of an old ledger. Everyone gets a key.',
  albescent: 'I sat with her while the light went. She did not need me to say anything. I have written down only that it happened, and nothing of what was said.',
}

export function makePraxis(overrides: Partial<PraxisOut> = {}): PraxisOut {
  const slug = overrides.task_faction_slug ?? 'ua'
  return {
    id: 501,
    task_id: 101,
    task_title: TASK_TITLE_BY_SLUG[slug ?? 'ua'] ?? 'Plant a native tree',
    task_point_value: 30,
    task_level_required: 2,
    task_faction_slug: slug,
    type: 'solo',
    status: 'submitted',
    title: 'Charcoal study, north portico',
    body_text: PRAXIS_BODY_BY_SLUG[slug ?? 'ua'] ?? PRAXIS_BODY_BY_SLUG.ua,
    moderation_status: 'visible',
    admin_note: null,
    flagged_at: null,
    submitted_at: NOW,
    submit_proposed_at: null,
    created_by_id: 7,
    created_by_display_name: 'Ada Reed',
    created_by_faction_slug: slug,
    created_at: EARLIER,
    updated_at: NOW,
    members: SAMPLE_MEMBERS,
    invites: [SAMPLE_INVITE],
    media_items: SAMPLE_MEDIA,
    score: 42,
    is_top_for_task: true,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Comments (CommentThread FETCHES its own — see the gotcha note below)
// ---------------------------------------------------------------------------

export const mockComments: CommentOut[] = [
  {
    id: 1,
    praxis_id: 501,
    task_id: null,
    body_text: 'The smudged cornice is doing all the work here — beautiful restraint.',
    is_edited: false,
    created_at: EARLIER,
    updated_at: EARLIER,
    author: {
      id: 12,
      username: 'sam_okafor',
      display_name: 'Sam Okafor',
      avatar_url: null,
      faction_slug: 'everymen',
    },
    mentions: [],
  },
  {
    id: 2,
    praxis_id: 501,
    task_id: null,
    body_text: 'Agreed. @ada_reed did you fix the charcoal after?',
    is_edited: true,
    created_at: NOW,
    updated_at: NOW,
    author: {
      id: 19,
      username: 'pip_marigold',
      display_name: 'Pip Marigold',
      avatar_url: null,
      faction_slug: 'wow',
    },
    mentions: [{ character_id: 7, username: 'ada_reed', display_name: 'Ada Reed' }],
  },
]

// ---------------------------------------------------------------------------
// Collaboration card (CollaborationCard consumes a PraxisCardOut)
// ---------------------------------------------------------------------------

export const mockCollaboration: PraxisCardOut = {
  id: 501,
  task_id: 101,
  task_title: 'Organize a neighborhood tool library',
  task_point_value: 45,
  task_level_required: 3,
  type: 'collab',
  status: 'submitted',
  title: 'The Saturday Tool Library',
  moderation_status: 'visible',
  created_by_id: 12,
  created_by_display_name: 'Sam Okafor',
  created_at: EARLIER,
  updated_at: NOW,
  submitted_at: NOW,
  member_count: 4,
  score: 38,
  voter_count: 9,
  is_top_for_task: false,
  task_faction_slug: 'everymen',
}

// ---------------------------------------------------------------------------
// Credential card (CredentialCard takes flat props, not a domain type)
// ---------------------------------------------------------------------------

export const mockCredential: CredentialCardProps = {
  displayName: 'Ada Reed',
  handle: 'ada_reed',
  bio: 'Cartographer of small kindnesses. Plants trees she will not sit beneath.',
  factionSlug: 'ua',
  level: 4,
  score: 320,
  avatarUrl: null,
}

// ---------------------------------------------------------------------------
// Activity feed (FeedCardRouter dispatches on item.type)
// ---------------------------------------------------------------------------

export function makeFeedItem(overrides: Partial<ActivityFeedItem> = {}): ActivityFeedItem {
  return {
    type: 'friend_completion',
    timestamp: NOW,
    actor_display_name: 'Ada Reed',
    actor_faction_slug: 'ua',
    actor_avatar_url: null,
    payload: {
      character_id: 7,
      praxis_id: 501,
      task_title: 'Render the old library facade in charcoal',
      task_point_value: 30,
    },
    context_faction_slug: 'ua',
    ...overrides,
  }
}

/** One example per dispatch branch of FeedCardRouter — the slot-driven faction
 *  rows plus the four bespoke companion cards. Handy for the feed fan-outs. */
export const mockFeedItems: Record<string, ActivityFeedItem> = {
  // Faction-owned "someone did X" rows (normalizeFeedItem → FeedRowContent).
  friend_completion: makeFeedItem({ type: 'friend_completion' }),
  vote_on_mine: makeFeedItem({
    type: 'vote_on_mine',
    payload: { praxis_id: 501, praxis_title: 'Charcoal study, north portico', points_earned: 12 },
  }),
  global_task: makeFeedItem({
    type: 'global_task',
    actor_display_name: null,
    payload: {
      task_id: 101,
      task_title: 'Plant a native tree',
      task_point_value: 30,
      task_level_required: 2,
    },
    context_faction_slug: null,
  }),
  friend_signup: makeFeedItem({
    type: 'friend_signup',
    payload: {
      character_id: 12,
      task_id: 101,
      task_title: 'Organize a neighborhood tool library',
      task_point_value: 45,
      task_level_required: 3,
    },
    actor_faction_slug: 'everymen',
    context_faction_slug: 'everymen',
  }),
  // Bespoke companion cards (COMPANION_MAP).
  era_announcement: makeFeedItem({
    type: 'era_announcement',
    actor_display_name: null,
    actor_faction_slug: null,
    payload: { era_name: 'Era One', headline: 'The first era has begun' },
    context_faction_slug: null,
  }),
  collab_invite: makeFeedItem({
    type: 'collab_invite',
    payload: {
      praxis_id: 501,
      invite_id: 1,
      task_title: 'Organize a neighborhood tool library',
      inviter_display_name: 'Sam Okafor',
    },
    actor_faction_slug: 'everymen',
    context_faction_slug: 'everymen',
  }),
  duel_challenge: makeFeedItem({
    type: 'duel_challenge',
    payload: {
      duel_id: 3,
      task_title: 'Wheatpaste an original poem on a condemned wall',
      challenger_display_name: 'Rax Vandal',
    },
    actor_faction_slug: 'snide',
    context_faction_slug: 'snide',
  }),
}

/** A convenient noop for callback props. */
export const noop = (): void => {}
