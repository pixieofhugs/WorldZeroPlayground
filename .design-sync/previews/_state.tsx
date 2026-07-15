// Per-surface STATE fixtures for the mobile page-archetype previews.
//
// Each mobile archetype renders a full screen from a single hook-shaped `state`
// (FieldDeskHomeState, TasksState, …). These builders assemble a realistic,
// fully-typed state object from the shared domain fixtures in ./_fixtures so a
// faction skin renders its populated screen — not an empty/loading shell.
// Callbacks are no-ops; setters are no-ops. Faction skins pass a slug to flavor
// the character + content (characterFor/taskFor/makePraxis are slug-aware).

import type { FieldDeskHomeState } from '../../frontend/src/pages/fieldDesk/useFieldDeskHome'
import type { TasksState, SignupMessage } from '../../frontend/src/pages/tasks/useTasks'
import type { TaskDetailState } from '../../frontend/src/pages/taskDetail/useTaskDetail'
import type { PraxisDetailState } from '../../frontend/src/pages/praxisDetail/usePraxisDetail'
import type { EditPraxisState } from '../../frontend/src/pages/editPraxis/useEditPraxis'
import type { FactionDetailState } from '../../frontend/src/pages/factionDetail/useFactionDetail'
import type { CreateCharacterState } from '../../frontend/src/pages/characterPaths/useCreateCharacter'
import type { EditCharacterState } from '../../frontend/src/pages/characterPaths/useEditCharacter'
import type { ProfileBodyProps } from '../../frontend/src/pages/characterProfile/FactionProfileBody'
import type { PlayersDirectoryProps } from '../../frontend/src/pages/players/mobileArchetypes/DefaultPlayers'
import type { TaskSignupOut } from '../../frontend/src/api/tasks'
import type { VoterDetail } from '../../frontend/src/api/votes'
import {
  characterFor,
  makeCharacter,
  taskFor,
  makePraxis,
  makePraxisCard,
  praxisCardsFor,
  mockUser,
  factionOuts,
  gameFactionConfigs,
  noop,
} from './_fixtures'

/** async no-op for the many `() => Promise<void>` handler fields. */
const anoop = async (): Promise<void> => {}

// ── fieldDesk ──────────────────────────────────────────────────────────────
/** A carried life at a glance: mid-level character, two active quests. */
export function fieldDeskState(slug: string): FieldDeskHomeState {
  return {
    character: characterFor(slug, { level: 4, score: 320, all_time_score: 1180 }),
    eraName: 'Era One',
    votesReceived: 47,
    activeTasks: praxisCardsFor(slug),
    pendingCount: 2,
    loadingTasks: false,
    canProposeTask: true,
  }
}

// ── tasks (browse) ───────────────────────────────────────────────────────────
const SIGNUP_OK: SignupMessage = { id: 101, msg: 'Signed up — good luck.', ok: true }
/** A scannable task list, a spread of factions so the chips have range. */
export function tasksState(slug: string): TasksState {
  return {
    user: mockUser,
    tasks: [
      taskFor(slug, { id: 101, level_required: 2, point_value: 30 }),
      taskFor('everymen', { id: 108, level_required: 3, point_value: 45 }),
      taskFor('ephemerists', { id: 112, level_required: 4, point_value: 25 }),
      taskFor('wow', { id: 115, level_required: 1, point_value: 20 }),
    ],
    loading: false,
    error: null,
    factions: factionOuts,
    factionConfigs: gameFactionConfigs,
    levelFilters: [1, 2, 3, 4, 5, 6, 7, 8],
    statusFilters: ['active', 'completed'],
    status: 'active',
    setStatus: noop,
    faction: slug,
    setFaction: noop,
    level: '',
    setLevel: noop,
    signupMsg: SIGNUP_OK,
    handleSignup: anoop,
    displayPointsFor: (task) => task.point_value,
  }
}

