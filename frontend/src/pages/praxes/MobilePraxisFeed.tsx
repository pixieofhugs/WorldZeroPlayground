import { useTranslation } from 'react-i18next'
import PraxisCard from '../../components/PraxisCard'
import FactionSigilRow from '../../components/ui/FactionSigilRow'
import { ChipRow, Chip } from '../../components/ui/ChipRow'
import type { PraxesFeedState, PraxisTypeFilter } from './usePraxes'

/**
 * Mobile praxis feed (#499/#565/#573/#644) — a phone-native proof stream with
 * filter chips at the top. What survives here is the PAGE chrome: the stacked
 * header, the full-width search, the sigil row and the chip rows. The page
 * itself stays faction-agnostic; each card picks its own bespoke skin from its
 * item's data. Solo + collab/duel are one uniform, date-ordered stream.
 *
 * The results list renders the SHARED `<PraxisCard>` (ADR-0067) — the same
 * component the desktop feed renders. There is no mobile twin: the
 * `mobilePraxisCard` surface and its ten cards are deleted, so a faction's
 * praxis card is one responsive file under `components/praxisCard/desktop/`.
 *
 * The list is a WRAPPING FLEX ROW, not a column, because that is what the
 * card's `frameBase` geometry expects: `flex: 1 1 394px` with `minWidth: 280`
 * resolves to exactly one full-width card per row on a phone, and to a grid on
 * anything wider. A column container would apply that basis to the card's
 * HEIGHT instead, which is the one arrangement the shared frame cannot take.
 *
 * Presentation-only: data + filter state arrive via {@link PraxesFeedState}.
 */
const TYPE_OPTIONS: PraxisTypeFilter[] = ['all', 'solo', 'collab', 'duel']

export default function MobilePraxisFeed({ state }: { state: PraxesFeedState }) {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const {
    items,
    loading,
    error,
    isEmpty,
    hasActiveFilters,
    factions,
    type,
    setType,
    faction,
    setFaction,
    voted,
    setVoted,
    sort,
    setSort,
    query,
    setQuery,
    taskId,
    clearTaskFilter,
    hasMore,
    loadMore,
  } = state

  const typeLabel = (option: PraxisTypeFilter) =>
    option === 'all' ? t('listPage.filter.all') : tc(`praxisType.${option}`)

  return (
    <div data-feed="mobile" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <header>
        <div className="eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
          {tc('nav.praxis')}
        </div>
        <h1
          className="font-display italic"
          style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {t('listPage.title')}
        </h1>
        <p className="eyebrow" style={{ marginTop: 'var(--space-xs)' }}>
          {t('listPage.count', { count: items.length })}
        </p>
        {/* A `?task_id=` feed is a subset (#1050) — say so, and offer the way
            out, so a narrowed stream can't read as the whole register. */}
        {taskId !== null && (
          <p className="font-body content-text text-muted" style={{ marginTop: 'var(--space-xs)' }}>
            {t('listPage.taskFilter.notice')}{' '}
            <button type="button" onClick={clearTaskFilter} className="underline">
              {t('listPage.taskFilter.clear')}
            </button>
          </p>
        )}
      </header>

      {/* Search */}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('listPage.filter.searchPlaceholder')}
        aria-label={t('listPage.filter.searchLabel')}
        className="font-body w-full"
        style={{
          fontSize: 'var(--text-md)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-strong)',
          color: 'var(--color-text-primary)',
          borderRadius: 6,
        }}
      />

      {/* Faction sigils */}
      <FactionSigilRow factions={factions} value={faction} onChange={setFaction} />

      {/* Type chips */}
      <ChipRow label={t('listPage.filter.typeLabel')}>
        {TYPE_OPTIONS.map((option) => (
          <Chip key={option} on={type === option} onClick={() => setType(option)}>
            {typeLabel(option)}
          </Chip>
        ))}
      </ChipRow>

      {/* Voted chips — "needs my vote" is account-scoped (§6). */}
      <ChipRow label={t('listPage.filter.showLabel')}>
        <Chip on={voted === ''} onClick={() => setVoted('')}>
          {t('listPage.filter.all')}
        </Chip>
        <Chip on={voted === 'no'} onClick={() => setVoted(voted === 'no' ? '' : 'no')}>
          {t('listPage.filter.needsMyVote')}
        </Chip>
        <Chip on={voted === 'yes'} onClick={() => setVoted(voted === 'yes' ? '' : 'yes')}>
          {t('listPage.filter.voted')}
        </Chip>
      </ChipRow>

      {/* Sort chips */}
      <ChipRow label={tc('filters.sort')}>
        <Chip on={sort === 'newest'} onClick={() => setSort('newest')}>
          {t('listPage.filter.sortNewest')}
        </Chip>
        <Chip on={sort === 'oldest'} onClick={() => setSort('oldest')}>
          {t('listPage.filter.sortOldest')}
        </Chip>
      </ChipRow>

      {loading && items.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {t('detail.errors.load')}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : isEmpty ? (
        <p className="font-body text-muted">
          {hasActiveFilters ? t('listPage.emptyFiltered') : t('listPage.empty')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-4 items-start">
          {items.map((p) => (
            <PraxisCard key={`praxis-${p.id}`} praxis={p} />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              className="font-body uppercase w-full"
              style={{
                fontSize: 'var(--text-md)',
                letterSpacing: '0.1em',
                padding: 'var(--space-md)',
                border: '1px solid var(--color-border-strong)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {t('listPage.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
