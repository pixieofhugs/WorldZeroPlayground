/**
 * May the body editor take text? The composer's one gate, in one place.
 *
 * This module used to hold three functions, all of them about #1745's freeze:
 * the praxis was read-only in every status but `in_progress`, the server hung
 * the socket up when it transitioned (#1808), and the client latched that close
 * so the member stopped typing into a void (#1931). **ADR-0079 retired the
 * state all three served.** `pending` now means "a proposal is live", not
 * "sealed"; the room takes every frame in every status a member can reach; and
 * what keeps a countdown from being cancelled by accident is one confirmation
 * on the first keystroke, in `proposalGuard.ts`.
 *
 * What survives is the refusal that was never about consensus at all.
 *
 * The rule lives here rather than inline in `archetypes/controls.tsx` because
 * the frontend harness is `renderToStaticMarkup`: no DOM, and effects never
 * run, so the editor binding is not observable. A rule that cannot be called
 * cannot be proved.
 */

/**
 * Two different refusals, and neither may be mistaken for permission.
 *
 * `seeded` is **not yet** — the document has not arrived, and typing in front
 * of the server's seed merges into text the player has never seen (ADR-0073
 * rule 1: the server seeds exactly once, and two clients building a document
 * from the same text merge into two copies of it).
 *
 * `locked` is **not ever, here** — the praxis is moderated (hidden/failed), the
 * one state that still renders a composer read-only since #1164 sent published
 * praxes to the read page. It is `EditPraxisState.controlsLocked`, the flag
 * that covers the whole composer, and the write-up is simply part of it.
 */
export function composerWritable(seeded: boolean, locked: boolean): boolean {
  return seeded && !locked;
}
