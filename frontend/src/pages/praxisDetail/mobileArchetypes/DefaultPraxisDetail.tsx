/**
 * Default MOBILE praxis-detail skin (#499) — single-column, thumb-first. Renders
 * the same invariant CONTENT slots as the desktop archetypes (finding title,
 * account body, re-task link, author byline, media, vote caster) plus the shared
 * behavior slots (admin bar, banners, owner actions, flag, voter breakdown), so
 * the slot guard holds. Every faction falls through here until it registers a
 * bespoke mobile skin. Consumes the same {@link PraxisDetailState} verbatim;
 * comments are mounted once by the PraxisDetail dispatcher below every skin.
 *
 * Single-column flex layout, no fixed-px grid (SPEC-faction-ui-profile §1a).
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import type { PraxisDetailState } from '../usePraxisDetail'
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisVoterBreakdown,
  MemberByline,
} from '../shared'
import { MobileStarVote } from './shared'

export default function DefaultPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state
  if (!praxis) return null

  const accent = factionCssVar(praxis.task_faction_slug, 'card-accent')
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="default" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Breadcrumb */}
      <nav
        className="font-body"
        style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-tertiary)' }}
      >
        <Link to="/tasks" style={{ color: accent, textDecoration: 'none' }}>
          {t('detail.default.breadcrumbTasks')}
        </Link>
        {' › '}
        <span style={{ color: 'var(--color-text-primary)' }}>{t('mobileDetail.back')}</span>
      </nav>

      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline block */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: accent,
              color: 'var(--color-text-on-accent)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 17,
            }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkClassName="font-display italic"
            linkStyle={{ fontSize: 15, color: 'var(--color-text-primary)', textDecoration: 'none' }}
          />
          <span className="eyebrow" style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>
            {formatTimestamp(praxis.created_at)}
          </span>
        </div>
      </div>

      {/* Finding title */}
      <h1
        className="font-display italic font-medium"
        style={{ fontSize: 26, lineHeight: 1.2, color: 'var(--color-text-primary)', margin: 0 }}
      >
        {praxis.title}
      </h1>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* Task context link */}
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="sidebar-card font-body flex items-center gap-2"
        style={{
          borderLeft: `4px solid ${accent}`,
          borderRadius: '0 8px 8px 0',
          padding: '10px 14px',
          textDecoration: 'none',
        }}
      >
        <span className="eyebrow" style={{ fontSize: 8 }}>{t('detail.default.completingTask')}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {praxis.task_title}
        </span>
        <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
          {t('detail.default.points', { points: praxis.task_point_value })}
        </span>
      </Link>

      {/* Full media */}
      {praxis.media_items.length > 0 && <MediaGallery media={praxis.media_items} />}

      {/* Account body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="font-display markdown-preview"
          style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-primary)' }}
        />
      )}

      {/* Touch star-vote */}
      <div className="sidebar-card" style={{ padding: '16px 14px' }}>
        <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 12, color: 'var(--color-text-secondary)' }}>
          {t('mobileDetail.ratePrompt')}
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          points={votes?.total_score}
          totalVotes={votes?.total_votes}
          accent={accent}
        />
      </div>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
