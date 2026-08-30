import { apiDelete, apiGet, apiPost } from './client'
import { clearCastTallies } from '../utils/castTallies'
import { notifyRequestsChanged } from '../utils/requestsBus'
import type { components } from './generated/schema'
import type { FlagReason } from '../utils/flagReasons'

// ---------------------------------------------------------------------------
// Types. Every one below is an alias of the generated
// `components['schemas'][…]`, so "matches the backend exactly" is a fact rather
// than a heading — there is no second declaration left to drift (#1400).
// ---------------------------------------------------------------------------

export type PraxisType = components['schemas']['PraxisType']
export type PraxisStatus = components['schemas']['PraxisStatus']
export type PraxisInviteStatus = components['schemas']['PraxisInviteStatus']
/**
 * `deleted` is on the wire, but not in a praxis' life.
 *
 * The backend shares ONE `ModerationStatus` enum between Comment and Praxis
 * (`backend/models/praxis.py`), and its own comment says a praxis never takes
 * the `deleted` tombstone — only comments do. The schema has no way to express
 * that, so `PraxisOut.moderation_status` admits five values where four are
 * reachable. Narrowing the alias here would put a frontend type back in
 * contradiction with the contract it is checked against;
 * `UNSCORED_MODERATION_STATUSES` below is where the narrower truth is spent.
 */
export type ModerationStatus = components['schemas']['ModerationStatus']
export type MediaType = components['schemas']['MediaType']

/**
 * The moderation states that bank nobody any points — the frontend's mirror of
 * `_UNSCORED_MODERATION_STATUSES` in `backend/services/character_stats.py`.
 *
 * `hidden` is off the site entirely; `failed` is an admin ruling that the work
 * was not done, so it keeps its banner and its place in the feed but banks
 * nothing (#1373). `flagged` is deliberately NOT here: a flag is a praxis
 * *awaiting* a ruling, and it still counts.
 *
 * Lives beside {@link ModerationStatus} because it is a fact about the wire
 * enum, not about any one surface, and because the pair is only safe as ONE
 * list: a card that computes its own total must not stamp it on a praxis whose
 * score the backend has declined to bank (#1444).
 */
export const UNSCORED_MODERATION_STATUSES: ReadonlySet<ModerationStatus> = new Set([
  'hidden',
  'failed',
])

export type MediaItemOut = components['schemas']['MediaItemOut']

/**
 * One member of a praxis crew.
 *
 * - `submitted_at` is when `has_submitted` last flipped true (#571, #1415), or
 *   null while this member still owes their part. Cleared again on an unsubmit
 *   or a pending reset, so it can never read as a stale "last time they filed".
 *   `has_submitted` stays the boolean to branch on; this is the timestamp line
 *   beside it.
 * - `nudged_at` is when the VIEWER last nudged this member about this praxis
 *   (#1083), and null once that 24h window lapses. The server owns both facts
 *   through one constant, so "there is a timestamp" and "you may not nudge
 *   again yet" can never disagree — and a reload cannot un-nudge the button.
 *   Null on list-route cards, which have no nudge button.
 */
export type PraxisMemberOut = components['schemas']['PraxisMemberOut']

export type PraxisInviteOut = components['schemas']['PraxisInviteOut']

/**
 * A praxis in full, as the detail route answers it.
 *
 * The score fields are ONE set (ADR-0053), computed for the praxis AUTHOR for
 * every type including collab:
 *
 *     score = (task_point_value + metatask_points) × display_multiplier
 *             + points_from_votes
 *
 * - `score` is the computed total. Never derive its parts by subtraction —
 *   read the terms.
 * - `metatask_points` is what applied metatasks contributed; the meta row shows
 *   only when > 0.
 * - `display_multiplier` is faction × duel collapsed into one value; `1.0`
 *   hides the mult row.
 * - `points_from_votes` is points scored from votes (`+0` is valid — the votes
 *   row always shows).
 *
 * And the rest that is not self-describing:
 *
 * - `submit_proposed_at` is when a collab's pending-publish window opened; null
 *   if not pending (ADR-0012).
 * - `is_top_for_task` is the Task Crown — top-scoring submitted praxis for its
 *   task (ADR-0028).
 * - `duel_id` is set when this praxis is one side of a duel (ADR-0011).
 * - `viewer_can_vote` is viewer-relative (#998). `false` only when the
 *   logged-in viewer's account owns this praxis (author/collab co-owner) or is
 *   a participant in its duel — the two PERMANENT vote blocks the client
 *   cannot compute itself. Drives hiding the whole vote module. `true` for
 *   anonymous viewers, who get the client's own login gate instead.
 * - `viewer_vote` is the viewer's own star (1-5); null when unvoted or
 *   anonymous (#1382). Same field and meaning as `PraxisCardOut.viewer_vote`.
 */
