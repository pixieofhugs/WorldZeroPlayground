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
import type { CharacterOut, CurrentUser } from '../api/auth'
import type { DuelDetailOut, DuelSideOut } from '../api/duel'
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
  // The viewer's own draft and their own filed praxis on this task (#2359,
  // #2643) — both null for the modal task, which the viewer has never touched.
  // The suites that care set one or the other; setting BOTH is a state the
  // server does not produce for a task that shut sign-up.
  submitted_praxis_id: null,
  can_sign_up: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
  // The *start here* mark (#1861), derived server-side. False on every task but
  // the one game-wide onboarding task, and on that one only until the viewing
  // character has completed it — so false is the modal value by a mile.
  start_here: false,
  ...over,
})

/**
 * A metatask — the seal a praxis applies, not a task anyone signs up for.
 *
 * Same wire shape as {@link aTask}; the fields that differ are exactly the ones
 * that follow from `task_type: 'metatask'`, so a suite that only needs "a seal
 * to hang on a praxis" says `aMetatask({ metatask_faction_slug: 'coven' })` and
 * nothing else. `metatask_faction_slug` has no default: which faction's seal it
 * is is the only thing a caller ever means by it.
 */
export const aMetatask = (over: Partial<TaskOut> = {}): TaskOut =>
  aTask({
    id: 501,
    title: 'Composting',
    point_value: 60,
    level_required: 0,
    task_type: 'metatask',
    created_by: 9,
    created_by_display_name: '',
    // A metatask is applied to a praxis, never signed up for (#1093).
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
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
 * The signed-in character.
 *
 * Defaults to {@link AUTHOR} — the praxis author every detail suite signs in as
 * when it wants an OWNER's view, so `aCurrentUser()` is already the owner of
 * `aPraxis()` and a suite that wants a visitor overrides `id`.
 *
 * `faction_slug` is a bare `string` on the wire, never null: `na` is the
 * identity every player starts in (ADR-0030), which is why it is the default
 * here rather than an empty string.
 */
export const aCharacter = (over: Partial<CharacterOut> = {}): CharacterOut => ({
  id: AUTHOR.id,
  username: 'ada',
  display_name: AUTHOR.name,
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 5,
  score: 0,
  all_time_score: 0,
  faction_slug: 'na',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
  ...over,
})

/**
 * The `/auth/me` payload — the viewer, not the character.
 *
 * Every capability flag defaults FALSE, which is the wire default too, so a
 * suite that renders a control has to say which flag opened it. `can_comment`
 * is the one exception: the comment region is on the page for an ordinary
 * signed-in player, and defaulting it false would silently delete a section
 * from every detail render.
 */
export const aCurrentUser = (over: Partial<CurrentUser> = {}): CurrentUser => ({
  account_id: 1,
  email: 'wz_pilgrim@example.com',
  provider: 'google',
  character: aCharacter(),
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
  era_name: 'Era 1',
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
  ...over,
})

/** One side of a duel. Defaults to THIS page's side — praxis 1, {@link AUTHOR}. */
export const aDuelSide = (over: Partial<DuelSideOut> = {}): DuelSideOut => ({
  praxis_id: 1,
  character_id: AUTHOR.id,
  display_name: AUTHOR.name,
  faction_slug: 'na',
  avatar_url: '',
  points_from_votes: 0,
  is_submitted: true,
  nudged_at: null,
  ...over,
})

/**
 * A settled duel — both sides cast, no verdict frozen yet.
 *
 * `settled` is the status the detail suites exercise most, because it is the
 * one where unsubmitting forfeits (ADR-0011 §Forfeit); `active` and `declined`
 * are one override away. The frozen-outcome trio stays null: it is populated at
 * era close (ADR-0052), and a live duel that carried one would be a lie.
 */
export const aDuel = (over: Partial<DuelDetailOut> = {}): DuelDetailOut => ({
  id: 5,
  task_id: 7,
  status: 'settled',
  forfeited_by_character_id: null,
  challenger: aDuelSide(),
  opponent: aDuelSide({ praxis_id: 2, character_id: 4, display_name: 'Rax' }),
  winner_character_id: null,
  challenger_final_points: null,
  opponent_final_points: null,
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
