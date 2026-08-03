import { apiGet, apiPost, apiPut, apiPatch } from './client'
import { wireSent } from './wireSent'
import type { TaskOut } from './tasks'
import type { PraxisOut } from './praxis'
import type { CommentOut } from './comments'

export interface PendingTaskOut extends TaskOut {
  created_by_name: string
}

export interface ContactMessageOut {
  id: number
  name: string
  email: string
  message: string
  is_archived: boolean
  created_at: string
}

export interface OverviewStats {
  accounts: number
  characters: number
  active_tasks: number
  praxis: number
  votes: number
  flagged_praxis: number
  suspended_accounts: number
}

export interface AccountSummary {
  id: number
  email: string
  status: string
  created_at: string
}

export interface CharacterBrief {
  id: number
  username: string
  display_name: string
  faction_slug: string
  status: string
}

export interface AccountDetail extends AccountSummary {
  characters: CharacterBrief[]
}

/** The two lives a character can be in (`models.character.CharacterStatus`).
 *  `paused` was deleted in #1550 and nothing ever wrote it. */
export type CharacterStatus = 'active' | 'banned'

/** Full admin character row — matches backend schemas/admin.py CharacterSummary. */
export interface AdminCharacterSummary {
  id: number
  account_id: number
  username: string
  display_name: string
  faction_slug: string
  status: string
  score: number
  level: number
  votes_available: number
  created_at: string
}

/** One flag row on a queue item (#237, ADR-0037). `reason` is a vocabulary key;
 *  legacy free text / `other` notes surface via `reason_detail`. */
export interface FlagOut {
  reason: string
  /** Optional, not merely nullable: `Flag.reason_detail` is `Optional[str] = None`
   *  in Pydantic, and a defaulted field is not *required* in the OpenAPI schema
   *  (#1400). */
  reason_detail?: string | null
  flagged_by_id: number
  flagged_by_name: string
  created_at: string
}

export interface FlaggedPraxisOut extends PraxisOut {
  flags: FlagOut[]
}

export interface FlaggedCommentOut extends CommentOut {
  flags: FlagOut[]
}

// ---------------------------------------------------------------------------
// Read / Inspect
// ---------------------------------------------------------------------------

export async function getOverview(): Promise<OverviewStats> {
  const { data } = await apiGet('/admin/overview')
  return data
}

export async function getPendingTasks(): Promise<PendingTaskOut[]> {
  const { data } = await apiGet('/admin/tasks/pending')
  return data
}

export async function getMessages(archived = false): Promise<ContactMessageOut[]> {
  const { data } = await apiGet('/admin/messages', { params: { query: { archived } } })
  return data
}

export async function getFlaggedPraxes(): Promise<FlaggedPraxisOut[]> {
  const { data } = await apiGet('/admin/praxes/flagged')
  return data.map(wireSent)
}

export async function getFlaggedComments(): Promise<FlaggedCommentOut[]> {
  const { data } = await apiGet('/admin/comments/flagged')
  return data.map(wireSent)
}

export async function getAdminCharacters(status?: CharacterStatus): Promise<AdminCharacterSummary[]> {
  const { data } = await apiGet('/admin/characters', { params: { query: { status } } })
  return data
}

export async function getAccounts(email?: string): Promise<AccountSummary[]> {
  const { data } = await apiGet('/admin/accounts', { params: { query: { email } } })
  return data
}

export async function getAccountDetail(id: number): Promise<AccountDetail> {
  const { data } = await apiGet('/admin/accounts/{account_id}', {
    params: { path: { account_id: id } },
  })
  return data
}

/**
 * Every task, for the admin table. The explicit `limit` and `sort` are load-bearing
 * (#909): `/tasks` defaults to 50 rows ordered easiest-first, which silently dropped
 * the hardest tasks — including every proposed metatask — off the admin list.
 *
 * ponytail: two requests (this plus `getPendingTasks`) cover an admin table of tens
 * of rows; when the task table outgrows 500, move status filtering server-side and
 * paginate.
 */
