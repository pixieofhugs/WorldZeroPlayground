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
import type { DuelDetailOut } from '../../frontend/src/api/duel'
import type { AdminProps } from '../../frontend/src/components/praxisCard/shared'

// The seven live faction slugs. `na`/null are the neutral (default) treatment.
export const FACTION_SLUGS: string[] = [
  'ua',
  'wow',
  'snide',
  'ephemerists',
  'singularity',
  'everymen',
  'coven',
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
    created_at: NOW,
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    can_sign_up: true,
    allowed_modes: ['solo', 'collab'],
    eligible_for_current_user: true,
    // The *start here* mark (#1861), derived server-side. False on the ordinary
    // fixture task: only the one game-wide onboarding task ever carries it, and
    // only for a character who has never completed it. A preview that wants to
    // draw the mark passes `start_here: true` as an override.
    start_here: false,
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
  coven: 'Brew a tea from three plants you foraged yourself',
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
    // Deliberately a slogan, not the bio's first sentence — the two fields are
    // separate jobs (#1628), and a fixture that blurred them would let a design
    // be built against a distinction the product does not make.
    tagline: 'Slow spells, strong tea.',
    avatar_url: '',
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
  coven: 'Wren Hollowell',
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
  can_apply_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
  second_character_level_required: 5,
  era_name: 'Era One',
  // #811 level-jump allowance. Only WOW carries `level_jump_reach > 0` in
  // Era 1, and this fixture is a UA player — so the affordance stays hidden,
  // which is the correct render for this character, not a missing value.
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
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
    character_avatar_url: '',
    // Approval, and Done, are orthogonal since ADR-0079 — a member may hold
    // either, both or neither — so the fixture carries one of each.
    has_submitted: true,
    is_done: true,
    joined_at: EARLIER,
    submitted_at: NOW,
    nudged_at: null,
  },
  {
    id: 2,
    praxis_id: 501,
    character_id: 12,
    character_display_name: 'Sam Okafor',
    character_avatar_url: '',
    has_submitted: false,
    is_done: false,
    joined_at: EARLIER,
    submitted_at: null,
    nudged_at: null,
  },
]

const SAMPLE_INVITE: PraxisInviteOut = {
  id: 1,
  praxis_id: 501,
  inviter_id: 7,
  invitee_id: 19,
  invitee_display_name: 'Pip Marigold',
  invitee_avatar_url: '',
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
  coven: 'Nettle, yarrow, and a little wild mint from the ditch behind the allotments. Steeped nine minutes. It tasted green and slightly of pennies, and I slept straight through.',
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
    created_by_avatar_url: '',
    created_by_faction_slug: slug,
    created_at: EARLIER,
    updated_at: NOW,
    members: SAMPLE_MEMBERS,
    invites: [SAMPLE_INVITE],
    media_items: SAMPLE_MEDIA,
    // ADR-0053: score = (task_point_value + metatask_points) x display_multiplier
    //           + points_from_votes  ->  (30 + 0) x 1 + 12 = 42
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 12,
    habit_bonus_points: 0,
    score: 42,
    is_top_for_task: true,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
    voter_count: 3,
    viewer_can_vote: true,
    viewer_vote: null,
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
      avatar_url: '',
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
      avatar_url: '',
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
  // ADR-0053: (45 + 0) x 1 + 13 = 58. The old `score: 38` sat BELOW the task's
  // own 45-point base, which the formula cannot produce — it predates the
  // decomposition and nothing typechecked it.
  metatask_points: 0,
  display_multiplier: 1,
  points_from_votes: 13,
  habit_bonus_points: 0,
  score: 58,
  voter_count: 9,
  is_top_for_task: false,
  task_faction_slug: 'everymen',
  body_text: null,
  created_by_avatar_url: '',
  created_by_faction_slug: 'everymen',
  submit_proposed_at: null,
  members: SAMPLE_MEMBERS,
  media_items: SAMPLE_MEDIA,
  applied_metatasks: [],
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
  duel_id: null,
  opponent_praxis_id: null,
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_avatar_url: '',
}

// ---------------------------------------------------------------------------
// Credential card (CredentialCard takes flat props, not a domain type)
// ---------------------------------------------------------------------------

