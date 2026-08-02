import { useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { drawAtRoot } from '../drawAtRoot'
import { toggleOption, type FilterFacet } from './filterState'

/** The trigger stacks at most three ornaments; the badge carries the rest. */
const TRIGGER_STACK_MAX = 3
const CHECK_GLYPH = '✓'

/**
 * Option multi-select — a popover at tablet and up, a bottom sheet on the
 * phone. ONE component with one conditional, not two components: #1313 is the
 * precedent, and the two layouts differ only in where the panel is anchored.
 * Every row, the option list and the toggle logic are shared.
 *
 * Generic since #1446: this was `FactionPicker`, and the faction axis is now
 * one `FilterFacet` (see `factionFacet.tsx`) rather than the widget's subject.
 * The leading ornament is the facet's optional renderer and the trailing count
 * is an optional per-row slot, absent unless the facet supplies one — faction
 * counts are cut (#1361 ruling 3), type counts on Updates ship (#1419
 * decision 4), and both are correct.
 *
 * Rows arrive in the facet's order. Selected-first is the faction facet's
 * choice, made where the roster is built; the widget re-orders nothing.
 *
 * ponytail: the CSS block is still named `filter-factions__*`. Those class
 * names are the only thing holding this widget's appearance fixed across the
 * rename, and index.css belongs to the style seam — renaming the block to
 * `filter-options__*` (and dressing `__count`, which has no rule yet) is a pure
 * stylesheet change for whoever owns it next.
 *
 * Dismissal is the trigger, the Done button, and Escape. Deliberately no
 * document-level click-outside listener: three routes is enough, and an effect
 * here would be untestable in a harness with no DOM. Escape still works with
 * the sheet portalled out (#1591): a portal moves the DOM node, not the React
 * tree, so the keydown still bubbles to the wrapper's handler below.
 *
 * **An option-less facet draws nothing at all** (#1567). A facet may legitimately
 * narrow itself to nothing — Updates' type facet hides zero-count rows, so on a
 * quiet board every row drops off — and the trigger was still rendering, opening
 * a panel with no rows in it and no explanation. That is a control that cannot
 * be used, and this repo hides those rather than showing them disabled
 * (CLAUDE.md; STYLE §1.4). It lives here rather than in `FilterBar`'s facet loop
 * because this component is the one that knows whether it has anything to offer;
 * the bar maps facets to pickers and should not reason about their contents.
 *
 * The control therefore comes and goes with activity. That cost is accepted: on
 * a board with traffic it is always present, and it vanishes exactly when it had
 * nothing to offer. A SELECTED value always keeps its row (see
 * `typeFacetOptions` and `factionFacet`), so a deep link like `?types=nudge`
 * leaves a non-empty list and the trigger still renders — the chip it raises
 * stays removable both from the panel and from the applied-chip row.
 */
export default function OptionPicker({ facet }: { facet: FilterFacet }) {
  const [open, setOpen] = useState(false)
  const isSheet = useFormFactor() === 'mobile'
  const { label, options, selected, renderOrnament } = facet

  // After the hooks, never before: an early return above them is a conditional
  // hook call, and `options` is a prop that changes as counts arrive.
  if (options.length === 0) return null

  return (
    <div
      className="filter-factions"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) setOpen(false)
      }}
    >
      <button
        type="button"
        className="filter-factions__trigger"
        aria-expanded={open}
        data-on={open ? 'true' : undefined}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        {renderOrnament && (
          <span className="filter-factions__stack" aria-hidden="true">
            {selected.slice(0, TRIGGER_STACK_MAX).map((value) => (
              <span key={value} className="filter-factions__stack-sigil">
                {renderOrnament(value, 'trigger')}
              </span>
            ))}
          </span>
        )}
        {selected.length > 0 && (
          <span className="filter-bar__badge">{selected.length}</span>
        )}
      </button>
      {open && (
        <OptionOverlay facet={facet} isSheet={isSheet} onDone={() => setOpen(false)} />
      )}
    </div>
  )
}

/**
 * The open panel: a popover anchored to the trigger at tablet and up, a
 * scrimmed bottom sheet on the phone.
 *
 * Exported so the sheet path is reachable in a harness with no DOM — `open` is
 * local state that only a click sets, so a test rendering `OptionPicker` can
 * never see this markup at all. `CharacterSwitcherRows` is the precedent.
 *
 * **The sheet half draws at the document root** (#1591). Rendered in place it
 * was trapped in the content region's stacking context, which capped it below
 * the mobile tab bar: the bar painted over the sheet and stayed tappable behind
 * the scrim. `drawAtRoot` is where the whole argument lives. The popover is
 * deliberately NOT portalled — it is `position: absolute` against the trigger,
 * so moving it to `document.body` would tear it off its anchor, and there is no
 * tab bar on the desktop it renders on.
 */
export function OptionOverlay({
  facet,
  isSheet,
  onDone,
}: {
  facet: FilterFacet
  isSheet: boolean
  onDone: () => void
}): ReactElement {
  const { t } = useTranslation('common')
  const { label, options, selected, onChange, renderOrnament } = facet

  const panel = (
    <div
      className={isSheet ? 'filter-factions__sheet' : 'filter-factions__popover'}
      role="dialog"
      aria-label={label}
    >
      <div className="filter-factions__panel-head">
        <span className="eyebrow">{label}</span>
        <button
          type="button"
          className="filter-bar__link"
          onClick={() => onChange([])}
        >
          {t('filters.bar.clear')}
        </button>
      </div>
      <div className="filter-factions__rows">
        {options.map((option) => {
          const on = selected.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              className="filter-factions__row"
              role="checkbox"
              aria-checked={on}
              data-on={on ? 'true' : undefined}
              onClick={() => onChange(toggleOption(selected, option.value))}
            >
              <span className="filter-factions__box" aria-hidden="true">
                {on ? CHECK_GLYPH : ''}
              </span>
              {renderOrnament && (
                <span className="filter-factions__sigil" aria-hidden="true">
                  {renderOrnament(option.value, 'row')}
                </span>
              )}
              <span className="filter-factions__name">{option.label}</span>
              {option.count !== undefined && (
                <span className="filter-factions__count">{option.count}</span>
              )}
            </button>
          )
        })}
      </div>
      <button type="button" className="filter-factions__done" onClick={onDone}>
        {t('filters.bar.done')}
      </button>
    </div>
  )

  if (!isSheet) return panel

  return drawAtRoot(
    <>
      <button
        type="button"
        className="filter-factions__scrim"
        aria-label={t('filters.bar.done')}
        onClick={onDone}
      />
      {panel}
    </>,
  )
}
