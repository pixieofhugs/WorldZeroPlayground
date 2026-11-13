/**
 * Live copy overrides. `GET` is public (loaded at boot); `PUT`/`DELETE` are
 * guarded server-side, not here.
 */
import { apiDelete, apiGet, apiPut } from './client'
import type { components } from './generated/schema'

export type CopyOverride = components['schemas']['CopyOverrideOut']

export async function listCopyOverrides(): Promise<CopyOverride[]> {
  const { data } = await apiGet('/copy-overrides')
  return data
}

export async function putCopyOverride(
  override: components['schemas']['CopyOverrideIn'],
): Promise<CopyOverride> {
  const { data } = await apiPut('/copy-overrides', { body: override })
  return data
}

/** Drop one override; the shipped catalog value rules again. */
export async function deleteCopyOverride(ns: string, key: string): Promise<void> {
  await apiDelete('/copy-overrides', { params: { query: { ns, key } } })
}
