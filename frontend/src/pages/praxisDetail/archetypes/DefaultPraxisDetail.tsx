import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import { formatTimestamp } from '../../../utils/dates'
import VoteUI from '../../../components/vote/VoteUI'
import type { PraxisDetailState } from '../usePraxisDetail'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown, MemberByline } from '../shared'

/** Style Guide §12.3 */
const RAINBOW_COLORS = ['var(--underline-1)', 'var(--underline-2)', 'var(--underline-3)', 'var(--underline-4)', 'var(--underline-5)', 'var(--underline-6)', 'var(--underline-1)', 'var(--underline-2)']

/**
 * Default praxis-detail archetype — the original universal layout, now consuming
 * the shared {@link PraxisDetailState}. Any faction without a bespoke archetype
 * falls through to this, so it must stay visually identical to the pre-refactor
 * page.
 */
export default function DefaultPraxisDetail({
  state,
}: {
  state: PraxisDetailState
}) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  return (
    <div className="py-8 max-w-2xl">
      {/* ── Breadcrumb (§12.1) ── */}
      <nav className="font-body mb-4" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)' }}>
        <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>{t('detail.default.breadcrumbTasks')}</Link>
        {' › '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>
        {' › '}
        <span style={{ color: 'var(--color-text-primary)' }}>{t('detail.default.breadcrumbPraxis')}</span>
      </nav>

      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* ── Byline Block (§12.2) ── */}
      <div
        className="sidebar-card flex items-center gap-3 mb-4"
        style={{ padding: '10px 14px' }}
      >
        <Link to={`/characters/${praxis.created_by_id}`}>
          <div
            className="rounded-full shrink-0"
            style={{
              width: 42,
              height: 42,
              background: 'var(--faction-default-rainbow)',
            }}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <MemberByline
            praxis={praxis}
            linkClassName="font-display italic"
            linkStyle={{ fontSize: 14, color: 'var(--faction-default-card-accent)', textDecoration: 'none' }}
          />
          <span className="eyebrow">{formatTimestamp(praxis.created_at)}</span>
        </div>
        {/* Vote score */}
        {votes && votes.total_votes > 0 && (
          <div className="text-right shrink-0">
            <div className="font-display italic" style={{ fontSize: 22, color: 'var(--color-text-primary)' }}>
              {votes.total_score}
            </div>
            <span className="eyebrow">{t('detail.default.votes', { count: votes.total_votes })}</span>
          </div>
        )}
      </div>

      {/* ── Praxis Title (§12.3) ── */}
      <h1
        className="font-display italic font-medium"
        style={{ fontSize: 30, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: 4 }}
      >
        {praxis.title}
      </h1>
      {/* Rainbow underline bar — 8 equal segments */}
      <div style={{ display: 'flex', height: 4, marginBottom: 16 }}>
        {RAINBOW_COLORS.map((color, index) => (
          <div key={index} style={{ flex: 1, background: color }} />
        ))}
      </div>

      <PraxisOwnerActions state={state} />

      {/* ── Task Context Strip (§12.4) ── */}
      <div
        className="sidebar-card mb-5"
        style={{
          borderLeft: '4px solid var(--faction-default-card-accent)',
          borderRadius: '0 8px 8px 0',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span className="eyebrow" style={{ fontSize: 8 }}>{t('detail.default.completingTask')}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="font-body"
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
        >
          {praxis.task_title}
        </Link>
        <span className="font-body" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
          {t('detail.default.points', { points: praxis.task_point_value })}
        </span>
      </div>

      {/* ── Media Gallery (§12.5) ── */}
      {praxis.media_items.length > 0 && (
        <div className="mb-5">
          <MediaGallery media={praxis.media_items} />
        </div>
      )}

      {/* ── Body Text (§12.6) — uses ReactMarkdown for rich content ── */}
      {praxis.body_text && (
        <div
          className="font-display mb-6 markdown-preview"
          style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-primary)' }}
        >
          <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
        </div>
      )}

      {/* ── Voting (§13 preview — full redesign in Phase 8) ── */}
      <div className="sidebar-card mb-4" style={{ padding: '14px 16px' }}>
        <div className="flex items-baseline justify-between mb-3">
          <span className="eyebrow">{t('detail.default.pointsFromVotes')}</span>
          {votes && (
            <span className="font-display italic" style={{ fontSize: 22, color: 'var(--color-text-primary)' }}>
              {votes.total_score}
              <span className="eyebrow" style={{ marginLeft: 4 }}>{t('detail.default.pts')}</span>
            </span>
          )}
        </div>
        <VoteUI
          factionSlug={praxis.task_faction_slug}
          praxisId={praxis.id}
          points={votes?.total_score}
          totalVotes={votes?.total_votes}
        />
      </div>

      {/* ── Meta ── */}
      <div className="flex items-center gap-4 eyebrow mb-4">
        <span>{t('detail.default.submitted', { date: formatTimestamp(praxis.created_at) })}</span>
        {praxis.moderation_status === 'flagged' && (
          <span style={{ border: '1px solid rgba(220,38,38,0.4)', color: 'var(--color-danger)', padding: '1px 6px', fontSize: 8 }}>
            {t('detail.default.flagged')}
          </span>
        )}
      </div>

      <PraxisFlagBlock state={state} />

      <PraxisVoterBreakdown state={state} />

      {/* -- Metatask Panel -- */}
      {(() => {
        if (!state.praxis || !state.user?.character) return null;

        const character = state.user.character;
        const isMember = state.praxis.members.some(
          (m) => m.character_id === character.id
        );
        if (!isMember) return null;

        const level = character.level ?? 0;
        const isAlbescent = character.faction_slug === "albescent";
        const canEdit = isAlbescent || level >= 7;
        const canSee = level >= 6 || isAlbescent;
        if (!canSee) return null;

        const appliedIds = new Set(
          (state.praxis.applied_metatasks ?? []).map((t) => t.id)
        );
        const available = state.metatasks.filter(
          (t) =>
            !appliedIds.has(t.id) &&
            (isAlbescent || t.metatask_faction_slug === character.faction_slug)
        );

        return (
          <div className="sidebar-card mb-4" style={{ padding: "14px 16px" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">{t('detail.metatasks.heading')}</span>
              {state.metataskLoading && (
                <span className="eyebrow" style={{ fontSize: 8 }}>{t('detail.metatasks.loading')}</span>
              )}
            </div>

            {/* Applied metatasks */}
            {state.praxis.applied_metatasks && state.praxis.applied_metatasks.length > 0 ? (
              <div style={{ marginBottom: canEdit ? 12 : 0 }}>
                <span className="eyebrow" style={{ fontSize: 8, display: "block", marginBottom: 6 }}>{t('detail.metatasks.applied')}</span>
                {state.praxis.applied_metatasks.map((metatask) => (
                  <div key={metatask.id} className="flex items-center gap-2 mb-1" style={{ padding: "4px 8px", background: "var(--color-surface-soft)", fontSize: 11 }}>
                    <span className="flex-1 font-body">{metatask.title}</span>
                    <span className="eyebrow" style={{ fontSize: 8 }}>{t('detail.metatasks.appliedPoints', { points: metatask.point_value })}</span>
                    {canEdit && (
                      <button
                        onClick={() => void state.handleRemoveMetatask(metatask.id)}
                        disabled={state.removingMetataskId === metatask.id}
                        style={{ background: "none", border: "1px solid rgba(220,38,38,0.3)", color: "var(--color-danger)", fontSize: 8, padding: "1px 6px", cursor: "pointer", opacity: state.removingMetataskId === metatask.id ? 0.5 : 1 }}
                      >
                        {state.removingMetataskId === metatask.id ? t('detail.metatasks.removing') : t('detail.metatasks.remove')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body" style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: canEdit ? 12 : 0 }}>
                {t('detail.metatasks.appliedEmpty')}
              </p>
            )}

            {/* Available metatasks */}
            {canEdit && (
              <>
                <span className="eyebrow" style={{ fontSize: 8, display: "block", marginBottom: 6 }}>{t('detail.metatasks.available')}</span>
                {state.metataskError && (
                  <p className="font-body" style={{ fontSize: 9, color: "var(--color-danger)", marginBottom: 6 }}>
                    {state.metataskError}
                  </p>
                )}
                {available.length === 0 && !state.metataskLoading ? (
                  <p className="font-body" style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                    {t('detail.metatasks.availableEmpty')}
                  </p>
                ) : (
                  available.map((metatask) => (
                    <div key={metatask.id} className="flex items-center gap-2 mb-1" style={{ padding: "4px 8px", background: "var(--color-surface-soft)", fontSize: 11 }}>
                      <span className="flex-1 font-body">{metatask.title}</span>
                      <span className="eyebrow" style={{ fontSize: 8 }}>{t('detail.metatasks.appliedPoints', { points: metatask.point_value })}</span>
                      <button
                        onClick={() => void state.handleApplyMetatask(metatask.id)}
                        disabled={state.applyingMetataskId === metatask.id}
                        style={{ background: "none", border: "1px solid var(--color-accent)", color: "var(--color-accent)", fontSize: 8, padding: "1px 6px", cursor: "pointer", opacity: state.applyingMetataskId === metatask.id ? 0.5 : 1 }}
                      >
                        {state.applyingMetataskId === metatask.id ? t('detail.metatasks.applying') : t('detail.metatasks.apply')}
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Read-only note */}
            {!canEdit && canSee && (
              <p className="font-body" style={{ fontSize: 9, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                {t('detail.metatasks.readOnlyNote')}
              </p>
            )}
          </div>
        );
      })()}

      {/* -- end Metatask Panel -- */}
    </div>
  )
}
