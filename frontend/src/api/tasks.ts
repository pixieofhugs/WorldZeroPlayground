import api from './axios'

export interface TaskOut {
  id: number
  title: string
  description: string | null
  point_value: number
  level_required: number
  status: string
  created_by: number
  primary_faction_slug: string | null
  is_task_vision_eligible: boolean
  created_at: string
}

export interface CharacterTaskOut {
  id: number
  task: TaskOut
  status: string
  signed_up_at: string
}

export interface TaskCreate {
  title: string
  description?: string
  point_value: number
  level_required: number
  primary_faction_slug?: string
}

export interface TaskFilters {
  status?: string
  faction?: string
  level?: number
}

export async function listTasks(filters?: TaskFilters): Promise<TaskOut[]> {
  const { data } = await api.get<TaskOut[]>('/tasks', { params: filters })
  return data
}

export async function getTask(id: number): Promise<TaskOut> {
  const { data } = await api.get<TaskOut>(`/tasks/${id}`)
  return data
}

export async function signupTask(id: number): Promise<CharacterTaskOut> {
  const { data } = await api.post<CharacterTaskOut>(`/tasks/${id}/signup`)
  return data
}

export async function dropTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}/signup`)
}

export async function proposeTask(body: TaskCreate): Promise<TaskOut> {
  const { data } = await api.post<TaskOut>('/tasks', body)
  return data
}

export async function getMyTasks(status?: string): Promise<CharacterTaskOut[]> {
  const { data } = await api.get<CharacterTaskOut[]>('/tasks/my-tasks', { params: status ? { status } : undefined })
  return data
}
