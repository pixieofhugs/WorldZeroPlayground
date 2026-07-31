/**
 * Where "you have a pending request" links point, now that there is no tab to
 * point them at (#1421, ADR-0070).
 *
 * The `Requests` filter tab is deleted: under "an unanswered obligation lives in
 * the queue, never in the stream" it was byte-for-byte the queue's contents, so
 * `/updates?filter=requests` became a filter that filtered nothing. Every such
 * link now expands and scrolls to the queue instead.
 *
 * NINE call sites, not the one the issue named — the sidebar's pending-request
 * row plus all eight mobile field-desk archetypes had each hardcoded the query
 * string. They route through this constant so the anchor is agreed in one file.
 *
 * **#1422 owns the queue and must give its container `id={REQUESTS_QUEUE_ANCHOR}`
 * and treat the matching `location.hash` as "start expanded".** That issue had
 * not merged when this landed, so this is the contract rather than a
 * description of it. Until then the hash simply finds nothing and the link
 * lands on `/updates`, which is where it used to land anyway.
 */

/** The queue container's `id`, and the fragment that scrolls to it. */
export const REQUESTS_QUEUE_ANCHOR = 'requests-queue'

/** The whole link, for the nine places that need one. */
export const REQUESTS_QUEUE_LINK = `/updates#${REQUESTS_QUEUE_ANCHOR}`
