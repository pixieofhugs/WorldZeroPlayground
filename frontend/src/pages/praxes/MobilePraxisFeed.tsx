import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../api/praxis'
import { factionCssVar, factionName } from '../../utils/factions'
import { relativeTime } from '../../utils/dates'
import type { PraxesFeedState } from './usePraxes'

/**
 * Mobile praxis feed (#499) — a single-column vertical proof-card stream. Each
 * card carries the author, a faction tint (via factionCssVar), the finding
 * title, and the earned score. Solo + collab/duel are merged into one stream,
 * matching the Field Kit §05 praxis feed; every card taps into the detail page.
 *
 * Presentation-only: data arrives via {@link PraxesFeedState}. The list schema
 * (PraxisCardOut) carries no media thumbnail and no vote average, so the card
 * leads with the faction-tinted title + score rather than the mock's photo /
 * star-average (the average was retired in #375; a thumbnail would need a new
 * backend field, out of scope here). Single-column, no fixed-px layout grid
 * (SPEC-faction-ui-profile §1a).
 */
export default function MobilePraxisFeed({ state }: { state: PraxesFeedState }) {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const { soloItems, collabItems, loading, error, isEmpty } = state

  const items = [...soloItems, ...collabItems]

  return (
    <div data-feed="mobile" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header>
        <div className="eyebrow" style={{ fontSize: 8, color: 'var(--color-text-secondary)' }}>
          {tc('nav.praxis')}
        </div>
        <h1
          className="font-display italic"
          style={{ fontSize: 30, lineHeight: 1, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {t('listPage.title')}
        </h1>
      </header>

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {t('detail.errors.load')}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : isEmpty ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((praxis) => (
            <MobileProofCard key={`${praxis.type}-${praxis.id}`} praxis={praxis} />
          ))}
        </div>
      )}
    </div>
  )
}

/** One faction-tinted proof card in the feed. */
function MobileProofCard({ praxis }: { praxis: PraxisCardOut }) {
  const { t } = useTranslation('praxis')
  const tint = factionCssVar(praxis.task_faction_slug, 'card-accent')
  const facName = praxis.task_faction_slug ? factionName(praxis.task_faction_slug) : t('mobileFeed.unaffiliated')
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <Link
      to={`/praxes/${praxis.id}`}
      className="font-body"
      style={{
        display: 'block',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${tint}`,
        borderRadius: 'var(--radius-xl)',
        padding: 16,
        textDecoration: 'none',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Author + faction tint + time */}
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <span
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 34,
            height: 34,
            background: tint,
            color: 'var(--color-text-on-accent)',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 15,
          }}
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {praxis.created_by_display_name}
          </div>
          <div
            className="truncate eyebrow"
            style={{ marginTop: 2, fontSize: 9, color: 'var(--color-text-tertiary)' }}
          >
            {t('mobileFeed.byline', { faction: facName, time: relativeTime(praxis.created_at) })}
          </div>
        </div>
      </div>

      {/* Finding title */}
      <div
        className="font-display italic"
        style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--color-text-primary)' }}
      >
        {praxis.title || t('mobileFeed.untitled')}
      </div>

      {/* Score tally — earned points + vote count (#375: no average) */}
      <div
        className="eyebrow"
        style={{ marginTop: 10, fontSize: 10, color: tint }}
      >
        {t('mobileFeed.tally', { points: praxis.score, count: praxis.voter_count })}
      </div>
    </Link>
  )
}
