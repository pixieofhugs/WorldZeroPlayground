import { useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { drawAtRoot } from '../drawAtRoot'
import { toggleOption, type FilterFacet } from './filterState'

/** The trigger stacks at most three ornaments; the badge carries the rest. */
const TRIGGER_STACK_MAX = 3
const CHECK_GLYPH = '✓'

/**
 * Option multi-select for one `FilterFacet`: a popover at tablet and up, a
 * bottom sheet on the phone (one component, #1313). Rows arrive in the facet's
 * order; ornament and count are optional facet slots.
 *
 * ponytail: CSS block still named `filter-factions__*`; renaming to
 * `filter-options__*` is a pure stylesheet change.
 *
 * Dismissal: trigger, Done, Escape; no click-outside listener. Escape still
 * bubbles from the portalled sheet (React tree, #1591).
 *
 * An option-less facet draws nothing (#1567; hide unusable controls). A
 * selected value always keeps its row, so a deep link still renders a trigger.
 */
export default function OptionPicker({ facet }: { facet: FilterFacet }) {
  const [open, setOpen] = useState(false)
  const isSheet = useFormFactor() === 'mobile'
  const { label, options, selected, renderOrnament } = facet

  // After the hooks: an earlier return would be a conditional hook call.
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
        <span className="filter-factions__label">{label}</span>
        {renderOrnament && selected.length > 0 && (
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
 * The open panel. Exported so DOM-less tests can render it (`open` is
 * click-only state).
 *
 * The sheet draws at the document root (#1591, see `drawAtRoot`); the popover
 * is not portalled because it is `position: absolute` against its trigger.
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
        <span className="label-heading">{label}</span>
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
