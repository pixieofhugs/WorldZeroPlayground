/**
 * Where the mobile home's two big buttons land (#1554).
 *
 * BOTH ARE ALREADY-NARROWED VIEWS, and that is the whole point of the issue: a
 * home screen's buttons should land on what the player can act on, not on the
 * top of a catalogue they then have to filter by hand. "Find a task" that opens
 * every task including the ones locked to a higher level is a button that
 * answers a different question than the one it asks.
 *
 * WHY THESE ARE HAND-WRITTEN STRINGS AND NOT BUILT FROM THE READERS' CONSTANTS
 * ---------------------------------------------------------------------------
 * `TASK_FILTER_PARAMS` / `CAN_SIGN_UP_ON` live in `pages/tasks/useTasks.ts` and
 * the voted axis in `pages/praxes/feedFilterParams.ts`. Importing the first from
 * eight lazily-loaded mobile skins would pull the whole tasks-page module graph
 * into the field-desk chunk for the sake of two string constants — a real cost
 * on the one screen the app opens on (`docs/agents/load-time.md`).
 *
 * The promise is pinned instead by `__tests__/homeDestinations.test.ts`, which
 * feeds each URL back through the very readers the destination pages use
 * (`readTaskFilters`, `readFeedFilters`) and asserts the axis actually comes out
 * on. A link that lands unfiltered is the failure mode this repo has been bitten
 * by before — a 200 with an unnarrowed list looks identical to a working one, so
 * tsc, eslint and a render assertion all pass over it.
 */

/**
 * Primary CTA — "tasks I can sign up for" (#1130).
 *
 * The SERVER evaluates its own sign-up predicate behind `can_sign_up`, so a
 * faction ability that bends the level bar (WOW's once-a-level jump, the
 * Ephemerists' retired-task access) is honoured without this page knowing a
 * rule. Deliberately carries no `status`: pinning `status=active` alongside it
 * would quietly cancel the second one.
 */
export const FIND_TASK_LINK = '/tasks?can_sign_up=1'

/**
 * Secondary CTA — praxes awaiting this account's vote.
 *
 * `voted=no` is the feed's "needs my vote": votable, unvoted, and never a praxis
 * the account co-owns (ADR-0013). The era axis is left alone — a bare `/praxis`
 * lands on `this_era` (#1361 ruling 6), and that is the right scope for work you
 * are being asked to judge now.
 */
export const CAST_VOTES_LINK = '/praxis?voted=no'

/**
 * Where the pending row goes when what is waiting is news rather than an
 * obligation: the Updates page with no filter on it.
 *
 * Requests get `REQUESTS_QUEUE_LINK` instead (`pages/updates/requestsQueueAnchor`),
 * which expands and scrolls to the queue — ADR-0070 deleted the `requests`
 * filter tab, so `/updates?filter=requests` names an axis that no longer exists.
 */
export const UPDATES_LINK = '/updates'
