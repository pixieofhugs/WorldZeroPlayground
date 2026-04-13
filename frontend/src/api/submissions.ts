import api from './axios'

export interface MediaItemOut {
  id: number
  type: string
  file_path: string
  display_order: number
}

export interface SubmissionOut {
  id: number
  task_id: number
  character_id: number
  character_display_name: string
  task_title: string
  task_point_value: number
  title: string
  body_text: string | null
  is_flagged: boolean
  created_at: string
  updated_at: string
  media: MediaItemOut[]
  score: number | null
}

export interface SubmissionCreate {
  task_id: number
  title: string
  body_text?: string
}

export async function listSubmissions(params?: { task_id?: number; character_id?: number }): Promise<SubmissionOut[]> {
  const { data } = await api.get<SubmissionOut[]>('/submissions', { params })
  return data
}

export async function getSubmission(id: number): Promise<SubmissionOut> {
  const { data } = await api.get<SubmissionOut>(`/submissions/${id}`)
  return data
}

export async function createSubmission(body: SubmissionCreate): Promise<SubmissionOut> {
  const { data } = await api.post<SubmissionOut>('/submissions', body)
  return data
}

export async function editSubmission(id: number, body: Partial<SubmissionCreate>): Promise<SubmissionOut> {
  const { data } = await api.put<SubmissionOut>(`/submissions/${id}`, body)
  return data
}

export async function uploadMedia(submissionId: number, file: File): Promise<MediaItemOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<MediaItemOut>(`/submissions/${submissionId}/media`, form)
  return data
}

export async function flagSubmission(submissionId: number, reason: string): Promise<SubmissionOut> {
  const { data } = await api.post<SubmissionOut>(`/submissions/${submissionId}/flag`, { reason })
  return data
}

export async function deleteMedia(submissionId: number, mediaId: number): Promise<void> {
  await api.delete(`/submissions/${submissionId}/media/${mediaId}`)
}
