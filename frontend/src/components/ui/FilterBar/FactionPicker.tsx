import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FactionOut } from '../../../api/factions'
import FactionSigil from '../../sigil/FactionSigil'
import { factionCssVar, factionName } from '../../../utils/factions'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { filterRoster, selectedFirst, toggleFaction } from './filterState'

const SIGIL_SIZE = 18
const TRIGGER_SIGIL_SIZE = 13
const CHECK_GLYPH = '✓'

/**
 * Faction multi-select — a popover at tablet and up, a bottom sheet on the
 * phone. ONE component with one conditional, not two components: #1313 is the
 * precedent, and the two layouts differ only in where the panel is anchored.
 * Every row, the roster and the toggle logic are shared.
 *
 * The roster is `GET /factions` plus the explicit `na` sentinel (see
 * `filterRoster`) — never the design's hardcoded nine. There are no per-faction
 * counts: cut by owner ruling (#1361 ruling 3), because a facet aggregate the
 * windowed page cannot derive needs a new endpoint and a round trip per filter
 * change, and every row already names its faction.
 *
 * Dismissal is the trigger, the Done button, and Escape. Deliberately no
 * document-level click-outside listener: three routes is enough, and an effect
 * here would be untestable in a harness with no DOM.
 */
export default function FactionPicker({
  factions,
  selected,
  onChange,
}: {
  factions: FactionOut[]
  selected: string[]
  onChange: (slugs: string[]) => void
}) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const isSheet = useFormFactor() === 'mobile'
  const roster = selectedFirst(filterRoster(factions), selected)

  const panel = (
    <div
      className={isSheet ? 'filter-factions__sheet' : 'filter-factions__popover'}
      role="dialog"
      aria-label={t('filters.bar.factions')}
    >
      <div className="filter-factions__panel-head">
        <span className="eyebrow">{t('filters.bar.factions')}</span>
        <button
          type="button"
          className="filter-bar__link"
          onClick={() => onChange([])}
        >
          {t('filters.bar.clear')}
        </button>
      </div>
      <div className="filter-factions__rows">
        {roster.map((slug) => {
          const on = selected.includes(slug)
          return (
            <button
              key={slug}
              type="button"
              className="filter-factions__row"
              role="checkbox"
              aria-checked={on}
              data-on={on ? 'true' : undefined}
              onClick={() => onChange(toggleFaction(selected, slug))}
            >
              <span className="filter-factions__box" aria-hidden="true">
                {on ? CHECK_GLYPH : ''}
              </span>
              <span className="filter-factions__sigil" aria-hidden="true">
                <FactionSigil
                  slug={slug}
                  size={SIGIL_SIZE}
                  color={factionCssVar(slug)}
                />
              </span>
              <span className="filter-factions__name">{factionName(slug)}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="filter-factions__done"
        onClick={() => setOpen(false)}
      >
        {t('filters.bar.done')}
      </button>
    </div>
  )

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
        <span>{t('filters.bar.factions')}</span>
        <span className="filter-factions__stack" aria-hidden="true">
          {selected.slice(0, 3).map((slug) => (
            <span key={slug} className="filter-factions__stack-sigil">
              <FactionSigil
                slug={slug}
                size={TRIGGER_SIGIL_SIZE}
                color={factionCssVar(slug)}
              />
            </span>
          ))}
        </span>
        {selected.length > 0 && (
          <span className="filter-bar__badge">{selected.length}</span>
        )}
      </button>
      {open && isSheet && (
        <button
          type="button"
          className="filter-factions__scrim"
          aria-label={t('filters.bar.done')}
          onClick={() => setOpen(false)}
        />
      )}
      {open && panel}
    </div>
  )
}