// ── taskDetail ───────────────────────────────────────────────────────────────
const SIGNUPS: TaskSignupOut[] = [
  { character_id: 12, display_name: 'Sam Okafor', avatar_url: '', faction_slug: 'everymen', status: 'active', signed_up_at: '2026-06-28T09:12:00Z' },
  { character_id: 19, display_name: 'Pip Marigold', avatar_url: '', faction_slug: 'wow', status: 'active', signed_up_at: '2026-06-29T10:00:00Z' },
]
/** A task with a few ranked submissions and open slots. */
export function taskDetailState(slug: string): TaskDetailState {
  const submissions = praxisCardsFor(slug)
  return {
    loading: false,
    task: taskFor(slug, { level_required: 3, point_value: 30 }),
    fetchError: null,
    submissions,
    signups: SIGNUPS,
    friends: new Set<number>([12]),
    foes: new Set<number>(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    slotsOpen: 3,
    maxTaskSlots: 5,
    factionMultiplier: 1.5,
    modifiedPoints: 45,
    topScore: 42,
    voteCount: 8,
    submissionSort: 'score',
    setSubmissionSort: noop,
    sortedSubmissions: submissions,
    signupError: null,
    handleSignup: anoop,
    handleDrop: anoop,
  }
}

// ── praxisDetail ─────────────────────────────────────────────────────────────
const VOTERS: VoterDetail[] = [
  { character_id: 12, display_name: 'Sam Okafor', avatar_url: '', faction_slug: 'everymen', value: 5 },
  { character_id: 19, display_name: 'Pip Marigold', avatar_url: '', faction_slug: 'wow', value: 4 },
  { character_id: 22, display_name: 'Dr. Iris Vale', avatar_url: '', faction_slug: 'ephemerists', value: 5 },
]
/** A submitted praxis the viewer owns, with votes and voters. */
export function praxisDetailState(slug: string): PraxisDetailState {
  return {
    loading: false,
    praxis: makePraxis({ task_faction_slug: slug, created_by_faction_slug: slug }),
    fetchError: null,
    votes: { praxis_id: 501, total_votes: 8, total_score: 42 },
    voters: VOTERS,
    duel: null,
    isOwner: true,
    showAdminBar: false,
    user: mockUser,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: noop,
    withdrawError: null,
    adminFailNote: '',
    setAdminFailNote: noop,
    showFailInput: false,
    setShowFailInput: noop,
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: noop,
    flagReason: null,
    setFlagReason: noop,
    flagDetail: '',
    setFlagDetail: noop,
    flagging: false,
    flagError: null,
    setFlagError: noop,
    flagSubmitted: false,
    handleModerate: anoop,
    handleWithdraw: anoop,
    handleResubmit: anoop,
    handleFlag: anoop,
    metatasks: [],
    metataskLoading: false,
    metataskError: null,
    applyingMetataskId: null,
    removingMetataskId: null,
    handleApplyMetatask: anoop,
    handleRemoveMetatask: anoop,
  }
}

// ── editPraxis (composer) ────────────────────────────────────────────────────
/** A draft in the composer — title, body, no locked controls. */
export function editPraxisState(slug: string): EditPraxisState {
  return {
    loading: false,
    praxis: makePraxis({ task_faction_slug: slug, created_by_faction_slug: slug, status: 'draft', submitted_at: null }),
    task: taskFor(slug),
    error: '',
    setError: noop,
    title: 'Charcoal study, north portico',
    setTitle: noop,
    body: 'Two hours at the north portico with a stick of vine charcoal. I let the cornice go soft and pressed hard only where the light broke.',
    setBody: noop,
    wordCount: 26,
    media: [],
    fileError: '',
    handleFileChange: noop,
    removeMedia: anoop,
    pendingImage: null,
    confirmImageEdit: anoop,
    cancelImageEdit: noop,
    switchingMode: null,
    changeMode: anoop,
    inviteQuery: '',
    setInviteQuery: noop,
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: noop,
    inviting: false,
    sendInvite: anoop,
    cancelInvite: anoop,
    duel: null,
    sendChallenge: anoop,
    cancelDuel: anoop,
    metaTasks: [],
    appliedMetatasks: new Set<number>(),
    applyingMetatask: null,
    toggleMetatask: anoop,
    submitting: false,
    publish: anoop,
    cancel: anoop,
    autosaveAt: null,
    saveStatus: 'idle',
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showMetatasks: true,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: 7,
  }
}

// ── factionDetail (faction page) ──────────────────────────────────────────────
/** A faction page: members, tasks, recent praxis, viewer not yet a member. */
export function factionDetailState(slug: string): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug },
    fetchError: null,
    members: [characterFor(slug), characterFor(slug, { id: 8, display_name: 'Kestrel Ng', level: 6 })],
    tasks: [taskFor(slug), taskFor(slug, { id: 116, title: 'A second charge', level_required: 5 })],
    recentPraxis: praxisCardsFor(slug),
    viewerFactionSlug: 'na',
    gameFactions: gameFactionConfigs,
    membership: {
      state: 'eligible',
      currentFactionSlug: null,
      join: anoop,
      joining: false,
      joinError: null,
    },
  }
}

