import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormFactor } from '../../../hooks/useFormFactor'
import OptionPicker from './OptionPicker'
import SegmentedRail from './SegmentedRail'
import { deriveChips, type FilterFacet, type FilterRail } from './filterState'

export * from './filterState'
export * from './factionFacet'
export { default as SegmentedRail } from './SegmentedRail'
export { default as OptionPicker } from './OptionPicker'

const REMOVE_GLYPH = '×'
const CARET_GLYPH = '▾'

interface FilterBarProps {
  rails: FilterRail[]
  /** Multi-select axes in mount order (faction is one, see `factionFacet`). */
  facets: FilterFacet[]
  /** The page owns state and URL. */
  onClearAll: () => void
  summary?: string
  /** Read in flight (#2431): `aria-busy`, and "Updating" replaces the stale summary. */
  busy?: boolean
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    label: string
  }
}

/**
 * One responsive, presentation-only filter surface (#1365, epic #1361). Chrome,
 * not faction-skinned, so no mobile twin.
 *
 * Deliberately absent, don't "restore": the type rail (#1361 ruling 2),
 * per-faction counts (ruling 3), the Snide-lime accent (ruling 1), and the page
 * title (pages render `PageTitle`).
 *
 * Deliberately present (#1854): a surface card with a `--faction-default-rainbow`
 * top edge (ADR-0039). Never `overflow: hidden` to clip it: that traps the
 * popover (#1506, `filterBarOverflow.test.ts`).
 *
 * Search and applied chips sit outside the collapse.
 */
export default function FilterBar({
  rails,
  facets,
  onClearAll,
  summary,
  busy,
  search,
}: FilterBarProps) {
  const { t } = useTranslation('common')
  const formFactor = useFormFactor()
  // ponytail: initial open state read once at mount; rotation doesn't re-collapse.
  const [open, setOpen] = useState(formFactor === 'desktop')
  const chips = deriveChips({ rails, facets })
  // ponytail: `busy` flips instantly, so a fast backend may flicker; add a
  // ~120ms grace in `useResource` if measured (#2431).
  const summaryText = busy ? t('filters.bar.updating') : summary

  return (
    <section
      className="filter-bar"
      aria-label={t('filters.bar.region')}
      aria-busy={busy ? 'true' : undefined}
    >
      <div className="filter-bar__spectrum" aria-hidden="true" />
      <div className="filter-bar__body">
        <div className="filter-bar__head">
          {summaryText && (
            <span className="filter-bar__summary">{summaryText}</span>
          )}
          <button
            type="button"
            className="filter-bar__toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span>
              {open ? t('filters.bar.hide') : t('filters.bar.show')}
            </span>
            {chips.length > 0 && (
              <span className="filter-bar__badge">{chips.length}</span>
            )}
            <span
              className="filter-bar__caret"
              aria-hidden="true"
              data-open={open ? 'true' : undefined}
            >
              {CARET_GLYPH}
            </span>
          </button>
        </div>

        {search && (
          <input
            type="search"
            className="filter-bar__search"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder}
            aria-label={search.label}
          />
        )}

        {open && (
          <div className="filter-bar__controls">
            {/* Not spread: FilterRail's own `key` would land in props. */}
            {rails.map((rail) => (
              <SegmentedRail key={rail.key} rail={rail} />
            ))}
            {facets.map((facet) => (
              <OptionPicker key={facet.key} facet={facet} />
            ))}
          </div>
        )}

        {chips.length > 0 && (
          <div className="filter-bar__applied">
            <span className="label-heading">{t('filters.bar.filteringBy')}</span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="filter-bar__chip"
                aria-label={t('filters.bar.removeFilter', { label: chip.label })}
                onClick={chip.remove}
              >
                {chip.ornament && (
                  <span className="filter-bar__chip-sigil" aria-hidden="true">
                    {chip.ornament}
                  </span>
                )}
                <span>{chip.label}</span>
                <span className="filter-bar__chip-x" aria-hidden="true">
                  {REMOVE_GLYPH}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="filter-bar__link"
              onClick={onClearAll}
            >
              {t('filters.bar.clearAll')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Shared empty state (#1361 ruling 9); `selectEmptyState` picks the kind, the
 * page supplies words. Omit `onClearAll` on `register` (STYLE §1.4).
 */
export function FilterBarEmpty({
  title,
  hint,
  onClearAll,
  actionLabel,
}: {
  title: string
  hint?: string
  onClearAll?: () => void
  /** For a filter on by default (#1972), say what the tap does instead. */
  actionLabel?: string
}) {
  const { t } = useTranslation('common')
  return (
    <div className="filter-empty">
      <div className="filter-empty__copy">
        <span className="filter-empty__title">{title}</span>
        {hint && <span className="filter-empty__hint">{hint}</span>}
      </div>
      {onClearAll && (
        <button
          type="button"
          className="filter-empty__action"
          onClick={onClearAll}
        >
          {actionLabel ?? t('filters.bar.clearAllFilters')}
        </button>
      )}
    </div>
  )
}
