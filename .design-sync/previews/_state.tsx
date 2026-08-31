// Per-surface STATE fixtures for the mobile page-archetype previews.
//
// Each mobile archetype renders a full screen from a single hook-shaped `state`
// (FieldDeskHomeState, TasksState, …). These builders assemble a realistic,
// fully-typed state object from the shared domain fixtures in ./_fixtures so a
// faction skin renders its populated screen — not an empty/loading shell.
// Callbacks are no-ops; setters are no-ops. Faction skins pass a slug to flavor
// the character + content (characterFor/taskFor/makePraxis are slug-aware).

import type { FieldDeskHomeState } from '../../frontend/src/pages/fieldDesk/useFieldDeskHome'
import type { TasksState } from '../../frontend/src/pages/tasks/useTasks'
import type { TaskDetailState } from '../../frontend/src/pages/taskDetail/useTaskDetail'
import type { PraxisDetailState } from '../../frontend/src/pages/praxisDetail/usePraxisDetail'
import type { EditPraxisState } from '../../frontend/src/pages/editPraxis/useEditPraxis'
import type { FactionDetailState } from '../../frontend/src/pages/factionDetail/useFactionDetail'
import type { FactionsDirectoryState } from '../../frontend/src/pages/factions/useFactionsDirectory'
import type { CreateCharacterState } from '../../frontend/src/pages/characterPaths/useCreateCharacter'
import type { EditCharacterState } from '../../frontend/src/pages/characterPaths/useEditCharacter'
import type { ProposeTaskState } from '../../frontend/src/pages/proposeTask/useProposeTask'
import type { ProfileBodyProps } from '../../frontend/src/pages/characterProfile/FactionProfileBody'
import type { PlayersViewProps } from '../../frontend/src/pages/players/playersData'
import { NO_RELATIONSHIPS, rankPlayers } from '../../frontend/src/pages/players/playersData'
import type { VoterDetail } from '../../frontend/src/api/votes'
import {
  characterFor,
  makeCharacter,
  taskFor,
  makePraxis,
  praxisCardsFor,
  mockComments,
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
    // The design's worked example: 320 points, 180 short of level 5 (#1553).
    // The BAR reads the current band since #2127 — 70 into the 250 that
    // separate level 4 from level 5 — and matches `profileProps` below, which
    // is the whole point of that issue. The 180 lives in the caption.
    levelTrack: {
      nextLevel: 5,
      pointsToNext: 180,
      currentThreshold: 250,
      nextThreshold: 500,
      pointsIntoLevel: 70,
      levelSpan: 250,
      fillPercent: 28,
    },
    activeTasks: praxisCardsFor(slug),
    // The pending row's obligation state (#1554) — the one worth previewing,
    // since the other two are the same pill with less in it.
    pendingRow: { kind: 'requests', count: 2, to: '/updates#requests-queue' },
    loadingTasks: false,
    // The kit previews the trigger present: a skin that draws no CHARACTERS
    // pill at all is the thing #2111's gate must not be mistaken for.
    offersACharacterChoice: true,
  }
}

// ── tasks (browse) ───────────────────────────────────────────────────────────
/**
 * The signup line is only ever a FAILURE (#2188): the success path navigates
 * to the new praxis composer, so there is no page left to congratulate anyone
 * on. This used to preview an `ok: true` message the app could not produce.
 */
const SIGNUP_FAILED = 'Could not sign up — make sure you are logged in.'
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
    statusFilters: ['active', 'completed'],
    taskType: 'standard',
    setTaskType: noop,
    // Ordering (#1364), defaulting to `TASK_SORT_DEFAULT`.
    sort: 'level',
    setSort: noop,
    status: 'active',
    setStatus: noop,
    // The faction axis is a multi-select union now, not a single slug — empty
    // means "every faction", so the preview seeds it with its own.
    selectedFactions: [slug],
    setSelectedFactions: noop,
    // "Tasks I can sign up for" (#1130) defaults OFF: the page is a catalogue.
    canSignUp: false,
    setCanSignUp: noop,
    query: '',
    setQuery: noop,
    clearFilters: noop,
    hasMore: false,
    loadMore: noop,
    signupMsg: SIGNUP_FAILED,
    handleSignup: anoop,
    displayPointsFor: (task) => task.point_value,
    // era_1 neutralises the faction modifier to 1.0 — no ×badge on any card.
    displayMultiplierFor: () => 1,
  }
}

// ── factions (directory) ─────────────────────────────────────────────────────
/**
 * The populated factions grid. #1101 moved this surface off its own fetch and
 * onto a passed state — the provider's GET /factions mock no longer reaches it.
 */