export type PraxisOut = components['schemas']['PraxisOut']

/**
 * A praxis as the feed and every list surface see it.
 *
 * The score fields are the same ONE set as `PraxisOut`'s (ADR-0053), resolved
 * for the praxis AUTHOR for every type including collab. Nothing derives
 * vote-points or a multiplier by subtraction. `score` is the stamp headline,
 * shown to 1 decimal.
 *
 * The fields that are not self-describing:
 *
 * - `created_by_avatar_url` is the author's portrait for the card byline
 *   (#888). `""` when they have none — the byline falls back to the shared
 *   monogram avatar.
 * - `submit_proposed_at` is when a collab's pending-publish window opened; null
 *   if not pending (ADR-0012).
 * - `is_top_for_task` is the Task Crown (ADR-0028).
 * - `body_text` is the proof excerpt — clamped to 1–2 lines in the mobile card.
 * - `created_by_faction_slug` is the author's own MEMBER faction, which drives
 *   the actor-scoped byline.
 * - `members` is the crew roster (owner + collaborators); empty on solo.
 * - `viewer_vote` is the authenticated viewer's own cast value (1–5); null if
 *   unvoted.
 * - `voted_by_name` is the display name of an ACCOUNT-MATE character who voted
 *   on this praxis — the "voted by {name}" marker (#644, §7). Account-scoped,
 *   so it can be set even when the *carried* character has no star of its own
 *   (`viewer_vote` null). Null when no character on the viewer's account has
 *   voted.
 * - `applied_metatasks` is the metatasks pinned to this praxis as full
 *   `TaskOut` rows, not just the summed `metatask_points`: the read-only seal
 *   stack dispatches on each metatask's issuing faction, so it needs the rows.
 * - `viewer_can_vote` is viewer-relative (#998); see `PraxisOut`. Precomputed
 *   page-wide by the feed route (no N+1).
 * - `duel_id` is set when this praxis is a side of a duel (ADR-0011): a duel
 *   side is stored `type='solo'` + a non-null `duel_id`, so mode labels and
 *   chips must gate on this, not `type` (#992).
 * - `opponent_praxis_id` / `opponent_display_name` / `opponent_faction_slug`
 *   are the OTHER side of this duel (#596) — who this card is fighting. A duel
 *   is two separate praxis rows joined by a `Duel` row, so `members` on a duel
 *   side holds only its own submitter and these three are the card's only path
 *   to the rival's name. Precomputed page-wide via `duel_opponents_for`.
 *
 *   ALL THREE ARRIVE TOGETHER OR NOT AT ALL, and null is the ordinary case
 *   twice over: the praxis is not a duel side, or it IS one and the duel is
 *   still `pending` — the opponent praxis does not exist until the challenge is
 *   accepted, so a challenger has nobody to name and the card shows the duel
 *   mode chip alone. Gate the banner on `opponent_display_name`, never on
 *   `type === 'duel'`, which a duel side never has (#992).
 */
export type PraxisCardOut = components['schemas']['PraxisCardOut']

/**
 * `type` is required although the backend defaults it to `solo`:
 * `openapi-typescript` renders a field carrying a default as one the client
 * always states. Every caller already passes it, so saying so costs nothing and
 * removes the question of which side owns the default.
 */
export type PraxisCreate = components['schemas']['PraxisCreate']

// There is no `PraxisUpdate`. A praxis body is written in its room and flushed
// to the record server-side (ADR-0073, #1743) — see `pages/editPraxis/praxisRoom`.

// ---------------------------------------------------------------------------
// List / detail
// ---------------------------------------------------------------------------

