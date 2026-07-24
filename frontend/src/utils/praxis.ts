import type { TFunction } from 'i18next'
import type { PraxisCardOut } from '../api/praxis'

/**
 * Praxis mode helpers (#992).
 *
 * A duel is two solo praxes linked by a `Duel` row (ADR-0011): a duel side is
 * stored `type='solo'` + a non-null `duel_id`, there is no `type='duel'` praxis.
 * So any surface that labels a praxis by `type` alone reads an accepted duel as
 * "Solo". Gate on duel presence FIRST, then fall back to the stored type.
 */

/** True when this praxis is a side of a duel — the `duel_id` is populated. */
export function isDuelPraxis(praxis: Pick<PraxisCardOut, 'duel_id'>): boolean {
  return praxis.duel_id != null
}

/**
 * The mode label for a praxis: "Duel" when it is a duel side, otherwise the
 * label for its stored type ("Solo" / "Collab"). Reads the `praxisType.*` keys
 * from the `common` catalog.
 */
export function praxisModeLabel(
  praxis: Pick<PraxisCardOut, 'type' | 'duel_id'>,
  t: TFunction<'common'>,
): string {
  return isDuelPraxis(praxis) ? t('praxisType.duel') : t(`praxisType.${praxis.type}`)
}
