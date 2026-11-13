import i18n from '../i18n'

/**
 * ADR-0031: the backend sends a structured taunt ref; taunts.json owns the
 * words. Faction list, else `default.<trigger>`; variant = `id % length`.
 * Untyped `t` views because keys are runtime-dynamic. Captured at import:
 * vi.spyOn(i18n, 't') never sees these; use copyRegistry recording.
 */
const tArray = i18n.t as unknown as (k: string, o: { returnObjects: true }) => unknown
const tString = i18n.t as unknown as (
  k: string,
  o: { from_name: string; to_name: string },
) => string

interface TauntRef {
  id: number
  faction_slug: string
  trigger_type: string
  from_name: string
  to_name: string
}

function variantsFor(faction: string, trigger: string): string[] {
  const key = `taunts:${faction}.${trigger}`
  // exists() first: a bare t() on a missing key throws in dev/test.
  if (!i18n.exists(key)) return []
  const list = tArray(key, { returnObjects: true })
  return Array.isArray(list) ? (list as string[]) : []
}

/** `null` when no variant (not even a default) exists for the trigger. */
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