export async function listPraxes(filters?: {
  task_id?: number
  character_id?: number
  member_id?: number
  type?: PraxisType
  status?: PraxisStatus
  /**
   * Faction union (#1362) — repeated `?faction=`, OR-ed server-side. An empty
   * array must be sent as `undefined`, not `[]`, or the request asks for praxes
   * from no faction at all.
   */
  faction?: string[]
  /**
   * Free-text search over praxis title, praxis body, task title, and member
   * name/handle (#644 §4; member axis added in #681).
   */
  q?: string
  /**
   * Account-scoped vote filter (#644 §6). `no` = "needs my vote" (votable and
   * unvoted, excluding praxes my account is a member of); `yes` = any vote from
   * any of my characters. The two are deliberately not complements.
   */
  voted?: 'yes' | 'no'
  /**
   * Feed order (#644 §2, widened in #1362). `newest`/`oldest` are seal-date;
   * `most_voted`/`least_voted` order on vote count. Defaults server-side to
   * `newest`. Anything else is a 422, so never forward an unvalidated string.
   */
  sort?: 'newest' | 'oldest' | 'most_voted' | 'least_voted'
  /**
   * Era scope (#1362). Defaults server-side to `this_era` — praxes sealed since
   * the live era began, plus every unsealed draft. Pass `all_eras` on a surface
   * that is a career record rather than a feed of current activity.
   */
  era_scope?: 'this_era' | 'all_eras'
  limit?: number
  offset?: number
}): Promise<PraxisCardOut[]> {
  // The faction union travels as repeated bare `faction=` keys, which is what
  // FastAPI's `List[str] = Query(None)` reads and what the transport writes by
  // default (#1366, asserted in `__tests__/client.test.ts`).
  //
  // Note what the seam does NOT check: `filters` is a VARIABLE, so TypeScript's
  // excess-property check does not apply and a query key the backend renamed or
  // dropped stays silently assignable. Paths and bodies do become compile
  // errors; query keys only have the runtime assertions in
  // `__tests__/praxisRequests.test.ts`.
  const { data } = await apiGet('/praxes', { params: { query: filters } })
  // Server truth — drop any cast tally it supersedes, so a stale one can't
  // mask another player's later vote (#626, #1382).
  clearCastTallies(data.map((praxis) => praxis.id))
  return data
}

export async function getPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiGet('/praxes/{praxis_id}', { params: { path: { praxis_id: id } } })
  clearCastTallies([id])
  return data
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

// INVALIDATION IN THIS FILE — WHAT IS AUTOMATIC AND WHAT IS NOT (#2892)
//
// Automatic, nothing below does it by hand:
//   - the cached task browse and praxis feed. `api/client.ts` calls
//     `dropCachesAfterWrite()` on every succeeding POST/PUT/PATCH/DELETE, so a
//     write added here cannot forget it (ADR-0072).
//
// By hand, and each one for a reason recorded at its own definition:
//   - `notifyRequestsChanged()` — `utils/requestsBus`. Firing it is a fan-out of
//     immediate refetches, not a free `Map.clear()`, so it is NOT fired on every
//     write. One rule decides membership: ring iff the write moves a row into or
//     out of THIS viewer's pending-requests queue or their in-progress bank.
//     Every mutating export below is partitioned by that rule in `PRAXIS_WRITES`
//     (`utils/__tests__/requestsBusWiring.test.ts`), which fails CI if a new
//     write is left unclassified — so "silent" here is a recorded verdict, never
//     an omission. Read the table before adding a call or leaving one out.
//   - `clearCastTallies()` — `utils/castTallies`. Fired by the two READS above
//     that return server truth for a praxis's vote numbers.

/**
 * The praxis a signup just created, held for the composer it is about to land
 * on (#1379).
 *
 * Every signup path — the task list, the task detail page and the home
 * FieldDesk — does `createPraxis(...)` then `navigate('/praxis/{id}/edit')`.
 * `POST /praxes` and `GET /praxes/{id}` both return
 * `build_praxis_out(praxis, viewer=...)` with the same viewer, so the composer
 * reading the row back would be a full round trip for a payload the client was
 * handed milliseconds earlier — pure latency, on the deepest waterfall in the
 * app.
 *
 * ONE SLOT, CONSUMED ONCE. It lives in module memory rather than in router
 * state deliberately: history state survives Back/Forward, so a carried praxis
 * would be replayed — stale — onto a composer the player returns to after
 * editing. This slot is cleared by the first read and by any reload, so the
 * only thing that can ever consume it is the navigation that follows the
 * create. A miss is free: the composer falls back to `getPraxis`.
 */
let justCreatedPraxis: PraxisOut | null = null

/**
 * Take the just-created praxis if it is the one being asked for. Always clears
 * the slot, match or not — a carried payload nobody claimed immediately is a
 * payload that has had time to go stale.
 */
export function takeJustCreatedPraxis(praxisId: number): PraxisOut | null {
  const carried = justCreatedPraxis
  justCreatedPraxis = null
  return carried?.id === praxisId ? carried : null
}

export async function createPraxis(data: PraxisCreate): Promise<PraxisOut> {
  const { data: created } = await apiPost('/praxes', { body: data })
  justCreatedPraxis = created
  // A signup is a new in-progress praxis in the viewer's own bank — the rail's
  // "In progress" panel and the `{n} of {max}` slot counter both read that list
  // (#1867). All four signup entry points funnel through here, so this is the
  // one place any of them needs it.
  notifyRequestsChanged()
  return created
}