export async function getAllTasks(): Promise<TaskOut[]> {
  const { data } = await apiGet('/tasks', {
    params: { query: { status: 'all', limit: 500, sort: 'newest' } },
  })
  return data
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function approveTask(id: number): Promise<TaskOut> {
  const { data } = await apiPut('/admin/tasks/{task_id}/approve', {
    params: { path: { task_id: id } },
  })
  return data
}

export async function retireTask(id: number): Promise<TaskOut> {
  const { data } = await apiPut('/admin/tasks/{task_id}/retire', {
    params: { path: { task_id: id } },
  })
  return data
}

/** The three states an admin can move a task between (`schemas.admin.TaskStatusAction`). */
export type AdminTaskStatus = 'pending' | 'active' | 'retired'

export async function updateTaskStatus(id: number, status: AdminTaskStatus): Promise<TaskOut> {
  const { data } = await apiPut('/admin/tasks/{task_id}/status', {
    params: { path: { task_id: id } },
    body: { status },
  })
  return data
}

interface AdminTaskPatch {
  title?: string
  description?: string
  point_value?: number
  level_required?: number
}

export async function adminPatchTask(id: number, patch: AdminTaskPatch): Promise<TaskOut> {
  const { data } = await apiPatch('/admin/tasks/{task_id}', {
    params: { path: { task_id: id } },
    body: patch,
  })
  return data
}

/** Readout for a successful CSV task import (#1376). */
export interface TaskImportResult {
  created_count: number
  created_titles: string[]
  /** Corrections applied on the way in, e.g. a legacy faction slug. */
  warnings: string[]
}

/** One rejected CSV row, as the backend's 422 `detail` reports it. */
export interface TaskImportRowError {
  row: number
  msg: string
}

/**
 * Bulk-create tasks from a CSV. **Atomic**: on success every row became a task;
 * on failure nothing was created and `taskImportRowErrors` lists every bad row.
 *
 * The Content-Type is deliberately left to the browser — setting it by hand
 * drops the multipart boundary.
 */
export async function importTasksCsv(file: File): Promise<TaskImportResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiPost('/admin/tasks/import-csv', {
    // The only non-JSON body in this module, and the cast is the whole reason
    // it needs a comment. `openapi-typescript` renders `format: binary` as
    // `string`, so the generated body type is `{ file: string }` — which no
    // multipart upload can ever satisfy. `openapi-fetch` passes a `FormData`
    // through its serializer untouched and then leaves Content-Type unset so
    // the browser writes the boundary; `__tests__/adminCsvImport.test.ts`
    // asserts both, because a silently JSON-stringified FormData reaches the
    // server as `{}` with nothing in CI going red.
    body: form as unknown as { file: string },
  })
  return data
}

/**
 * Every per-row rejection from a failed `importTasksCsv`, or `[]` if the failure
 * was not a row-level one (network, 403, 500) — those go through `extractError`.
 *
 * Reads `ApiError.data`, which is where `client.ts` puts the parsed body — axios
 * put it on `.response.data`, and a reader still looking there returns `[]` for
 * every row-level 422 without a type, a test or a log saying so (#1400).
 */
export function taskImportRowErrors(err: unknown): TaskImportRowError[] {
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail
  if (!Array.isArray(detail)) return []
  return detail.filter(
    (item): item is TaskImportRowError =>
      typeof item?.msg === 'string' && typeof item?.row === 'number',
  )
}

/** What a moderator can rule a praxis to be (`schemas.admin.ModerationAction`).
 *  Note `failed`, which is not one of the comment verdicts. */
export type PraxisModerationStatus = 'visible' | 'hidden' | 'failed'

export async function moderatePraxis(
  id: number,
  status: PraxisModerationStatus,
  adminNote?: string,
): Promise<PraxisOut> {
  const { data } = await apiPatch('/admin/praxes/{praxis_id}/moderate', {
    params: { path: { praxis_id: id } },
    body: { status, admin_note: adminNote || null },
  })
  return wireSent(data)
}

export async function moderateComment(
  id: number,
  status: 'visible' | 'hidden' | 'deleted',
): Promise<CommentOut> {
  const { data } = await apiPatch('/admin/comments/{comment_id}/moderate', {
    params: { path: { comment_id: id } },
    body: { status },
  })
  return wireSent(data)
}

export async function archiveMessage(id: number): Promise<ContactMessageOut> {
  const { data } = await apiPatch('/admin/messages/{message_id}/archive', {
    params: { path: { message_id: id } },
  })
  return data
}

export async function suspendAccount(id: number, suspended: boolean): Promise<void> {
  await apiPost('/admin/accounts/{account_id}/suspend', {
    params: { path: { account_id: id } },
    body: { suspended },
  })
}

export async function banCharacter(id: number, banned: boolean): Promise<void> {
  await apiPost('/admin/characters/{character_id}/ban', {
    params: { path: { character_id: id } },
    body: { banned },
  })
}
