/**
 * The faction facet: one configuration of the generic `OptionPicker` (#1446).
 * A plain function on the raw i18n instance, so tests need no React; mounting
 * pages re-render on language change.
 */
import i18n from '../../../i18n'
import type { FactionOut } from '../../../api/factions'
import FactionSigil from '../../sigil/FactionSigil'
import {
  factionCssVar,
  factionName,
  isFactionHiddenFromChoosers,
  isKnownFaction,
  sortFactionsByRainbowOrder,
  UNAFFILIATED_FACTION_SLUG,
} from '../../../utils/factions'
import {
  selectedFirst,
  type FilterFacet,
  type OrnamentPlace,
} from './filterState'

/** Sigil sizes per place, tuned separately. */
const SIGIL_SIZE: Record<OrnamentPlace, number> = {
  row: 18,
  trigger: 13,
  chip: 14,
}

/**
 * `GET /factions` in rainbow order plus the `na` sentinel last (#1361 ruling 4).
 * `na` is a state, not a faction (ADR-0030/0039), so the API omits it. Never a
 * hardcoded list: it would leak `albescent` pre-reveal (ADR-0027).
 *
 * Hidden factions are removed, not masked (#1891): a masked row would read as
 * a second "Unaffiliated".
 */
export function filterRoster(factions: FactionOut[]): string[] {
  const visible = sortFactionsByRainbowOrder(factions)
    .map((faction) => faction.slug)
    .filter(
      (slug) =>
        slug !== UNAFFILIATED_FACTION_SLUG && !isFactionHiddenFromChoosers(slug),
    )
  return [...visible, UNAFFILIATED_FACTION_SLUG]
}

/** The faction axis as a `FilterFacet`. No counts (#1361 ruling 3). */
export function factionFacet(
  factions: FactionOut[],
  selected: string[],
  onChange: (slugs: string[]) => void,
): FilterFacet {
  const roster = filterRoster(factions)
  // Selected slugs absent from the roster (it's empty until `useFactions()`
  // lands) still get a named row, except hidden ones (#1891).
  const unlisted = selected.filter(
    (slug) => !roster.includes(slug) && !isFactionHiddenFromChoosers(slug),
  )
  return {
    key: 'faction',
    label: i18n.t('common:filters.bar.factions'),
    options: selectedFirst([...roster, ...unlisted], selected).map((slug) => ({
      value: slug,
      label: factionName(slug),
    })),
    selected,
    onChange,
    // Ink only for a slug that owns a solid (#2528): `na`/`albescent`/unknown
    // map to the grey `--faction-default`, which would hide their spectrum.
    renderOrnament: (slug, place) => (
      <FactionSigil
        slug={slug}
        size={SIGIL_SIZE[place]}
        color={isKnownFaction(slug) ? factionCssVar(slug) : undefined}
      />
    ),
  }
}
