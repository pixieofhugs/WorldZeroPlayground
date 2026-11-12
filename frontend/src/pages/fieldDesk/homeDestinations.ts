/**
 * Where the mobile home's two big buttons land (#1554): already-narrowed views.
 *
 * Hand-written strings, not built from the readers' constants: importing
 * `pages/tasks/useTasks.ts` would pull the tasks page into the field-desk chunk
 * (`docs/agents/load-time.md`). `__tests__/homeDestinations.test.ts` pins them.
 */

/**
 * Primary CTA (#1130). The server runs its own sign-up predicate, so faction
 * abilities that bend the level bar apply. No `status`: `status=active` would
 * cancel retired-task access.
 */
export const FIND_TASK_LINK = '/tasks?can_sign_up=1'

/**
 * Secondary CTA: praxes needing this account's vote (never co-owned, ADR-0013).
 * Era left at the feed's `this_era` default (#1361).
 */
export const CAST_VOTES_LINK = '/praxis?voted=no'

/**
 * Pending row when what waits is news. Requests use `REQUESTS_QUEUE_LINK`
 * (ADR-0070 removed the `requests` filter).
 */
export const UPDATES_LINK = '/updates'
