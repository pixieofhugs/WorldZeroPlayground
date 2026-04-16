import api from './axios'

export interface MetaTaskOut {
  id: number
  name: string
  description: string
  faction_slug: string
  bonus_type: string
  bonus_value: number
  level_required: number
}

export interface MetaTaskCreate {
  name: string
  description: string
  faction_slug: string
  bonus_value: number
  level_required: number
}

export async function getMetaTasks(taskId?: number): Promise<MetaTaskOut[]> {
  const params = taskId !== undefined ? { task_id: taskId } : {}
  const { data } = await api.get<MetaTaskOut[]>('/meta-tasks', { params })
  return data
}

export async function createMetaTask(body: MetaTaskCreate): Promise<MetaTaskOut> {
  const { data } = await api.post<MetaTaskOut>('/meta-tasks', body)
  return data
}
