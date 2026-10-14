// Shared, fully-typed fixtures for the faction copy sheet (copied from
// `.design-sync/previews/_fixtures.tsx` — see sheetState.tsx for why).
//
// Every value is annotated against the REAL domain types imported (type-only,
// erased at build) from frontend/src/api/*. Content is realistic World Zero
// material — real-sounding task titles and faction-flavored praxis prose — so a
// captured cell reads like the live app, not foo/bar. Factories fill every
// required field; `overrides` shallow-merges on top.
//
import type { TaskOut } from '../../../api/tasks'
import type { CharacterOut, BadgeOut } from '../../../api/auth'
import type { PraxisCardOut, MediaItemOut } from '../../../api/praxis'

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
    submitted_praxis_id: null,
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


// ---------------------------------------------------------------------------
// Praxis (proof-of-work)
// ---------------------------------------------------------------------------


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



/** A convenient noop for callback props. */
export const noop = (): void => {}

// ---------------------------------------------------------------------------
// Faction reference data (mobile surfaces consume these)
// ---------------------------------------------------------------------------

import type { FactionConfigOut } from '../../../api/gameConfig'


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
    takes_duel_ties: false,
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

