// Metatask API — metatasks are Task rows with task_type="metatask".
// Apply/remove routes are praxis-scoped; see frontend/src/api/praxis.ts.
import api from './axios'
import type { TaskOut } from './tasks'

export interface MetataskProposal {
  title: string
  description: string
  point_value: number
  level_required: number
  metatask_faction_slug: string
}

/** List all metatask-type tasks. */
export async function listMetatasks(): Promise<TaskOut[]> {
  const { data } = await api.get<TaskOut[]>('/tasks', {
    params: { task_type: 'metatask' },
  })
  return data
}

/** Propose a new metatask. Level-6 gated on the backend (admin bypass). */
export async function proposeMetatask(body: MetataskProposal): Promise<TaskOut> {
  const { data } = await api.post<TaskOut>('/tasks', {
    ...body,
    task_type: 'metatask',
  })
  return data
}
