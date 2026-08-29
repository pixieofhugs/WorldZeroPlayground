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
  /** 2–6 segments each, one value per rail, one `ORDER BY` per rail. */
  rails: FilterRail[]
  /**
   * Multi-select axes, in mount order. Faction is one of these rather than a
   * prop of its own since #1446 — see `factionFacet`.
   */
  facets: FilterFacet[]
  /** Reset every axis to its default. The page owns the state and the URL. */
  onClearAll: () => void
  /** "Showing N tasks" — the page owns the count, the bar only states it. */
  summary?: string
  /**
   * A read is in flight and the rows on screen are the PREVIOUS filter's
   * (#2431). The bar marks itself `aria-busy` and its summary slot says so —
   * `summary` still states a count, but a stale one, so the two swap rather
   * than stack.
   */
  busy?: boolean
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    label: string
  }
}

/**
 * FilterBar — one responsive filter surface for tasks and praxes (#1365,
 * epic #1361). Presentation-only: it takes values and setters and owns no
 * fetch, no URL and no list.
 *
 * **No mobile twin.** The `MOBILE_ARCHETYPE_BY_SLUG` rule in CLAUDE.md governs
 * faction-dressed surfaces; the bar is chrome, is not skinned per faction, and
 * stays outside that seam. It runs with the grain of kit-hygiene epic #1312.
 *
 * Three things the design draws that are deliberately absent, so the next
 * editor does not "restore" them:
 *   - the **type rail** (Tasks / Metatasks) — deleted on purpose, #1361 ruling 2
 *   - **per-faction counts** — cut, #1361 ruling 3
 *   - the **Snide-lime accent** — a faction hue used as global chrome. The bar
 *     is authored in tokens and neutral; the one spectrum it keeps is the rail
 *     ring, which is `na`'s and the site default's shared identity (ruling 1).
 *
 * And one thing the design draws that is deliberately PRESENT, recorded beside
 * those three so it is not read as the rejected pattern (#1854): the bar is a
 * **surface card with a 3px rainbow top edge**. Both live on `.filter-bar`
 * itself, so every mounting surface inherits them — Tasks, Praxes, Updates and
 * Players — instead of four page-local wrappers. The strip is
 * `--faction-default-rainbow`, the unaffiliated/everyone identity (ADR-0039),
 * not a faction hue promoted to global chrome. The Snide-lime rejection stands.
 *
 * The card must NOT take `overflow: hidden` to clip that strip, however much
 * the shape asks for it: it traps `OptionPicker`'s absolutely-positioned
 * popover (#1506). The strip rounds its own top corners instead, and
 * `filterBarOverflow.test.ts` holds both halves.
 *
 * The page TITLE is not drawn here either, though the design puts it in the
 * bar: every mounting page already renders `PageTitle`, and two headings is a
 * regression, not fidelity.
 *
 * Search and the applied-chip row sit OUTSIDE the collapse; the rails and the
 * facet pickers fold away.
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
  // ponytail: the initial value is read once, at mount. Open on desktop,
  // collapsed on the phone — a rotation mid-session does not re-collapse a bar
  // the player just opened, which is the behaviour we want anyway.
  const [open, setOpen] = useState(formFactor === 'desktop')
  const chips = deriveChips({ rails, facets })
  // ponytail: `busy` goes true the instant the read starts, so a warm backend
  // can swap these words in and out inside ~100ms and read as a flicker rather
  // than as feedback. The upgrade path is a ~120ms grace before it flips, held
  // in `useResource` so all four surfaces inherit it — not built here, because
  // the reported symptom is a wait long enough to read as broken and a
  // threshold is a tuning knob with no measurement behind it yet (#2431).
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
            {/* `rail` is passed whole rather than spread: FilterRail carries a
                `key` field of its own, and spreading it hands React a `key`
                inside props, which it warns about and ignores. */}
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
 * The empty state the bar's three kinds share (#1361 ruling 9). Which of the
 * three a page shows is `selectEmptyState`'s call; the words are the page's,
 * because "register empty" reads differently for tasks and for praxes.
 *
 * The design's "Clear all filters" button is kept — it is a real improvement
 * over an empty state that names a problem and offers no way out. It is hidden
 * on the `register` kind, where there is nothing to clear (STYLE §1.4: if you
 * can't use it, you can't see it).
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
  /**
   * Override for the button's words. "Clear all filters" is right when the
   * player applied the filters; a page whose filter was on before they touched
   * anything (the task board's eligibility default, #1972) has to say what the
   * tap DOES instead — the button is the same one either way.
   */
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