// ── characterPaths (create / edit) ────────────────────────────────────────────
/** A half-filled create-character form. */
export function createCharacterState(slug: string): CreateCharacterState {
  return {
    displayName: 'Ada Reed',
    setDisplayName: noop,
    bio: 'Cartographer of small kindnesses.',
    setBio: noop,
    factionSlug: slug,
    setFactionSlug: noop,
    invited: [],
    avatarPreview: null,
    avatarSource: null,
    setAvatarSource: noop,
    handleFile: noop,
    handleAvatarConfirm: noop,
    error: null,
    submitting: false,
    canSubmit: true,
    handleSubmit: noop,
    handle: 'ada_reed',
    showPicker: false,
  }
}

/** An edit-character form for an owned mid-level life. */
export function editCharacterState(slug: string): EditCharacterState {
  return {
    id: '7',
    character: characterFor(slug),
    loading: false,
    isOwner: true,
    displayName: 'Ada Reed',
    setDisplayName: noop,
    bio: 'Cartographer of small kindnesses.',
    setBio: noop,
    location: 'Portland, OR',
    setLocation: noop,
    avatarFile: null,
    avatarSource: null,
    setAvatarSource: noop,
    avatarError: '',
    handleAvatarChange: noop,
    handleAvatarConfirm: noop,
    saving: false,
    error: '',
    handleSubmit: noop,
    deleting: false,
    handleDelete: noop,
  }
}

// ── characterProfile ──────────────────────────────────────────────────────────
/** A character's own profile — praxis, proposed tasks, progression bar. */
export function profileProps(slug: string): ProfileBodyProps {
  return {
    character: characterFor(slug, { level: 4, score: 320 }),
    submissions: praxisCardsFor(slug),
    proposedTasks: [taskFor(slug, { id: 121, title: 'A charge I authored' })],
    progression: { nextLevel: 5, currentThreshold: 250, nextThreshold: 500, progressPercent: 28 },
    identityActions: null,
  }
}

// ── players (directory) ───────────────────────────────────────────────────────
/** A directory of players across factions. */
export const playersProps: PlayersDirectoryProps = {
  characters: [
    characterFor('ua', { id: 7 }),
    characterFor('wow', { id: 19 }),
    characterFor('snide', { id: 31 }),
    characterFor('ephemerists', { id: 22 }),
    characterFor('everymen', { id: 12 }),
    characterFor('singularity', { id: 44 }),
    makeCharacter({ id: 2, display_name: 'Unaffiliated Wanderer', faction_slug: 'na', level: 1, score: 12 }),
  ],
  loading: false,
  error: null,
  myCharId: 7,
}
