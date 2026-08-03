import { apiDelete, apiGet, apiPost, apiPut } from './client'
import { wireSent } from './wireSent'
import { clearCastTallies } from '../components/vote/castTallies'
import { notifyRequestsChanged } from '../utils/requestsBus'
import type { TaskOut } from './tasks'
import type { FlagReason } from '../utils/flagReasons'

// ---------------------------------------------------------------------------
// Types — hand-written mirrors of backend schemas/praxis.py, and NOT known to
// match it. #1400 replaces them with aliases of the generated
// `components['schemas'][…]`, which is what turns "matches exactly" into a fact
// instead of a heading. Until then the mirror is close but demonstrably not
// exact: the wire carries `PraxisOut.voter_count`, which is not declared here.
// ---------------------------------------------------------------------------

export type PraxisType = 'solo' | 'collab' | 'duel'
export type PraxisStatus = 'in_progress' | 'pending' | 'submitted'
export type PraxisInviteStatus = 'pending' | 'accepted' | 'declined'
/**
 * `deleted` is on the wire, but not in a praxis' life (#1400).
 *
 * The backend shares ONE `ModerationStatus` enum between Comment and Praxis
 * (`backend/models/praxis.py`), and its own comment says a praxis never takes
 * the `deleted` tombstone — only comments do. The generated schema has no way
 * to express that, so `PraxisOut.moderation_status` admits five values where
 * four are reachable.
 *
 * This union follows the wire rather than the narrower truth, because the
 * alternative is a frontend type that silently contradicts the contract it is
 * checked against. `UNSCORED_MODERATION_STATUSES` below deliberately does NOT
 * list it: a state a praxis cannot reach needs no scoring rule, and inventing
 * one would be exactly the mirror-drift this migration is retiring.
 */
export type ModerationStatus = 'visible' | 'flagged' | 'hidden' | 'failed' | 'deleted'
export type MediaType = 'image' | 'video' | 'audio'

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
 * list — the defect in #1444 was a card that stamped a computed total on a
 * praxis whose score the backend had already declined to bank.
 */
export const UNSCORED_MODERATION_STATUSES: ReadonlySet<ModerationStatus> = new Set([
  'hidden',
  'failed',
])

export interface MediaItemOut {
  id: number
  praxis_id: number
  type: MediaType
  file_path: string
  display_order: number
  created_at: string
}

export interface PraxisMemberOut {
  id: number
  praxis_id: number
  character_id: number
  character_display_name: string
  has_submitted: boolean
  /**
   * When `has_submitted` last flipped true (#571, #1415), or null while this
   * member still owes their part. Cleared again on an unsubmit or a pending
   * reset, so it can never read as a stale "last time they filed".
   * `has_submitted` stays the boolean to branch on; this is the timestamp line
   * beside it.
   */
  submitted_at?: string | null
  joined_at: string
  /**
   * When the VIEWER last nudged this member about this praxis (#1083), and null
   * once that 24h window lapses. The server owns both facts through one
   * constant, so "there is a timestamp" and "you may not nudge again yet" can
   * never disagree — and a reload cannot un-nudge the button, which is what made
   * the design's local-state version dishonest. Absent on list-route cards,
   * which have no nudge button.
   */
  nudged_at?: string | null
}

export interface PraxisInviteOut {
  id: number
  praxis_id: number
  inviter_id: number
  invitee_id: number
  invitee_display_name: string
  status: PraxisInviteStatus
  created_at: string
}

export interface PraxisOut {
  id: number
  task_id: number
  task_title: string
  task_point_value: number
  task_level_required: number
  task_faction_slug: string | null
  type: PraxisType
  status: PraxisStatus
  title: string | null
  body_text: string | null
  moderation_status: ModerationStatus
  admin_note: string | null
  flagged_at: string | null
  submitted_at: string | null
  /** When a collab's pending-publish window opened; null if not pending (ADR-0012). */
  submit_proposed_at: string | null
  created_by_id: number
  created_by_display_name: string
  created_by_faction_slug: string | null
  created_at: string
  updated_at: string
  members: PraxisMemberOut[]
  invites: PraxisInviteOut[]
  media_items: MediaItemOut[]
  // The one authoritative number for this praxis (ADR-0053), computed for its
  // AUTHOR for every type including collab, with the terms behind it:
  //   score = (task_point_value + metatask_points) × display_multiplier
  //           + points_from_votes
  /** The computed total. Never derive its parts by subtraction — read the terms. */
  score: number
  /** Points contributed by applied metatasks; the meta row shows only when > 0. */
  metatask_points: number
  /** faction × duel collapsed into one value; `1.0` hides the mult row. */
  display_multiplier: number
  /** Points scored from votes (`+0` is valid — the votes row always shows). */
  points_from_votes: number
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean
  /** Set when this praxis is one side of a duel (ADR-0011). */
  duel_id: number | null
  can_flag: boolean
  applied_metatasks: TaskOut[]
  /**
   * Viewer-relative (#998). `false` only when the logged-in viewer's account
   * owns this praxis (author/collab co-owner) or is a participant in its duel —
   * the two PERMANENT vote blocks the client can't compute itself. Drives hiding
   * the whole vote module. Default `true` (incl. anonymous — the client shows
   * its own login gate). Optional so a stale payload degrades to showing it.
   */
  viewer_can_vote?: boolean
  /**
   * The viewer's own star (1-5); `null` when unvoted or anonymous (#1382). Same
   * field and meaning as `PraxisCardOut.viewer_vote`. Detail used to be the one
   * surface without it, which is why the client recovered the viewer's cast
   * from the voters list and parked it in an overlay store.
   */
  viewer_vote?: number | null
}

