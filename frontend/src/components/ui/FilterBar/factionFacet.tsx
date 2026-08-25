/**
 * The faction facet — ONE configuration of the generic option multi-select
 * (#1446), not a thing of its own.
 *
 * `OptionPicker` knows about options, selection and an optional ornament.
 * Everything that makes the faction axis the faction axis — the `GET /factions`
 * roster plus the `na` sentinel, the sigil, the localized names,
 * selected-sort-first — lives here, on the caller's side of that seam. Updates'
 * type facet (#1421) is a sibling of this file, not a change to the widget.
 *
 * A plain function rather than a hook: it reads the raw i18n instance the way
 * `factionName` does, so it is callable from a test with no React around it.
 * Both mounting pages already re-render on a language change, so the labels
 * still follow the catalog.
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

/** Sigil sizes, per place. The three were tuned separately and stay separate. */
const SIGIL_SIZE: Record<OrnamentPlace, number> = {
  row: 18,
  trigger: 13,
  chip: 14,
}

/**
 * The faction roster the picker offers: `GET /factions` in rainbow order plus
 * the explicit `na` sentinel, appended last (#1361 ruling 4).
 *
 * This is `FilterFactionTabs`' rationale, unchanged. `na` is a state rather
 * than a faction (ADR-0030 / ADR-0039), so it is deliberately absent from
 * `GET /factions` and from `FACTION_RAINBOW_ORDER`; cross-faction is the
 * commonest kind of task and the one slice you could not otherwise isolate, so
 * the filter supplies it by hand. The design's hardcoded nine is the thing this
 * must not be: `/factions` returns visible factions only, so `albescent` is
 * absent pre-reveal (ADR-0027) and a literal list would leak it.
 *
 * The `isFactionHiddenFromChoosers` filter is belt AND braces on top of that
 * server gate (#1891). This is a CHOOSER, so the row is REMOVED rather than
 * masked: `factionName()` answers "Unaffiliated" for an unrevealed viewer, and
 * this roster appends the real `na` sentinel unconditionally — a masked row
 * would hand that viewer two identical Unaffiliated checkboxes, which is louder
 * than the leak it replaces.
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

/**
 * The faction axis as a `FilterFacet`. No counts: cut by owner ruling (#1361
 * ruling 3), because a facet aggregate the windowed page cannot derive needs a
 * new endpoint and a round trip per filter change, and every row already names
 * its faction.
 */
export function factionFacet(
  factions: FactionOut[],
  selected: string[],
  onChange: (slugs: string[]) => void,
): FilterFacet {
  const roster = filterRoster(factions)
  // A selected slug the roster does not hold still gets a row and, more to the
  // point, a NAMED chip. `useFactions()` is null until its response lands, so
  // without this a deep link like `?factions=ua` printed the raw slug on the
  // chip for one round trip — `deriveChips` reads labels off this list, where
  // the old faction-shaped version called `factionName` directly.
  // ...but a hand-typed `?factions=albescent` must not put the row back (#1891).
  // Without this filter the deep link re-adds it — as a second "Unaffiliated",
  // since the mask already owns the label — which both duplicates a row and
  // tells the viewer their guessed slug was real.
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
    // A SOLID ONLY FOR A SLUG THAT OWNS ONE (#2528). This facet is the only
    // sigil mount in the tree that passes a `color`, and it exists so a themed
    // faction's mark reads as that faction at the trigger's 13px — #2635 is
    // where that stopped being aspirational for UA. But `na` and `albescent`
    // both resolve to CSS_KEY `default`, and `--faction-default` is a flat grey:
    // handing it to them painted over the very spectrum they own — the
    // unaffiliated rainbow (ADR-0039) and the labyrinth's deliberate lack of any
    // livery of its own (#783) — so beside seven coloured marks they read as
    // absent, which is the report. Unthemed means NO ink, and the mark falls
    // through to its own default like every other mount in the app already does.
    //
    // `isKnownFaction` and not a two-name check: it tests the MAPPED value, so
    // an unregistered slug — a deep-linked `?factions=whatever` — is unthemed by
    // the same rule rather than inked grey by omission.
    renderOrnament: (slug, place) => (
      <FactionSigil
        slug={slug}
        size={SIGIL_SIZE[place]}
        color={isKnownFaction(slug) ? factionCssVar(slug) : undefined}
      />
    ),
  }
}