export async function deletePraxis(id: number): Promise<void> {
  await apiDelete('/praxes/{praxis_id}', { params: { path: { praxis_id: id } } })
  notifyRequestsChanged()
}

/** Flip a praxis between solo and collab in place, preserving id/content/media (#321). */
export async function changePraxisType(id: number, type: PraxisType): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/change-type', {
    params: { path: { praxis_id: id } },
    body: { type },
  })
  return data
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

/**
 * One route, two doors, told apart by status (#590, ADR-0079).
 *
 * - `submitted` — reopen a sealed praxis. The whole group comes back out.
 * - `pending` — **Withdraw proposal**: the same cancellation an edit performs,
 *   for a member who has read the draft and has no edit to make yet. Any member
 *   may (ADR-0013); per-member pull-back is gone with per-member submission.
 */
export async function unsubmitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/unsubmit', {
    params: { path: { praxis_id: id } },
  })
  // A collab/duel is awaiting your submission again — refresh the badge.
  notifyRequestsChanged()
  return data
}

/**
 * **Done** — "my part is finished" (ADR-0079, #1811).
 *
 * Purely social: a roster badge, freely reversible, gating nothing and starting
 * nothing. It takes the value rather than toggling because the server owns the
 * flag and a client that guessed which of two endpoints to call from local
 * state is one dropped response away from disagreeing with it.
 *
 * No `notifyRequestsChanged`: Done does not move this praxis in or out of
 * anyone's "awaiting your submission" bucket — that bucket is about approval.
 */
export async function setPraxisDone(id: number, isDone: boolean): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/done', {
    params: { path: { praxis_id: id } },
    body: { is_done: isDone },
  })
  return data
}

/**
 * **Propose**, then **Approve** — one endpoint, told apart by praxis state
 * (ADR-0079). No window open makes this a proposal, which opens the
 * silence-is-consent window and records the caller as approved; a window
 * already open makes it a vote on that proposal. All approved → Live.
 */
export async function submitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/submit', {
    params: { path: { praxis_id: id } },
  })
  // Your part landed — this praxis leaves the "awaiting your submission" bucket.
  notifyRequestsChanged()
  return data
}

/**
 * Leave a collab praxis you joined (not authored). Frees a task-bank slot —
 * unlike withdraw, which keeps the membership. Backend: POST /praxes/{id}/leave.
 */
export async function leavePraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/leave', {
    params: { path: { praxis_id: id } },
  })
  notifyRequestsChanged()
  return data
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/**
 * The two multipart bodies below, and why each is spelled as a literal.
 *
 * OpenAPI describes an uploaded file as `type: string, format: binary`, so
 * `openapi-typescript` renders these bodies as `{ file: string }` — a real
 * `File` can never satisfy that, and no amount of correct code will make it. The
 * cast is the only way to say "multipart" in this type system.
 *
 * The literal is the STRICTER of the two available spellings (the review of
 * #1622). It must stay assignable to whatever the schema says the body is, so a
 * renamed or added form field fails `tsc` at the `body:` property; the generated
 * `components['schemas']['Body_upload_…']` alias is assignable to itself by
 * construction and would follow the wire silently instead.
 *
 * The RUNTIME needs no help: `openapi-fetch`'s default serializer returns a
 * `FormData` untouched and deliberately leaves `Content-Type` unset so the
 * platform writes the boundary. That is the load-bearing half, and the half the
 * cast could hide, so it is asserted in `__tests__/praxisRequests.test.ts`
 * rather than assumed — a JSON-stringified `FormData` reaches the server as `{}`
 * and fails at runtime with nothing failing in CI.
 *
 * ponytail: both casts disappear if the generator is ever configured to emit
 * `Blob` for `format: binary`; until then this is the documented upload idiom.
 */
export async function uploadPraxisMedia(id: number, file: File): Promise<MediaItemOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiPost('/praxes/{praxis_id}/media', {
    params: { path: { praxis_id: id } },
    // `display_order` is in the schema's field list and deliberately not in the
    // FormData: it is `Form(0)` server-side, so an omitted one appends last.
    body: form as unknown as { display_order: number; file: string },
  })
  return data
}

/**
 * One entry per file submitted to the batch route. Exactly one of `media_item`
 * / `error` is set.
 *
 * `filename` is echoed back verbatim and unsanitized so a failure can name the
 * file the player recognises. It is for DISPLAY only: two files in one selection
 * can share a basename, so callers must attribute by position (the array is in
 * request order), never by matching on this string.
 */
