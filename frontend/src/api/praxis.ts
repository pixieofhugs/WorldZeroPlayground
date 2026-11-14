import { apiDelete, apiGet, apiPost } from './client'
import { castTallyClock, clearCastTallies } from '../utils/castTallies'
import { notifyRequestsChanged } from '../utils/requestsBus'
import type { components } from './generated/schema'
import type { FlagReason } from '../utils/flagReasons'

// Types: all aliases of the generated schema, so none can drift (#1400).

export type PraxisType = components['schemas']['PraxisType']
export type PraxisStatus = components['schemas']['PraxisStatus']
export type PraxisInviteStatus = components['schemas']['PraxisInviteStatus']
/**
 * Admits `deleted`, which a praxis never reaches (the backend shares one enum
 * with Comment). Don't narrow it here; `UNSCORED_MODERATION_STATUSES` holds the
 * narrower truth.
 */
export type ModerationStatus = components['schemas']['ModerationStatus']
export type MediaType = components['schemas']['MediaType']

/**
 * Statuses that bank no points; mirrors `_UNSCORED_MODERATION_STATUSES` in
 * `backend/services/character_stats.py`. `failed` keeps its feed place but banks
 * nothing (#1373); `flagged` is awaiting a ruling and still counts. Keep it ONE
 * list so a card never stamps a total the backend declined to bank (#1444).
 */
export const UNSCORED_MODERATION_STATUSES: ReadonlySet<ModerationStatus> = new Set([
  'hidden',
  'failed',
])

export type MediaItemOut = components['schemas']['MediaItemOut']

/**
 * - `submitted_at`: when `has_submitted` last flipped true (#1415); cleared on
 *   unsubmit/reset. Branch on `has_submitted`.
 * - `nudged_at`: when the VIEWER last nudged this member (#1083); null once the
 *   24h window lapses, so it doubles as "may not nudge yet". Null on list cards.
 */
export type PraxisMemberOut = components['schemas']['PraxisMemberOut']

export type PraxisInviteOut = components['schemas']['PraxisInviteOut']

/**
 * Score fields are ONE set for the AUTHOR, every type (ADR-0053):
 *
 *     score = (task_point_value + metatask_points) × display_multiplier
 *             + points_from_votes
 *
 * Never derive a term by subtraction. `display_multiplier` is faction × duel
 * (`1.0` hides the row); `points_from_votes` row always shows (`+0` valid).
 *
 * - `submit_proposed_at`: collab pending-publish window open time (ADR-0012).
 * - `is_top_for_task`: Task Crown (ADR-0028).
 * - `viewer_can_vote` (#998): `false` only for the permanent blocks (viewer's
 *   account owns it or is in its duel); hides the vote module. `true` for
 *   anonymous viewers, who hit the login gate.
 * - `viewer_vote`: viewer's star 1-5, null when unvoted/anonymous (#1382).
 */
export type PraxisOut = components['schemas']['PraxisOut']

/**
 * A praxis on list surfaces. Same score set as `PraxisOut` (ADR-0053).
 *
 * - `created_by_avatar_url`: `""` when none; byline falls back to monogram.
 * - `created_by_faction_slug`: author's MEMBER faction (actor-scoped byline).
 * - `voted_by_name`: an ACCOUNT-MATE character who voted (#644 §7); may be set
 *   while `viewer_vote` is null.
 * - `applied_metatasks`: full rows, because the seal stack dispatches on each
 *   metatask's issuing faction.
 * - `duel_id`: a duel side is stored `type='solo'`, so gate duel chips on this,
 *   not `type` (#992).
 * - `opponent_*` (#596): the other duel side, the card's only path to the
 *   rival's name. All three arrive together or not at all; null also while the
 *   duel is `pending` (no opponent praxis yet). Gate on `opponent_display_name`.
 */
export type PraxisCardOut = components['schemas']['PraxisCardOut']

/** `type` is required: openapi-typescript renders defaulted fields as required. */
export type PraxisCreate = components['schemas']['PraxisCreate']

// No `PraxisUpdate`: the body is written in its room (ADR-0073, `pages/editPraxis/praxisRoom`).

export async function listPraxes(filters?: {
  task_id?: number
  character_id?: number
  member_id?: number
  type?: PraxisType
  status?: PraxisStatus
  /** Repeated `?faction=`, OR-ed (#1362). Send `undefined`, not `[]` (= no faction). */
  faction?: string[]
  /** Searches praxis title/body, task title, member name/handle. */
  q?: string
  /**
   * Account-scoped (#644 §6). `no` = votable, unvoted, not my own; `yes` = any
   * of my characters voted. Deliberately not complements.
   */
  voted?: 'yes' | 'no'
  /** Anything else is a 422; never forward an unvalidated string. */
  sort?: 'newest' | 'oldest' | 'most_voted' | 'least_voted'
  /** Default `this_era` (sealed this era + unsealed drafts); `all_eras` for career records. */
  era_scope?: 'this_era' | 'all_eras'
  limit?: number
  offset?: number
}): Promise<PraxisCardOut[]> {
  // `filters` is a variable, so a renamed backend query key is not a tsc error,
  // and the request tests run against a stub wire: nothing here catches it.
  const asked = castTallyClock()
  const { data } = await apiGet('/praxes', { params: { query: filters } })
  // Drop cast tallies this read supersedes — only those answered before `asked` (#3093).
  clearCastTallies(
    data.map((praxis) => praxis.id),
    asked,
  )
  return data
}