export interface PraxisCardOut {
  id: number
  task_id: number
  task_title: string
  task_point_value: number
  task_level_required: number
  type: PraxisType
  status: PraxisStatus
  title: string | null
  moderation_status: ModerationStatus
  created_by_id: number
  created_by_display_name: string
  /**
   * The author's portrait for the card byline (#888). `""` when they have none
   * — the byline falls back to the shared monogram avatar. Optional so a stale
   * cached payload degrades to the monogram rather than crashing the card.
   */
  created_by_avatar_url?: string
  created_at: string
  updated_at: string
  submitted_at: string | null
  /**
   * When a collab's pending-publish window opened; null/absent if not pending
   * (ADR-0012). Optional because the list schema may omit it — the pending chip
   * simply doesn't render until it's present.
   */
  submit_proposed_at?: string | null
  member_count: number
  // The computed total and the terms behind it (ADR-0053, supersedes ADR-0047),
  // resolved for the praxis AUTHOR for every type including collab:
  //   score = (task_point_value + metatask_points) × display_multiplier
  //           + points_from_votes
  // "Merit" (base + votes, multipliers discarded) is retired, and nothing
  // derives vote-points or a multiplier by subtraction.
  /** The computed total — the stamp headline, shown to 1 decimal. */
  score: number
  voter_count: number
  /** Points contributed by applied metatasks; the meta row shows only when > 0. */
  metatask_points: number
  /** faction × duel collapsed into one value; `1.0` hides the mult row. */
  display_multiplier: number
  /** Points scored from votes (`+0` is valid — the votes row always shows). */
  points_from_votes: number
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean
  task_faction_slug: string | null
  // Full-fidelity fields the bespoke praxis cards need (#573). The list
  // schema now emits these; older callers simply ignore them.
  /** Proof body excerpt — clamped to 1–2 lines in the mobile card. */
  body_text?: string | null
  /** Author's own member faction — drives the actor-scoped byline. */
  created_by_faction_slug?: string | null
  /** Crew roster (owner + collaborators); empty/absent on solo. */
  members?: PraxisMemberOut[]
  /** Attached proof media (images / video / audio). */
  media_items?: MediaItemOut[]
  /** The authenticated viewer's own cast value (1–5); null/absent if unvoted. */
  viewer_vote?: number | null
  /**
   * Display name of an account-mate character who voted on this praxis — the
   * "voted by {name}" marker (#644, §7). Account-scoped, so it can be set even
   * when the *carried* character has no star of its own (`viewer_vote` null).
   * Null/absent when no character on the viewer's account has voted.
   */
  voted_by_name?: string | null
  /**
   * The metatasks pinned to this praxis, as full TaskOut rows (not just the
   * summed `metatask_points` above). The card's read-only seal stack dispatches
   * on each metatask's issuing faction, so it needs the rows. The backend always
   * emits it (empty when none); optional so a stale cached payload or an older
   * caller degrades to no seal rather than crashing the card — matching the
   * other late-added card fields above.
   */
  applied_metatasks?: TaskOut[]
  /**
   * Viewer-relative (#998); see `PraxisOut.viewer_can_vote`. Precomputed
   * page-wide by the feed route (no N+1). Optional so a stale cached payload
   * degrades to showing the module rather than hiding it.
   */
  viewer_can_vote?: boolean
  /**
   * Set when this praxis is a side of a duel (ADR-0011): a duel side is stored
   * `type='solo'` + a non-null `duel_id`, so mode labels/chips must gate on this,
   * not `type` (#992). Null/absent when the praxis is not a duel side. Mirrors
   * `PraxisOut.duel_id`; precomputed page-wide by the feed route (no N+1).
   */
  duel_id?: number | null
  /**
   * The OTHER side of this duel (#596) — who this card is fighting.
   *
   * A duel is two separate praxis rows joined by a `Duel` row (ADR-0011), so
   * `members` on a duel side holds only its own submitter; these three are the
   * card's only path to the rival's name. Precomputed page-wide by the feed
   * route (no N+1) via `duel_opponents_for`.
   *
   * ALL THREE ARRIVE TOGETHER OR NOT AT ALL, and absent is the ordinary case
   * twice over: the praxis is not a duel side, or it IS one and the duel is
   * still `pending` — the opponent praxis does not exist until the challenge is
   * accepted, so a challenger has nobody to name and the card shows the duel
   * mode chip alone. Gate the banner on `opponent_display_name`, never on
   * `type === 'duel'`, which a duel side never has (#992).
   */
  opponent_praxis_id?: number | null
  opponent_display_name?: string | null
  /** The rival author's member faction; `null` for an unaffiliated author. */
  opponent_faction_slug?: string | null
}

