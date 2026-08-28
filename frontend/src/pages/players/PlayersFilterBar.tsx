import { useTranslation } from 'react-i18next'
import FilterBar, { factionFacet } from '../../components/ui/FilterBar'
import { useFactions } from '../../hooks/useFactions'
import {
  PLAYERS_FILTERS_DEFAULT,
  PLAYERS_RAIL_DEFAULT,
  type PlayersFilters,
  type PlayersRail,
} from './playersData'

interface PlayersFilterBarProps {
  filters: PlayersFilters
  onChange: (next: PlayersFilters) => void
  /**
   * Whether the viewer has a character of their own. The Friends / Foes rail is
   * a filter over the viewer's OWN outgoing relationships, so signed out it can
   * only ever return nothing — and a control that cannot work is hidden, not
   * disabled (WORLD_ZERO_STYLE §1.4).
   */
  showRelationshipRail: boolean
}

/**
 * The Players roster's filter surface — the shared `FilterBar` (#1365/#1446)
 * wired to the roster's three axes, following the per-surface wrapper pattern
 * of `TaskFilterBar` / `PraxisFilterBar` / `UpdatesFilterBar`.
 *
 * Nothing about the bar itself is restated here: its card, its 3px rainbow top
 * edge and its responsive fold ship with the component (#1365) and are chrome,
 * not this page's. In particular it is NOT wrapped in a card of this page's own
 * and never given `overflow: hidden` — that traps `OptionPicker`'s desktop
 * popover, which is why #1506 removed it.
 *
 * ONE bar for both form factors. `FilterBar` is chrome, it folds itself down on
 * the phone, and it sits outside the desktop/mobile seam the rest of this page
 * is split along.
 */
export default function PlayersFilterBar({
  filters,
  onChange,
  showRelationshipRail,
}: PlayersFilterBarProps) {
  const { t } = useTranslation('common')
  const factions = useFactions() ?? []

  const rails = showRelationshipRail
    ? [
        {
          key: 'relationship',
          label: t('leaderboard.roster.railLabel'),
          value: filters.rail,
          defaultValue: PLAYERS_RAIL_DEFAULT,
          segments: [
            { value: 'everyone', label: t('leaderboard.roster.railEveryone') },
            { value: 'friends', label: t('leaderboard.roster.railFriends') },
            { value: 'foes', label: t('leaderboard.roster.railFoes') },
          ],
          onChange: (next: string) => onChange({ ...filters, rail: next as PlayersRail }),
        },
      ]
    : []

  return (
    <FilterBar
      rails={rails}
      facets={[
        factionFacet(factions, filters.factions, (slugs) =>
          onChange({ ...filters, factions: slugs }),
        ),
      ]}
      onClearAll={() => onChange(PLAYERS_FILTERS_DEFAULT)}
      search={{
        value: filters.query,
        onChange: (query) => onChange({ ...filters, query }),
        placeholder: t('leaderboard.roster.searchPlaceholder'),
        label: t('leaderboard.roster.searchLabel'),
      }}
    />
  )
}
