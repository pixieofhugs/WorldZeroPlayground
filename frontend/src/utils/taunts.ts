import i18n from '../i18n'

/**
 * ADR-0031: the backend persists a structured taunt reference
 * (faction_slug, trigger_type, id, + FK-derived names); this resolver owns the
 * words via the taunts.json catalog. The faction's variant list is used when it
 * exists, otherwise the shared `default.<trigger>` list. The variant is picked
 * deterministically as `id % variants.length` — stable within a locale and
 * requiring zero backend knowledge of catalog contents — then the names are
 * interpolated.
 *
 * Keys are runtime-dynamic (server-supplied faction_slug / trigger_type), so
 * they can't be the typed literals `t()` expects. Resolve through a plain-string
 * view of `t` — the catalog still owns the words; only the compile-time key
 * check is relaxed for these dynamic lookups.
 */
const tArray = i18n.t as unknown as (k: string, o: { returnObjects: true }) => unknown
const tString = i18n.t as unknown as (
  k: string,
  o: { from_name: string; to_name: string },
) => string

export interface TauntRef {
  id: number
  faction_slug: string
  trigger_type: string
  from_name: string
  to_name: string
}

function variantsFor(faction: string, trigger: string): string[] {
  const key = `taunts:${faction}.${trigger}`
  // Probe with exists() first: a bare t() on a missing key trips the dev/test
  // missing-key throw before we could inspect the result. A faction with no
  // entry for this trigger is a normal miss — let the caller fall back to the
  // default list.
  if (!i18n.exists(key)) return []
  const list = tArray(key, { returnObjects: true })
  return Array.isArray(list) ? (list as string[]) : []
}

/**
 * Resolve a taunt reference to a rendered sentence in the viewer's locale, or
 * `null` when no variant (not even a default) exists for the trigger.
 */
export function resolveTaunt(taunt: TauntRef): string | null {
  let branch = taunt.faction_slug
  let variants = variantsFor(branch, taunt.trigger_type)
  if (variants.length === 0 && branch !== 'default') {
    branch = 'default'
    variants = variantsFor(branch, taunt.trigger_type)
  }
  if (variants.length === 0) return null

  const index = ((taunt.id % variants.length) + variants.length) % variants.length
  return tString(`taunts:${branch}.${taunt.trigger_type}.${index}`, {
    from_name: taunt.from_name,
    to_name: taunt.to_name,
  })
}
