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
  /** The viewer has a character; the Friends/Foes rail filters their own
   *  relationships, so it is hidden when signed out (WORLD_ZERO_STYLE §1.4). */
  showRelationshipRail: boolean
  /** Only for a viewer whose airport code the server recognises (#3247). */
  showNearby?: boolean
}

/**
 * The roster's `FilterBar` wrapper (#1365/#1446), one for both form factors.
 * Never wrap it in a card with `overflow: hidden`: that traps `OptionPicker`'s
 * popover (#1506).
 */
export default function PlayersFilterBar({
  filters,
  onChange,
  showRelationshipRail,
  showNearby = false,
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
            ...(showNearby
              ? [{ value: 'nearby', label: t('leaderboard.roster.railNearby') }]
              : []),
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