export function factionsDirectoryState(): FactionsDirectoryState {
  return {
    factions: factionOuts,
    factionPage: null,
    loading: false,
    error: null,
  }
}

// ── taskDetail ───────────────────────────────────────────────────────────────
/** A task with a few ranked submissions and open slots. */
export function taskDetailState(slug: string): TaskDetailState {
  const submissions = praxisCardsFor(slug)
  return {
    loading: false,
    task: taskFor(slug, { level_required: 3, point_value: 30 }),
    fetchError: null,
    submissions,
    // No `signups`: nothing on task detail renders a roster, the population is
    // the `inProgressCount` header alone (owner ruling 2026-07-28, reversing
    // epic #1028 decision 3). `detailContract.test.tsx` pins the absence.
    comments: mockComments,
    friends: new Set<number>([12]),
    foes: new Set<number>(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 3,
    maxTaskSlots: 5,
    basePoints: 30,
    // era_1 neutralises every faction modifier to 1.0, so the `x n` badge is
    // correctly invisible. The old 1.5 / 45 pair previewed a badge no viewer
    // can see and a total the live config cannot produce.
    factionMultiplier: 1,
    modifiedPoints: 30,
    inProgressCount: 2,
    topScore: 42,
    voteCount: 8,
    submissionSort: 'score',
    setSubmissionSort: noop,
    sortedSubmissions: submissions,
    signupError: null,
    handleSignup: anoop,
    handleDrop: anoop,
    dropConfirm: null,
  }
}

// ── praxisDetail ─────────────────────────────────────────────────────────────
const VOTERS: VoterDetail[] = [
  { character_id: 12, display_name: 'Sam Okafor', avatar_url: '', faction_slug: 'everymen', value: 5 },
  { character_id: 19, display_name: 'Pip Marigold', avatar_url: '', faction_slug: 'wow', value: 4 },
  { character_id: 22, display_name: 'Dr. Iris Vale', avatar_url: '', faction_slug: 'ephemerists', value: 5 },
]
/** A submitted praxis the viewer owns, with its voters. */
export function praxisDetailState(slug: string): PraxisDetailState {
  return {
    loading: false,
    praxis: makePraxis({ task_faction_slug: slug, created_by_faction_slug: slug }),
    fetchError: null,
    // No `votes` summary any more — the tally lives on the praxis itself
    // (`score` / `voter_count`, ADR-0053) and `voters` carries the detail.
    voters: VOTERS,
    duel: null,
    comments: mockComments,
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
    // No `handleResubmit` twin (#1089): ADR-0062 sends 'in_progress' and
    // 'pending' back to the composer, so detail's CAST control and its handler
    // were dead on arrival and were deleted rather than left dormant.
    handleWithdraw: anoop,
    handleFlag: anoop,
    handleKickMember: anoop,
    // Metatasks are READ-ONLY on detail (#1093). The seal stack draws
    // `praxis.applied_metatasks`; the catalog fetch and apply/remove handlers
    // this builder still carried no longer exist.
  }
}

// ── editPraxis (composer) ────────────────────────────────────────────────────
/** A draft in the composer — title, body, no locked controls. */
export function editPraxisState(slug: string): EditPraxisState {
  return {
    loading: false,
    // 'draft' left `PraxisStatus`; an unsubmitted composer praxis is
    // 'in_progress'.
    phase: 'composing',
    praxis: makePraxis({
      task_faction_slug: slug,
      created_by_faction_slug: slug,
      status: 'in_progress',
      submitted_at: null,
    }),
    task: taskFor(slug),
    error: '',
    setError: noop,
    title: 'Charcoal study, north portico',
    setTitle: noop,
    body: 'Two hours at the north portico with a stick of vine charcoal. I let the cornice go soft and pressed hard only where the light broke.',
    setBody: noop,
    media: [],
    fileError: '',
    handleFileChange: noop,
    removeMedia: anoop,
    pendingImage: null,
    confirmImageEdit: anoop,
    cancelImageEdit: noop,
    reportImageError: noop,
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
    kickMember: anoop,
    nudge: anoop,
    // The bulk press and its receipt (#1418). `null` is the pre-press state, so
    // the preview draws the button with no report beneath it.
    nudgeCrew: anoop,
    crewNudge: null,
    duel: null,
    sendChallenge: anoop,
    cancelDuel: anoop,
    dissolveDuel: anoop,
    metatasks: [],
    appliedMetatasks: new Set<number>(),
    appliedMetataskList: [],
    applyingMetatask: null,
    addMetatask: anoop,
    metataskPickerOpen: false,
    openMetataskPicker: noop,
    closeMetataskPicker: noop,
    metataskRemovalTarget: null,
    requestRemoveMetatask: noop,
    confirmRemoveMetatask: anoop,
    cancelRemoveMetatask: noop,
    submitting: false,
    publish: anoop,
    markDone: anoop,
    propose: anoop,
    saveDraft: anoop,
    pullBack: anoop,
    reopenForEdit: anoop,
    leaveCollab: anoop,
    cancel: anoop,
    collabSuccess: false,
    continueFromCollabSuccess: noop,
    duelSealOpen: false,
    requestDuelSeal: noop,
    cancelDuelSeal: noop,
    pendingConfirm: null,
    acceptConfirm: noop,
    dismissConfirm: noop,
    autosaveAt: null,
    setAutosaveAt: () => {},
    autoSubmitDays: null,
    // Drafting: no proposal is live, so the editor asks nothing (ADR-0079).
    // #1745's `documentFrozen` and #1931's seal latch went with the freeze.
    proposalConfirmArmed: false,
    confirmProposalEdit: noop,
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    canSealMetatask: true,
    showSealStack: false,
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
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [characterFor(slug), characterFor(slug, { id: 8, display_name: 'Kestrel Ng', level: 6 })],
    tasks: [taskFor(slug), taskFor(slug, { id: 116, title: 'A second charge', level_required: 5 })],
    recentPraxis: praxisCardsFor(slug),
    viewerFactionSlug: 'na',
    gameFactions: gameFactionConfigs,
    // A signed-in viewer, so the task cards on a faction page offer their tasks
    // (#2188). `noop` is enough — a preview never presses anything.
    onSignup: noop,
    signupMsg: null,
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
    tagline: 'Slow spells, strong tea.',
    setTagline: noop,
    factionSlug: slug,
    setFactionSlug: noop,
    invited: [],
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
    tagline: 'Slow spells, strong tea.',
    setTagline: noop,
    location: 'Portland, OR',
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
    // The name is filled in, so the Save control is open (#1697).
    canSubmit: true,
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
    progression: {
      nextLevel: 5,
      currentThreshold: 250,
      nextThreshold: 500,
      pointsIntoLevel: 70,
      levelSpan: 250,
      progressPercent: 28,
    },
    identityActions: null,
  }
}

// ── players ───────────────────────────────────────────────────────────────────
/** A field of players across factions: podium, faction race and roster (#1855). */
export const playersProps: PlayersViewProps = {
  ranked: rankPlayers(
    [
      characterFor('ua', { id: 7 }),
      characterFor('wow', { id: 19 }),
      characterFor('snide', { id: 31 }),
      characterFor('ephemerists', { id: 22 }),
      characterFor('everymen', { id: 12 }),
      characterFor('singularity', { id: 44 }),
      makeCharacter({ id: 2, display_name: 'Unaffiliated Wanderer', faction_slug: 'na', level: 1, score: 12 }),
    ],
    'era',
  ),
  scoreMode: 'era',
  onScoreMode: noop,
  eyebrow: 'Renaissance · The Standings',
  myCharId: 7,
  related: NO_RELATIONSHIPS,
  latest: {
    7: { taskTitle: 'Left a jar of soup on a stranger’s step', submittedAt: '2026-08-10T09:00:00Z' },
  },
}

// ── proposeTask ───────────────────────────────────────────────────────────────
/**
 * A complete, eligible proposer mid-compose — the shape
 * `src/pages/proposeTask/__tests__/proposeTaskState.ts` builds for the suites,
 * with the form FILLED rather than at its opening position. The test fixture
 * opens empty (that is the page's first paint); a preview card wants the
 * populated form, which is the state a reader learns the surface from.
 *
 * `slug` is the task's TARGET faction, which is what picks the archetype — the
 * one case an Albescent dress would ever be seen (#2538).
 */
export function proposeTaskState(slug: string): ProposeTaskState {
  return {
    isLoggedIn: true,
    canProposeTask: true,
    canProposeMetatask: false,
    currentLevel: 6,
    success: false,
    factions: factionOuts,
    title: 'Walk a neighbour’s dog while they are in hospital',
    setTitle: noop,
    description:
      'Two weeks, once a day. Photograph the dog somewhere it has never been, and write down what it did there.',
    setDescription: noop,
    pointValue: '25',
    setPointValue: noop,
    levelRequired: 3,
    setLevelRequired: noop,
    factionSlug: slug,
    setFactionSlug: noop,
    notes: 'Proposed after the ward asked twice.',
    setNotes: noop,
    isMetatask: false,
    setIsMetatask: noop,
    metaBonusValue: '10',
    setMetaBonusValue: noop,
    submitting: false,
    error: null,
    handleSubmit: anoop,
    handleCancel: noop,
  }
}
