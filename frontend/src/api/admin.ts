import api from './axios'
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

/** One flag row on a queue item (#237, ADR-0031). `reason` is a vocabulary key;
 *  legacy free text / `other` notes surface via `reason_detail`. */
export interface FlagOut {
  reason: string
  reason_detail: string | null
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
  const { data } = await api.get<OverviewStats>('/admin/overview')
  return data
}

export async function getPendingTasks(): Promise<PendingTaskOut[]> {
  const { data } = await api.get<PendingTaskOut[]>('/admin/tasks/pending')
  return data
}

export async function getMessages(archived = false): Promise<ContactMessageOut[]> {
  const { data } = await api.get<ContactMessageOut[]>('/admin/messages', { params: { archived } })
  return data
}

export async function getFlaggedPraxes(): Promise<FlaggedPraxisOut[]> {
  const { data } = await api.get<FlaggedPraxisOut[]>('/admin/praxes/flagged')
  return data
}

export async function getFlaggedComments(): Promise<FlaggedCommentOut[]> {
  const { data } = await api.get<FlaggedCommentOut[]>('/admin/comments/flagged')
  return data
}

export async function getAdminCharacters(status?: string): Promise<AdminCharacterSummary[]> {
  const { data } = await api.get<AdminCharacterSummary[]>('/admin/characters', {
    params: status ? { status } : {},
  })
  return data
}

export async function getAccounts(email?: string): Promise<AccountSummary[]> {
  const { data } = await api.get<AccountSummary[]>('/admin/accounts', { params: email ? { email } : {} })
  return data
}

export async function getAccountDetail(id: number): Promise<AccountDetail> {
  const { data } = await api.get<AccountDetail>(`/admin/accounts/${id}`)
  return data
}

export async function getAllTasks(): Promise<TaskOut[]> {
  const { data } = await api.get<TaskOut[]>('/tasks', { params: { status: 'all' } })
  return data
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function approveTask(id: number): Promise<TaskOut> {
  const { data } = await api.put<TaskOut>(`/admin/tasks/${id}/approve`)
  return data
}

export async function retireTask(id: number): Promise<TaskOut> {
  const { data } = await api.put<TaskOut>(`/admin/tasks/${id}/retire`)
  return data
}

export async function updateTaskStatus(id: number, status: string): Promise<TaskOut> {
  const { data } = await api.put<TaskOut>(`/admin/tasks/${id}/status`, { status })
  return data
}

interface AdminTaskPatch {
  title?: string
  description?: string
  point_value?: number
  level_required?: number
}

export async function adminPatchTask(id: number, patch: AdminTaskPatch): Promise<TaskOut> {
  const { data } = await api.patch<TaskOut>(`/admin/tasks/${id}`, patch)
  return data
}

export async function moderatePraxis(
  id: number,
  status: string,
  adminNote?: string,
): Promise<PraxisOut> {
  const { data } = await api.patch<PraxisOut>(`/admin/praxes/${id}/moderate`, {
    status,
    admin_note: adminNote || null,
  })
  return data
}

export async function moderateComment(
  id: number,
  status: 'visible' | 'hidden' | 'deleted',
): Promise<CommentOut> {
  const { data } = await api.patch<CommentOut>(`/admin/comments/${id}/moderate`, {
    status,
  })
  return data
}

export async function archiveMessage(id: number): Promise<ContactMessageOut> {
  const { data } = await api.patch<ContactMessageOut>(`/admin/messages/${id}/archive`)
  return data
}

export async function suspendAccount(id: number, suspended: boolean): Promise<void> {
  await api.post(`/admin/accounts/${id}/suspend`, { suspended })
}

export async function banCharacter(id: number, banned: boolean): Promise<void> {
  await api.post(`/admin/characters/${id}/ban`, { banned })
}
