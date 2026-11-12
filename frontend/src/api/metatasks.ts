// Metatasks are Task rows with task_type="metatask"; apply/remove live in ./praxis.
import { apiGet, apiPost } from './client'
import type { TaskOut } from './tasks'

export interface MetataskProposal {
  title: string
  description: string
  point_value: number
  level_required: number
  metatask_faction_slug: string
}

export async function listMetatasks(): Promise<TaskOut[]> {
  const { data } = await apiGet('/tasks', { params: { query: { task_type: 'metatask' } } })
  return data
}

/** Level-6 gated server-side (admin bypass). */
export async function proposeMetatask(body: MetataskProposal): Promise<TaskOut> {
  const { data } = await apiPost('/tasks', { body: { ...body, task_type: 'metatask' } })
  return data
}