export async function getPraxis(id: number): Promise<PraxisOut> {
  const asked = castTallyClock()
  const { data } = await apiGet('/praxes/{praxis_id}', { params: { path: { praxis_id: id } } })
  clearCastTallies([id], asked)
  return data
}

// Invalidation (#2892): cache drops are automatic in `api/client.ts` (ADR-0072).
// `notifyRequestsChanged()` rings iff a write moves a row into/out of the
// viewer's requests queue or in-progress bank; every mutating export is
// classified in `utils/__tests__/requestsBusWiring.test.ts`. Read it first.

/**
 * The praxis a signup just created, for the composer it navigates to (#1379):
 * saves re-fetching an identical payload. Module memory, not router state,
 * because history state replays stale on Back/Forward. Consumed once; a miss
 * falls back to `getPraxis`.
 */
let justCreatedPraxis: PraxisOut | null = null

/** Always clears the slot, match or not, so it can't go stale. */
export function takeJustCreatedPraxis(praxisId: number): PraxisOut | null {
  const carried = justCreatedPraxis
  justCreatedPraxis = null
  return carried?.id === praxisId ? carried : null
}

export async function createPraxis(data: PraxisCreate): Promise<PraxisOut> {
  const { data: created } = await apiPost('/praxes', { body: data })
  justCreatedPraxis = created
  // New in-progress praxis; all signup entry points funnel here (#1867).
  notifyRequestsChanged()
  return created
}

export async function deletePraxis(id: number): Promise<void> {
  await apiDelete('/praxes/{praxis_id}', { params: { path: { praxis_id: id } } })
  notifyRequestsChanged()
}

/** Flip solo/collab in place, preserving id/content/media (#321). */
export async function changePraxisType(id: number, type: PraxisType): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/change-type', {
    params: { path: { praxis_id: id } },
    body: { type },
  })
  return data
}

/**
 * Told apart by status (ADR-0079): `submitted` reopens a sealed praxis;
 * `pending` withdraws the proposal (any member, ADR-0013).
 */
export async function unsubmitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/unsubmit', {
    params: { path: { praxis_id: id } },
  })
  notifyRequestsChanged()
  return data
}

/**
 * "My part is finished" (ADR-0079): a social badge gating nothing. Takes the
 * value rather than toggling because the server owns the flag. No bus ring:
 * it moves nothing between buckets.
 */
export async function setPraxisDone(id: number, isDone: boolean): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/done', {
    params: { path: { praxis_id: id } },
    body: { is_done: isDone },
  })
  return data
}

/**
 * Propose, or Approve if a window is already open (ADR-0079). Proposing opens
 * the silence-is-consent window. All approved → Live.
 */
export async function submitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/submit', {
    params: { path: { praxis_id: id } },
  })
  notifyRequestsChanged()
  return data
}

/** Leave a collab you joined; frees a task-bank slot, unlike withdraw. */
export async function leavePraxis(id: number): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/leave', {
    params: { path: { praxis_id: id } },
  })
  notifyRequestsChanged()
  return data
}

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
    // `display_order` omitted: server default `Form(0)` appends last.
    body: form as unknown as { display_order: number; file: string },
  })
  return data
}

/**
 * Exactly one of `media_item` / `error` is set. `filename` is unsanitized and
 * display-only: attribute by array position, never by name (basenames collide).
 */
export type MediaUploadResultOut = components['schemas']['MediaUploadResultOut']

/**
 * Upload N files in one request (#1286). Partial success: a 201 doesn't mean
 * all landed, read every entry. Results in request order; `display_order` is
 * derived from position server-side. Crop/rotate still uses `uploadPraxisMedia`.
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

export async function inviteToPraxis(id: number, inviteeId: number): Promise<PraxisInviteOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/invite', {
    params: { path: { praxis_id: id } },
    body: { invitee_id: inviteeId },
  })
  return data
}

export type InviteResponseOut = components['schemas']['InviteResponseOut']

/** Returns an ack, not the praxis (#1383): callers navigate or refresh. */
export async function respondToInvite(
  praxisId: number,
  inviteId: number,
  accept: boolean,
): Promise<InviteResponseOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/invite/{invite_id}/respond', {
    params: { path: { praxis_id: praxisId, invite_id: inviteId } },
    body: { accept },
  })
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
 * Kick another member (#959); not yourself (`leavePraxis`). `memberId` is a
 * CHARACTER id. Resets the group to editing (ADR-0013).
 */
export async function kickMember(
  praxisId: number,
  memberId: number,
): Promise<PraxisOut> {
  const { data } = await apiPost('/praxes/{praxis_id}/kick/{member_id}', {
    params: { path: { praxis_id: praxisId, member_id: memberId } },
  })
  // The reset re-enters the KICKER's own in-progress list too (#1867).
  notifyRequestsChanged()
  return data
}

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

// Same FlagIn body as comments (ADR-0037); `reasonDetail` only with reason='other'.
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
