import api from './axios'

export interface MediaItemOut {
  id: number
  type: string
  file_path: string
  display_order: number
}

export interface PraxisOut {
  id: number
  task_id: number
  character_id: number
  character_display_name: string
  task_title: string
  task_point_value: number
  task_faction_slug: string | null
  title: string
  body_text: string | null
  moderation_status: string
  is_withdrawn: boolean
  admin_note: string | null
  created_at: string
  updated_at: string
  media: MediaItemOut[]
  score: number | null
}

export interface PraxisCreate {
  task_id: number
  title: string
  body_text?: string
}

export async function listPraxes(params?: { task_id?: number; character_id?: number }): Promise<PraxisOut[]> {
  const { data } = await api.get<PraxisOut[]>('/praxes', { params })
  return data
}

export async function getPraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.get<PraxisOut>(`/praxes/${id}`)
  return data
}

export async function createPraxis(body: PraxisCreate): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>('/praxes', body)
  return data
}

export async function editPraxis(id: number, body: Partial<PraxisCreate>): Promise<PraxisOut> {
  const { data } = await api.put<PraxisOut>(`/praxes/${id}`, body)
  return data
}

export async function uploadMedia(praxisId: number, file: File): Promise<MediaItemOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<MediaItemOut>(`/praxes/${praxisId}/media`, form)
  return data
}

export async function flagPraxis(praxisId: number, reason: string): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${praxisId}/flag`, { reason })
  return data
}

export async function deleteMedia(praxisId: number, mediaId: number): Promise<void> {
  await api.delete(`/praxes/${praxisId}/media/${mediaId}`)
}

export async function withdrawPraxis(praxisId: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${praxisId}/withdraw`)
  return data
}

export async function resubmitPraxis(praxisId: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${praxisId}/resubmit`)
  return data
}

