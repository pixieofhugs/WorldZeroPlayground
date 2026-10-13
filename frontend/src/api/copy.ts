/**
 * Live copy overrides — a wording change without a deploy.
 *
 * `GET` is public and unauthenticated: every visitor loads the overrides at
 * boot, because an override IS the copy once it exists. `PUT`/`DELETE` are
 * admin-only on the server; nothing here guards them, the route does.
 */
import { apiDelete, apiGet, apiPut } from './client'
import type { components } from './generated/schema'

/** One override as every visitor reads it: namespace file, dotted key, wording. */
export type CopyOverride = components['schemas']['CopyOverrideOut']

/** Every override in force. Public — this is what the boot load reads. */
export async function listCopyOverrides(): Promise<CopyOverride[]> {
  const { data } = await apiGet('/copy-overrides')
  return data
}

/** Set one key's live wording. Admin only. */
export async function putCopyOverride(
  override: components['schemas']['CopyOverrideIn'],
): Promise<CopyOverride> {
  const { data } = await apiPut('/copy-overrides', { body: override })
  return data
}

/** Drop one override, so the shipped catalog value rules again. Admin only. */
export async function deleteCopyOverride(ns: string, key: string): Promise<void> {
  await apiDelete('/copy-overrides', { params: { query: { ns, key } } })
}