export type MediaUploadResultOut = components['schemas']['MediaUploadResultOut']

/**
 * Upload N media files to one praxis in a single multipart request (#1286).
 *
 * Partial success by design: the 201 means "the request was processed", not
 * "everything landed", so read every entry. Results come back in request order
 * and `display_order` is derived from request position server-side (this route
 * takes no `display_order` field), appended after any media already attached.
 *
 * `uploadPraxisMedia` above stays — the crop/rotate path uploads one edited
 * image at a time by design (#514).
 */
export async function uploadPraxisMediaBatch(
  id: number,
  files: File[],
): Promise<MediaUploadResultOut[]> {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  const { data } = await apiPost('/praxes/{praxis_id}/media/batch', {
    params: { path: { praxis_id: id } },
    body: form as unknown as { files: string[] },
  })
  return data
}

export async function deletePraxisMedia(id: number, mediaId: number): Promise<void> {
  await apiDelete('/praxes/{praxis_id}/media/{media_id}', {
    params: { path: { praxis_id: id, media_id: mediaId } },
  })
}

// ---------------------------------------------------------------------------
// Collaboration / invite management
// ---------------------------------------------------------------------------

export async function inviteToPraxis(id: number, inviteeId: number): Promise<PraxisInviteOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/invite', {
    params: { path: { praxis_id: id } },
    body: { invitee_id: inviteeId },
  })
  return data
}

/** Acknowledgement for answering a collab invite (#1383). */
export type InviteResponseOut = components['schemas']['InviteResponseOut']

/**
 * Accept or decline a collab invite.
 *
 * Answers an ack, not the praxis (#1383): every caller navigates or refreshes
 * the feed rather than reading a returned row.
 */
export async function respondToInvite(
  praxisId: number,
  inviteId: number,
  accept: boolean,
): Promise<InviteResponseOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/invite/{invite_id}/respond', {
    params: { path: { praxis_id: praxisId, invite_id: inviteId } },
    body: { accept },
  })
  // The invite left your requests bucket (accept → now awaiting your
  // submission; decline → gone). Refresh every feed surface (#updates-badge).
  notifyRequestsChanged()
  return data
}

/** Inviter rescinds a still-pending invite (#421). */
export async function cancelInvite(
  praxisId: number,
  inviteId: number,
): Promise<void> {
  await apiDelete('/praxes/{praxis_id}/invite/{invite_id}', {
    params: { path: { praxis_id: praxisId, invite_id: inviteId } },
  })
}

/**
 * Remove another member from a collab (#959). Any member may kick any other, but
 * not themselves (that is `leavePraxis`) — mirrors the backend `kick_member`
 * guard. `memberId` is the target's CHARACTER id. A kick resets the whole group
 * back to editing (ADR-0013), so the returned praxis reflects the reset state.
 */
export async function kickMember(
  praxisId: number,
  memberId: number,
): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/kick/{member_id}', {
    params: { path: { praxis_id: praxisId, member_id: memberId } },
  })
  // The reset lands on the KICKER too: a group that had been submitted is back
  // to editing, so this praxis re-enters the viewer's own in-progress list and
  // their "awaiting your submission" bucket — the same move `unsubmitPraxis`
  // announces (#1867).
  notifyRequestsChanged()
  return data
}

// ---------------------------------------------------------------------------
// Metatasks — metatasks are Task rows with task_type='metatask' attached
// to a praxis via POST /praxes/{id}/metatasks.
// ---------------------------------------------------------------------------

export async function applyMetatask(praxisId: number, taskId: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/metatasks', {
    params: { path: { praxis_id: praxisId } },
    body: { task_id: taskId },
  })
  return data
}

export async function removeMetatask(praxisId: number, taskId: number): Promise<PraxisOut> {
  const { data } = await apiDelete('/praxes/{praxis_id}/metatasks/{task_id}', {
    params: { path: { praxis_id: praxisId, task_id: taskId } },
  })
  return data
}

// ---------------------------------------------------------------------------
// Flagging — reason is the shared vocabulary (ADR-0037); same FlagIn body as
// the comment flag route. `reasonDetail` only travels with reason='other'.
// ---------------------------------------------------------------------------

export async function flagPraxis(
  praxisId: number,
  reason: FlagReason,
  reasonDetail?: string,
): Promise<void> {
  await apiPost('/praxes/{praxis_id}/flag', {
    params: { path: { praxis_id: praxisId } },
    body: { reason, reason_detail: reasonDetail || null },
  })
}