export interface PraxisCreate {
  task_id: number
  /**
   * Required here although the backend defaults it to `solo`: the generated
   * request body declares it (#1400), because `openapi-typescript` renders a
   * field carrying a default as one the client always states. Every caller
   * already passes it, so saying so costs nothing and removes the question of
   * which side owns the default.
   */
  type: PraxisType
  title?: string
  body_text?: string
}

export interface PraxisUpdate {
  title?: string
  body_text?: string
}

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
  // default — the axios serializer this replaced had to be told (#1366,
  // asserted in `__tests__/client.test.ts`).
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
  return data.map(wireSent)
}

export async function getPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiGet('/praxes/{praxis_id}', { params: { path: { praxis_id: id } } })
  clearCastTallies([id])
  return wireSent(data)
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

/**
 * The praxis a signup just created, held for the composer it is about to land
 * on (#1379).
 *
 * Every signup path — the task list, the task detail page and the home
 * FieldDesk — does `createPraxis(...)` then `navigate('/praxis/{id}/edit')`,
 * and the composer's first act was `getPraxis(id)`: a full round trip to read
 * back a row the client had been handed milliseconds earlier. `POST /praxes`
 * and `GET /praxes/{id}` both return `build_praxis_out(praxis, viewer=...)`
 * with the same viewer, so the two payloads are the same object — the read was
 * pure latency, and on the deepest waterfall in the app.
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
  const { data: result } = await apiPost('/praxes', { body: data })
  const created = wireSent(result)
  justCreatedPraxis = created
  return created
}

export async function updatePraxis(id: number, data: PraxisUpdate): Promise<PraxisOut> {
  const { data: result } = await apiPut('/praxes/{praxis_id}', {
    params: { path: { praxis_id: id } },
    body: data,
  })
  return wireSent(result)
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
  return wireSent(data)
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

// Unsubmit a praxis back to editing (#590 renamed withdraw → unsubmit). For a
// sealed solo/collab this reopens the whole group; for a pending collab where
// the caller has submitted, it clears only the caller's part.
export async function unsubmitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/unsubmit', {
    params: { path: { praxis_id: id } },
  })
  // A collab/duel is awaiting your submission again — refresh the badge.
  notifyRequestsChanged()
  return wireSent(data)
}

export async function submitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/submit', {
    params: { path: { praxis_id: id } },
  })
  // Your part landed — this praxis leaves the "awaiting your submission" bucket.
  notifyRequestsChanged()
  return wireSent(data)
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
  return wireSent(data)
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
 * One entry per file submitted to the batch route — `schemas/praxis.py`'s
 * `MediaUploadResultOut`. Exactly one of `media_item` / `error` is set.
 *
 * `filename` is echoed back verbatim and unsanitized so a failure can name the
 * file the player recognises. It is for DISPLAY only: two files in one selection
 * can share a basename, so callers must attribute by position (the array is in
 * request order), never by matching on this string.
 */
export interface MediaUploadResultOut {
  filename: string
  media_item: MediaItemOut | null
  error: string | null
  status_code: number | null
}

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
  return data.map(wireSent)
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
export interface InviteResponseOut {
  praxis_id: number
  accepted: boolean
}

/**
 * Accept or decline a collab invite.
 *
 * Answers an ack, not the praxis (#1383). This route used to return a full
 * tally-bearing `PraxisOut` — mistyped here as `PraxisInviteOut` — and every
 * caller discarded it, then navigated or refreshed the feed.
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
  return wireSent(data)
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
  return wireSent(data)
}

export async function removeMetatask(praxisId: number, taskId: number): Promise<void> {
  await apiDelete('/praxes/{praxis_id}/metatasks/{task_id}', {
    params: { path: { praxis_id: praxisId, task_id: taskId } },
  })
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
