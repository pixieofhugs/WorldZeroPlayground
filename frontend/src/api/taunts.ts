import api from './axios'

// ADR-0031: a structured taunt reference, not rendered prose. Resolve the copy
// via the taunts.json catalog: t(`taunts:${faction_slug}.${trigger_type}`) with
// a `taunts:default.<trigger_type>` fallback, pick the variant as
// `id % variants.length`, and interpolate from_display_name / to_display_name.
export interface TauntMessageOut {
  id: number
  from_character_id: number
  to_character_id: number
  faction_slug: string
  trigger_type: string
  created_at: string
  from_display_name: string
  from_faction_slug: string
  from_avatar_url: string | null
  to_display_name: string
}

export async function getTaunts(limit?: number): Promise<TauntMessageOut[]> {
  const { data } = await api.get<TauntMessageOut[]>('/taunts', { params: { limit } })
  return data
}
