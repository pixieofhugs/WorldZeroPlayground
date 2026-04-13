import api from './axios'
import type { TaskOut } from './tasks'
import type { SubmissionOut } from './submissions'

export interface PendingTaskOut extends TaskOut {
  created_by_name: string
}

export interface ContactMessageOut {
  id: number
  name: string
  email: string
  message: string
  created_at: string
}

export async function getPendingTasks(): Promise<PendingTaskOut[]> {
  const { data } = await api.get<PendingTaskOut[]>('/admin/tasks/pending')
  return data
}

export async function getMessages(): Promise<ContactMessageOut[]> {
  const { data } = await api.get<ContactMessageOut[]>('/admin/messages')
  return data
}

export async function approveTask(id: number): Promise<TaskOut> {
  const { data } = await api.put<TaskOut>(`/admin/tasks/${id}/approve`)
  return data
}

export async function retireTask(id: number): Promise<TaskOut> {
  const { data } = await api.put<TaskOut>(`/admin/tasks/${id}/retire`)
  return data
}

export async function deleteSubmission(id: number): Promise<void> {
  await api.delete(`/admin/submissions/${id}`)
}

export async function banCharacter(id: number): Promise<void> {
  await api.post(`/admin/characters/${id}/ban`)
}

export async function getFlaggedSubmissions(): Promise<SubmissionOut[]> {
  const { data } = await api.get<SubmissionOut[]>('/submissions', { params: { is_flagged: true } })
  return data
}
