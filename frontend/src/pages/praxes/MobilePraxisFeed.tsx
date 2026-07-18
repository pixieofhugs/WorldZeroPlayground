import { useTranslation } from 'react-i18next'
import MobilePraxisCard from '../../components/praxisCard/mobile/MobilePraxisCard'
import FactionSigilRow from '../../components/ui/FactionSigilRow'
import { ChipRow, Chip } from '../../components/ui/ChipRow'
import type { PraxesFeedState, PraxisTypeFilter } from './usePraxes'

/**
 * Mobile praxis feed (#499/#565/#573/#644) — a single-column vertical proof
 * stream with phone-native filter chips at the top. Each card picks its own
 * bespoke faction skin from its item's data (the per-item `MobilePraxisCard`
 * dispatch); the page chrome itself stays faction-agnostic. Solo + collab/duel
 * are one uniform, date-ordered stream.
 *
 * Presentation-only: data + filter state arrive via {@link PraxesFeedState}.
 * Single-column, no fixed-px layout grid (SPEC-faction-ui-profile §1a).
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
    hasMore,
    loadMore,
  } = state

  const typeLabel = (option: PraxisTypeFilter) =>
    option === 'all' ? t('listPage.filter.all') : tc(`praxisType.${option}`)

  return (
    <div data-feed="mobile" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <p className="eyebrow" style={{ marginTop: 4 }}>
          {t('listPage.count', { count: items.length })}
        </p>
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
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((p) => (
            <MobilePraxisCard key={`praxis-${p.id}`} praxis={p} />
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
