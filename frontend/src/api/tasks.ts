import api from './axios'

export type TaskType = 'standard' | 'metatask'

export interface TaskOut {
  id: number
  title: string
  description: string | null
  point_value: number
  level_required: number
  status: string
  task_type: TaskType
  created_by: number
  primary_faction_slug: string | null
  metatask_faction_slug: string | null
  is_task_vision_eligible: boolean
  created_at: string
}

export interface TaskCreate {
  title: string
  description?: string
  point_value: number
  level_required: number
  primary_faction_slug?: string
  // Metatask branch — optional; when task_type='metatask' the backend
  // expects metatask_faction_slug too.
  task_type?: TaskType
  metatask_faction_slug?: string
}

export interface TaskFilters {
  status?: string
  faction?: string
  level?: number
  exclude_character_id?: number
  task_type?: TaskType
}

export async function listTasks(filters?: TaskFilters): Promise<TaskOut[]> {
  const { data } = await api.get<TaskOut[]>('/tasks', { params: filters })
  return data
}

export async function getTask(id: number): Promise<TaskOut> {
  const { data } = await api.get<TaskOut>(`/tasks/${id}`)
  return data
}

export async function proposeTask(body: TaskCreate): Promise<TaskOut> {
  const { data } = await api.post<TaskOut>('/tasks', body)
  return data
}

export interface TaskSignupOut {
  character_id: number
  display_name: string
  avatar_url: string
  faction_slug: string
  status: string
  signed_up_at: string
}

export async function getTaskSignups(taskId: number): Promise<TaskSignupOut[]> {
  const { data } = await api.get<TaskSignupOut[]>(`/tasks/${taskId}/signups`)
  return data
}
