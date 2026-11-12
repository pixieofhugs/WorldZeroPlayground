/**
 * Wire-shaped fixtures for the render tests. A test passes ONLY the fields it
 * asserts on: `aPraxis({ task_faction_slug: 'coven', score: 16 })`. Shapes come
 * from `components['schemas']`, so a wire change fails to compile here once (#1692).
 * Values are distinctive so substring asserts can't collide; ids are stable (hrefs).
 */
import type { CharacterOut, CurrentUser } from '../api/auth'
import type { DuelDetailOut, DuelSideOut } from '../api/duel'
import type { PraxisCardOut, PraxisMemberOut, PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'
import type { CreateCharacterState } from '../pages/characterPaths/useCreateCharacter'
import type { EditCharacterState } from '../pages/characterPaths/useEditCharacter'
import type { EditPraxisState } from '../pages/editPraxis/editPraxisState'

/** The praxis author, and the viewer most detail suites sign in as. */
export const AUTHOR = { id: 3, name: 'Ada' } as const

/** The task author, distinct from AUTHOR for byline tests. */
export const PROPOSER = { id: 31, name: 'Wren Abalone' } as const

/** Defaults are the modal (else most neutral) value across call sites. */
export const aTask = (over: Partial<TaskOut> = {}): TaskOut => ({
  id: 7,
  title: 'Photosynthesis',
  description: '',
  point_value: 18,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: PROPOSER.id,
  // Non-nullable; `na` (Unaffiliated, ADR-0030) is the neutral default.
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
  // Viewer's draft / filed praxis (#2359). Never set BOTH: the server doesn't.
  submitted_praxis_id: null,
  can_sign_up: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
  // *start here* mark (#1861): true only on the onboarding task until done.
  start_here: false,
  viewer_faction_multiplier: 1,
  ...over,
})

/** A metatask (seal applied to a praxis). `metatask_faction_slug` has no default. */
export const aMetatask = (over: Partial<TaskOut> = {}): TaskOut =>
  aTask({
    id: 501,
    title: 'Composting',
    point_value: 60,
    level_required: 0,
    task_type: 'metatask',
    created_by: 9,
    created_by_display_name: '',
    // Never signed up for (#1093).
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
  // Done is orthogonal to approval (ADR-0079).
  is_done: false,
  joined_at: '2026-01-01T00:00:00Z',
  nudged_at: null,
  submitted_at: null,
  ...over,
})

/**
 * A submitted solo praxis, one member, one image. score = (12 + 0) × 1.0 + 4 = 16;
 * change an input, restate `score`.
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

/** List-shaped praxis. Not derived from `aPraxis`: separate wire shapes may diverge. */
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
  // Roster is a detail concern.
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

/** The signed-in character; {@link AUTHOR}, so the owner of `aPraxis()`. */
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
 * `/auth/me`. Capability flags default false (the wire default), except
 * `can_comment`: false would silently drop a section from every detail render.
 */
export const aCurrentUser = (over: Partial<CurrentUser> = {}): CurrentUser => ({
  account_id: 1,
  email: 'wz_pilgrim@example.com',
  provider: 'google',
  character: aCharacter(),
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
  win_multiplier: 1,
  loss_multiplier: 1,
  tie_multiplier: 1,
  ...over,
})

/**
 * A settled duel (unsubmitting forfeits, ADR-0011). Frozen-outcome fields stay
 * null: set only at era close (ADR-0052).
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

/** A faction's task, praxis and card for the per-faction suites. */
export const forFaction = (slug: string) => ({
  task: aTask({ primary_faction_slug: slug }),
  praxis: aPraxis({ task_faction_slug: slug, created_by_faction_slug: slug }),
  card: aPraxisCard({ task_faction_slug: slug }),
})

const noop = () => {}
const asyncNoop = async () => {}

/**
 * The composer's UI state (#2877): the quietest composer that renders — a draft
 * solo praxis, nothing open, every capability flag false. `autoSubmitDays` is
 * null: an `EraConfig` value from `/game-config` (ADR-0012), not yet arrived.
 */
export const anEditPraxisState = (
  over: Partial<EditPraxisState> = {},
): EditPraxisState => ({
  loading: false,
  phase: 'composing',
  // A draft (pre-cast), so no votes: 12 × 1.0 + 0.
  praxis: aPraxis({
    status: 'in_progress',
    submitted_at: null,
    media_items: [],
    score: 12,
    points_from_votes: 0,
    voter_count: 0,
    viewer_can_vote: false,
  }),
  task: aTask(),
  error: '',
  setError: noop,

  title: 'The Long Way Round',
  setTitle: noop,
  body: 'Walked the whole ridge before dark.',
  setBody: noop,

  media: [],
  fileError: '',
  handleFileChange: noop,
  pickFromGooglePhotos: async () => {},
  removeMedia: asyncNoop,

  pendingImage: null,
  confirmImageEdit: asyncNoop,
  cancelImageEdit: noop,
  reportImageError: noop,

  switchingMode: null,
  changeMode: asyncNoop,

  inviteQuery: '',
  setInviteQuery: noop,
  inviteResults: [],
  inviteOpen: false,
  setInviteOpen: noop,
  inviting: false,
  sendInvite: asyncNoop,
  cancelInvite: asyncNoop,
  kickMember: asyncNoop,
  nudge: asyncNoop,
  nudgeCrew: asyncNoop,
  crewNudge: null,

  duel: null,
  sendChallenge: asyncNoop,
  cancelDuel: asyncNoop,
  dissolveDuel: asyncNoop,

  metatasks: [],
  appliedMetatasks: new Set<number>(),
  appliedMetataskList: [],
  applyingMetatask: null,
  addMetatask: asyncNoop,
  metataskPickerOpen: false,
  openMetataskPicker: noop,
  closeMetataskPicker: noop,
  metataskRemovalTarget: null,
  requestRemoveMetatask: noop,
  confirmRemoveMetatask: asyncNoop,
  cancelRemoveMetatask: noop,

  submitting: false,
  publish: asyncNoop,
  markDone: asyncNoop,
  propose: asyncNoop,
  saveDraft: asyncNoop,
  pullBack: asyncNoop,
  reopenForEdit: asyncNoop,
  leaveCollab: asyncNoop,
  cancel: asyncNoop,

  collabSuccess: false,
  continueFromCollabSuccess: noop,

  duelSealOpen: false,
  requestDuelSeal: noop,
  cancelDuelSeal: noop,

  pendingConfirm: null,
  acceptConfirm: noop,
  dismissConfirm: noop,

  autosaveAt: null,
  setAutosaveAt: noop,

  autoSubmitDays: null,

  proposalConfirmArmed: false,
  confirmProposalEdit: noop,

  isPublished: false,
  controlsLocked: false,
  modeIsLocked: false,
  showInviteBox: false,
  canSealMetatask: false,
  showSealStack: false,
  duelMode: false,
  duelChipVisible: false,

  currentCharacterId: AUTHOR.id,
  ...over,
})

/**
 * Edit Character's UI state (#2991): a loaded, owned, filled form. `canSubmit` is
 * true (a valid name is in the box; the #1697 gate passes its own false). The
 * editable values mirror `character` as `useEditCharacter` does on load; for a
 * dirty form override the value, not the character.
 */
export const anEditCharacterState = (
  over: Partial<EditCharacterState> = {},
): EditCharacterState => {
  const character = over.character ?? aCharacter({
    bio: 'Doing very human things.',
    tagline: 'Slow spells, strong tea.',
    location: 'PDX',
    level: 4,
    score: 340,
    all_time_score: 340,
  })
  return {
    id: String(character.id),
    character,
    loading: false,
    isOwner: true,

    displayName: character.display_name,
    setDisplayName: noop,
    bio: character.bio ?? '',
    setBio: noop,
    tagline: character.tagline ?? '',
    setTagline: noop,
    location: character.location ?? '',
    setLocation: noop,

    avatarFile: null,
    avatarSource: null,
    setAvatarSource: noop,
    avatarPreview: null,
    avatarError: '',
    setAvatarError: noop,
    handleAvatarChange: noop,
    handleAvatarConfirm: noop,

    saving: false,
    canSubmit: true,
    error: '',
    handleSubmit: noop,

    deleting: false,
    handleDelete: noop,

    // Nothing offered: the faction row renders as a link (#3149).
    faction: aFactionPicker({ current: character.faction_slug, picked: character.faction_slug }),
    ...over,
  }
}

/** Edit Character's faction row model (#3149): in WoW, nothing picked, nothing on offer. */
export const aFactionPicker = (
  over: Partial<EditCharacterState['faction']> = {},
): EditCharacterState['faction'] => ({
  current: 'wow',
  picked: 'wow',
  offered: [],
  pick: noop,
  touched: false,
  confirming: false,
  cancelConfirm: noop,
  confirm: async () => {},
  saving: false,
  ...over,
})

/**
 * Create Character's UI state (#2993): a name typed, nothing else, no picker.
 * `canSubmit` true as in {@link anEditCharacterState}. `handle` (ADR-0019)
 * matches {@link aCharacter}'s username.
 */
export const aCreateCharacterState = (
  over: Partial<CreateCharacterState> = {},
): CreateCharacterState => ({
  displayName: 'Molly',
  setDisplayName: noop,
  bio: '',
  setBio: noop,
  tagline: '',
  setTagline: noop,
  factionSlug: '',
  setFactionSlug: noop,

  invited: [],
  showPicker: false,

  avatarFile: null,
  avatarPreview: null,
  avatarSource: null,
  setAvatarSource: noop,
  avatarError: '',
  setAvatarError: noop,
  handleAvatarChange: noop,
  handleAvatarConfirm: noop,

  error: null,
  submitting: false,
  canSubmit: true,
  handleSubmit: noop,
  handle: 'molly',
  ...over,
})
