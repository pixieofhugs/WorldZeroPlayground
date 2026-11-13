import { apiDelete, apiGet, apiPost, apiPut, apiPatch } from './client'
import type { components, operations } from './generated/schema'
import type { TaskOut } from './tasks'
import type { PraxisCardOut, PraxisOut } from './praxis'
import type { CommentOut } from './comments'

export type PendingTaskOut = components['schemas']['PendingTaskOut']

// Two backend models share this name; the generator prefixes by module. This is the admin one.
export type ContactMessageOut = components['schemas']['routers__admin__ContactMessageOut']

export type OverviewStats = components['schemas']['OverviewStats']

export type AccountSummary = components['schemas']['AccountSummary']

export type CharacterBrief = components['schemas']['CharacterBrief']

export type AccountDetail = components['schemas']['AccountDetail']

export type CharacterStatus = components['schemas']['CharacterStatus']

type AdminCharacterSummary = components['schemas']['CharacterSummary']

/** `reason` is a vocabulary key (ADR-0037); legacy text and `other` notes are in `reason_detail`. */
export type FlagOut = components['schemas']['FlagOut']

export type FlaggedPraxisOut = components['schemas']['FlaggedPraxisOut']

export type FlaggedCommentOut = components['schemas']['FlaggedCommentOut']

/** `name` comes from the era config, not a row: an era never run has no row (#827). */
export type EraOption = components['schemas']['EraOption']

export type EraRollOut = components['schemas']['EraRollOut']

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
  return data
}

/** Aliased to the schema so a renamed query key is a compile error (#3061). */
export type AdminPraxisQuery = NonNullable<
  operations['admin_list_praxes_admin_praxes_get']['parameters']['query']
>

/** Like `listPraxes` but INCLUDES hidden praxes and others' drafts (#3061). */
export async function listAdminPraxes(query: AdminPraxisQuery): Promise<PraxisCardOut[]> {
  const { data } = await apiGet('/admin/praxes', { params: { query } })
  return data
}

export async function getFlaggedComments(): Promise<FlaggedCommentOut[]> {
  const { data } = await apiGet('/admin/comments/flagged')
  return data
}

export async function getEras(): Promise<EraOption[]> {
  const { data } = await apiGet('/admin/eras')
  return data
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

/** Leaving `deleted` is the undo. */
export type AdminTaskStatus = components['schemas']['TaskStatusAction']['status']

export async function updateTaskStatus(id: number, status: AdminTaskStatus): Promise<TaskOut> {
  const { data } = await apiPut('/admin/tasks/{task_id}/status', {
    params: { path: { task_id: id } },
    body: { status },
  })
  return data
}

type AdminTaskPatch = components['schemas']['AdminTaskPatch']

export async function adminPatchTask(id: number, patch: AdminTaskPatch): Promise<TaskOut> {
  const { data } = await apiPatch('/admin/tasks/{task_id}', {
    params: { path: { task_id: id } },
    body: patch,
  })
  return data
}

/**
 * Soft-delete an unreferenced task (#3305); `updateTaskStatus` is the undo. A
 * task with history 409s (`TASK_HAS_HISTORY`) — retire it instead.
 */
export async function deleteTask(id: number): Promise<void> {
  await apiDelete('/admin/tasks/{task_id}', {
    params: { path: { task_id: id } },
  })
}

/** `warnings`: corrections applied on import, e.g. a legacy faction slug (#1376). */
export type TaskImportResult = components['schemas']['TaskImportResult']

/** One rejected CSV row from the 422 `detail`. */
export interface TaskImportRowError {
  row: number
  msg: string
}

/**
 * **Atomic**: all rows or none; on failure `taskImportRowErrors` lists bad rows.
 * Content-Type is left to the browser (setting it drops the boundary).
 */
export async function importTasksCsv(file: File): Promise<TaskImportResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiPost('/admin/tasks/import-csv', {
    // Multipart cast: see `uploadPraxisMedia` in `./praxis`; pinned by `__tests__/adminCsvImport.test.ts`.
    body: form as unknown as { file: string },
  })
  return data
}

/**
 * Row rejections from a failed `importTasksCsv`, or `[]` for non-row failures
 * (use `extractError`). Reads `ApiError.data`, where `client.ts` puts the body.
 */
export function taskImportRowErrors(err: unknown): TaskImportRowError[] {
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail
  if (!Array.isArray(detail)) return []
  return detail.filter(
    (item): item is TaskImportRowError =>
      typeof item?.msg === 'string' && typeof item?.row === 'number',
  )
}

/** Includes `failed`, which comments lack. */
export type PraxisModerationStatus = components['schemas']['ModerationAction']['status']

export async function moderatePraxis(
  id: number,
  status: PraxisModerationStatus,
  adminNote?: string,
): Promise<PraxisOut> {
  const { data } = await apiPatch('/admin/praxes/{praxis_id}/moderate', {
    params: { path: { praxis_id: id } },
    body: { status, admin_note: adminNote || null },
  })
  return data
}

export async function moderateComment(
  id: number,
  status: 'visible' | 'hidden' | 'deleted',
): Promise<CommentOut> {
  const { data } = await apiPatch('/admin/comments/{comment_id}/moderate', {
    params: { path: { comment_id: id } },
    body: { status },
  })
  return data
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

/**
 * End the live era and open the named one. **No undo** (#827). NOT idempotent
 * despite `PUT`: a second call opens a second era; the caller must confirm.
 */
export async function rollIntoEra(configKey: string): Promise<EraRollOut> {
  const { data } = await apiPut('/admin/eras/live', {
    body: { config_key: configKey },
  })
  return data
}

/** Owner-only admin roster (#3258), addressed by username. */
export type AdminRow = components['schemas']['AdminRow']

export async function getAdmins(): Promise<AdminRow[]> {
  const { data } = await apiGet('/admin/admins')
  return data
}

export async function grantAdmin(username: string): Promise<AdminRow> {
  const { data } = await apiPost('/admin/admins', { body: { username } })
  return data
}

export async function revokeAdmin(username: string): Promise<void> {
  await apiDelete('/admin/admins/{username}', { params: { path: { username } } })
}
