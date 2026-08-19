/**
 * Wire-shaped fixtures for the render tests.
 *
 * Forty-eight test files each hand-built a `TaskOut` / `PraxisOut` /
 * `PraxisCardOut` literal, and the per-faction suites carried the SAME literal
 * eight times over with the slug swapped — two of them byte-identical once the
 * slug was normalised. That is a field's worth of typing every time the backend
 * adds a column, done once per file, and it is the reason a wire-field rename
 * could take sign-up down in #1692 while every test still compiled.
 *
 * These builders carry the boring rest. A test passes ONLY the fields it
 * asserts on, so the fixture reads as the test's premise instead of burying it
 * in sixty lines of scaffolding:
 *
 *     const praxis = aPraxis({ task_faction_slug: 'coven', score: 16 })
 *
 * The shapes come from `components['schemas']`, so a backend field that gains,
 * loses or renames a column fails to compile HERE — once — rather than in
 * forty-eight places or, worse, nowhere.
 *
 * Values are deliberately distinctive ('Sweep The Stoop', 'Ada') so a substring
 * assertion cannot collide with incidental markup. Every id is stable, because
 * several suites assert on hrefs built from them.
 */
import type { PraxisCardOut, PraxisMemberOut, PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'

/** The praxis author, and the viewer most detail suites sign in as. */
export const AUTHOR = { id: 3, name: 'Ada' } as const

/** The task author — a different character, so a byline test can tell them apart. */
export const PROPOSER = { id: 31, name: 'Wren Abalone' } as const

/**
 * Defaults throughout are the value that already appeared most often across the
 * seventy literals this replaced, so a migrated call site overrides only what it
 * actually asserts on. Where no value was clearly modal (the card shapes vary a
 * lot) the pick is the most neutral one.
 */
export const aTask = (over: Partial<TaskOut> = {}): TaskOut => ({
  id: 7,
  title: 'Photosynthesis',
  description: '',
  point_value: 18,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: PROPOSER.id,
  // Required and non-nullable on the wire. `na` is Unaffiliated — the identity
  // every player starts in (ADR-0030), so it is the neutral default, and the
  // per-faction suites override it with their own slug.
  primary_faction_slug: 'na',
  metatask_faction_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  in_progress_count: 0,
  created_by_display_name: PROPOSER.name,
  created_by_avatar_url: '',
  created_by_faction_slug: null,
  created_by_level: 0,
  signup_reason: null,
  in_progress_praxis_id: null,
  can_sign_up: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
  // The *start here* mark (#1861), derived server-side. False on every task but
  // the one game-wide onboarding task, and on that one only until the viewing
  // character has completed it — so false is the modal value by a mile.
  start_here: false,
  ...over,
})

export const aMember = (over: Partial<PraxisMemberOut> = {}): PraxisMemberOut => ({
  id: 101,
  praxis_id: 1,
  character_id: AUTHOR.id,
  character_display_name: AUTHOR.name,
  character_avatar_url: '',
  has_submitted: true,
  // Done is orthogonal to approval (ADR-0079) — a member may be either, both or
  // neither — so it takes its own default rather than following `has_submitted`.
  is_done: false,
  joined_at: '2026-01-01T00:00:00Z',
  nudged_at: null,
  submitted_at: null,
  ...over,
})

/**
 * A submitted solo praxis with one member, one image and a score.
 *
 * The score is the arithmetic the praxis-card breakdown asserts on:
 * (base 12 + meta 0) × 1.0 + 4 from votes = 16. A suite that changes any input
 * has to restate `score` too, which is the point — the number is a claim about
 * the formula, not a magic constant.
 */
export const aPraxis = (over: Partial<PraxisOut> = {}): PraxisOut => ({
  id: 1,
  task_id: 7,
  task_title: 'Sweep The Stoop',
  task_point_value: 12,
  task_level_required: 2,
  task_faction_slug: null,
  type: 'solo',
  status: 'submitted',
  title: 'The Long Way Round',
  body_text: 'Walked the whole ridge before dark.',
  moderation_status: 'visible',
  admin_note: null,
  flagged_at: null,
  submitted_at: '2026-01-03T00:00:00Z',
  submit_proposed_at: null,
  created_by_id: AUTHOR.id,
  created_by_display_name: AUTHOR.name,
  created_by_avatar_url: '',
  created_by_faction_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
  members: [aMember()],
  invites: [],
  media_items: [
    {
      id: 9,
      praxis_id: 1,
      type: 'image',
      file_path: 'proof.png',
      display_order: 0,
      created_at: '2026-01-03T00:00:00Z',
    },
  ],
  score: 16,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  habit_bonus_points: 0,
  is_top_for_task: false,
  duel_id: null,
  can_flag: true,
  applied_metatasks: [],
  viewer_can_vote: true,
  viewer_vote: null,
  voter_count: 0,
  ...over,
})

/**
 * The list-shaped praxis — what a feed, a gallery or a profile grid renders.
 *
 * Nearly the whole of `PraxisOut` plus the duel byline (`opponent_*`) and
 * `voted_by_name`, which only the card carries. Kept as its own builder rather
 * than derived from `aPraxis`: they are two wire shapes, and deriving one from
 * the other would hide the day they diverge.
 */
export const aPraxisCard = (over: Partial<PraxisCardOut> = {}): PraxisCardOut => ({
  id: 55,
  task_id: 7,
  task_title: 'Sweep The Stoop',
  task_point_value: 12,
  task_level_required: 2,
  task_faction_slug: null,
  type: 'solo',
  status: 'submitted',
  title: 'Seedlings',
  body_text: null,
  moderation_status: 'visible',
  created_by_id: AUTHOR.id,
  created_by_display_name: AUTHOR.name,
  created_by_avatar_url: '',
  created_by_faction_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  submitted_at: '2026-01-02T00:00:00Z',
  submit_proposed_at: null,
  member_count: 1,
  // A card lists no members: the roster is a DETAIL concern, and the suites
  // that do assert on it pass their own.
  members: [],
  media_items: [],
  applied_metatasks: [],
  score: 16,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  habit_bonus_points: 0,
  is_top_for_task: false,
  duel_id: null,
  opponent_praxis_id: null,
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_avatar_url: '',
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
  ...over,
})

/**
 * A faction's praxis, task and card in one call — the per-faction detail suites
 * differ from each other by exactly this and nothing else.
 */
export const forFaction = (slug: string) => ({
  task: aTask({ primary_faction_slug: slug }),
  praxis: aPraxis({ task_faction_slug: slug, created_by_faction_slug: slug }),
  card: aPraxisCard({ task_faction_slug: slug }),
})
