/**
 * Whether an edited key changes ONE faction's screens or every faction's
 * (shared wording, ADR-0057). Separate from `copyRegistry` to avoid an import
 * cycle via `i18n.ts` → `utils/factions`.
 */
import type { CopyTarget } from './copyRegistry'
import {
  ALBESCENT_FACTION_SLUG,
  FACTION_RAINBOW_ORDER,
  UNAFFILIATED_FACTION_SLUG,
} from './factions'

export function isFactionScopedKey(target: CopyTarget): boolean {
  if (target.ns === 'factions' && /^(names|descriptions)\./.test(target.key)) return true
  const slugs = [...FACTION_RAINBOW_ORDER, ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG]
  return target.key.split('.').some((segment) => slugs.includes(segment))
}