export const mockCredential: CredentialCardProps = {
  displayName: 'Ada Reed',
  handle: 'ada_reed',
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
    // #1193: `"{type}:{source row PK}"`. A feed item owns no row of its own, so
    // this is the only handle the archive can name it by.
    item_key: 'friend_completion:501',
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

// ---------------------------------------------------------------------------
// Faction reference data (mobile surfaces consume these)
// ---------------------------------------------------------------------------

import type { FactionOut } from '../../frontend/src/api/factions'
import type { FactionConfigOut } from '../../frontend/src/api/gameConfig'

/** One `FactionOut` per live faction. `GET /factions` answers only visible
 *  rows, so that is what these carry. */
export const factionOuts: FactionOut[] = FACTION_SLUGS.map((slug) => ({
  slug,
  status: 'visible',
}))

/** A neutral 1× config; overrides tune the multipliers. */
export function makeFactionConfig(overrides: Partial<FactionConfigOut> = {}): FactionConfigOut {
  return {
    slug: 'ua',
    own_task_modifier: 1.5,
    other_task_modifier: 1,
    collab_own_modifier: 1.25,
    collab_other_modifier: 1,
    duel_win_modifier: 1.5,
    duel_loss_modifier: 0.5,
    // "The array" (#1869) — Singularity's perk. False here because the kit's
    // neutral config is exactly that, and the perk has no preview surface: it
    // renders nothing at all, it prints to the devtools console.
    reads_the_array: false,
    ...overrides,
  }
}

/** One config per live faction, for the game-config reference arrays. */
export const gameFactionConfigs: FactionConfigOut[] = FACTION_SLUGS.map((slug) =>
  makeFactionConfig({ slug }),
)

// ---------------------------------------------------------------------------
// PraxisCardOut factory (feed/list rows across mobile surfaces)
// ---------------------------------------------------------------------------

export function makePraxisCard(overrides: Partial<PraxisCardOut> = {}): PraxisCardOut {
  const slug = overrides.task_faction_slug ?? 'ua'
  return {
    id: 601,
    task_id: 101,
    task_title: TASK_TITLE_BY_SLUG[slug ?? 'ua'] ?? 'Plant a native tree',
    task_point_value: 30,
    task_level_required: 2,
    type: 'solo',
    status: 'submitted',
    title: 'Charcoal study, north portico',
    moderation_status: 'visible',
    created_by_id: 7,
    created_by_display_name: NAME_BY_SLUG[slug ?? 'ua'] ?? 'Ada Reed',
    created_at: EARLIER,
    updated_at: NOW,
    submitted_at: NOW,
    member_count: 1,
    // score = (task_point_value + metatask_points) x display_multiplier
    //         + points_from_votes  -> (30 + 0) x 1 + 12 = 42
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 12,
    habit_bonus_points: 0,
    score: 42,
    voter_count: 8,
    is_top_for_task: true,
    task_faction_slug: slug,
    body_text: PRAXIS_BODY_BY_SLUG[slug ?? 'ua'] ?? PRAXIS_BODY_BY_SLUG.ua,
    created_by_avatar_url: '',
    created_by_faction_slug: slug,
    submit_proposed_at: null,
    members: [],
    media_items: SAMPLE_MEDIA,
    applied_metatasks: [],
    viewer_can_vote: true,
    viewer_vote: null,
    voted_by_name: null,
    duel_id: null,
    opponent_praxis_id: null,
    opponent_display_name: null,
    opponent_faction_slug: null,
    opponent_avatar_url: '',
    ...overrides,
  }
}

/** A short in-progress/active list, faction-flavored, for home/task surfaces. */
export function praxisCardsFor(slug: string): PraxisCardOut[] {
  return [
    makePraxisCard({
      id: 601, task_id: 101, task_faction_slug: slug, status: 'submitted',
      task_title: TASK_TITLE_BY_SLUG[slug ?? 'ua'] ?? 'Plant a native tree',
      title: 'Charcoal study, north portico',
    }),
    makePraxisCard({
      id: 602, task_id: 108, task_faction_slug: slug, status: 'in_progress',
      task_title: 'Organize a neighborhood tool library',
      title: 'Second pass, west light',
      submitted_at: null, score: 0, points_from_votes: 0, voter_count: 0, is_top_for_task: false,
    }),
  ]
}

// ---------------------------------------------------------------------------
// Praxis-card moderation bag + duel fixtures (signature families)
// ---------------------------------------------------------------------------

/**
 * The moderation bag every desktop praxis-card archetype takes. Default is the
 * ordinary reader's view: controls off, nothing to report. Pass
 * `{ showAdminControls: true }` for the moderator cell.
 */
export function adminPropsFor(
  praxis: PraxisCardOut,
  overrides: Partial<AdminProps> = {},
): AdminProps {
  return {
    praxis,
    showAdminControls: false,
    onHide: noop,
    onFail: noop,
    moderateError: null,
    ...overrides,
  }
}

/**
 * A live duel mid-flight: the viewer (character 7) has submitted and leads on
 * votes, the opponent has not answered yet. `winner_character_id` and the final
 * point fields stay null — those only populate at era close (ADR-0052), and a
 * `settled` duel is the forfeit beat, not a resolved one.
 */
export function makeDuel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 44,
    task_id: 101,
    status: 'active',
    forfeited_by_character_id: null,
    challenger: {
      praxis_id: 601,
      character_id: 7,
      display_name: 'Ada Reed',
      faction_slug: 'ua',
      avatar_url: '',
      points_from_votes: 42,
      is_submitted: true,
      nudged_at: null,
    },
    opponent: {
      praxis_id: null,
      character_id: 19,
      display_name: 'Pip Marigold',
      faction_slug: 'wow',
      avatar_url: '',
      points_from_votes: 28,
      is_submitted: false,
      nudged_at: null,
    },
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    ...overrides,
  }
}

/** A duel whose two sides wear the given faction, so a skin reads in context. */
export function duelFor(slug: string, overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  const base = makeDuel(overrides)
  return {
    ...base,
    challenger: { ...base.challenger, faction_slug: slug, display_name: NAME_BY_SLUG[slug] ?? base.challenger.display_name },
    opponent: { ...base.opponent, faction_slug: slug },
  }
}

/** A metatask sticker's payload: the condition line + the bonus it carries. */
export function metataskFor(slug: string, overrides: Partial<TaskOut> = {}): TaskOut {
  return taskFor(slug, {
    id: 900,
    title: 'Finish before the first frost',
    point_value: 15,
    task_type: 'metatask',
    metatask_faction_slug: slug,
    ...overrides,
  })
}
