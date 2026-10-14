/**
 * Whether an edit to a catalog key changes ONE faction's screens or every
 * faction's — the note the copy editor shows beside an open key.
 *
 * Faction-scoped: some dotted segment of the key is a faction slug
 * (`feed:factionSelect.wow.banner`), or it is a faction's own name or blurb
 * (`factions:names.*` / `descriptions.*`). Anything else is shared wording every
 * faction's skin reads (ADR-0057), so rewording it from one faction's copy sheet
 * rewords them all.
 *
 * Its own module, not `copyRegistry`: `i18n.ts` imports that one, and
 * `utils/factions` imports `i18n`, so reading the slug list there is a cycle.
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
