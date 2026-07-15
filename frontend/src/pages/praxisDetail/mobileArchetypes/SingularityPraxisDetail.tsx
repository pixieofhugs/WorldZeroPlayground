import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
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

/**
 * Singularity MOBILE praxis-detail skin (#526) — a generated signal, phone
 * shaped. A bracketed readout panel holds the output artifacts (full media); a
 * `>`-prefixed finding, the process log body, and a thumb-sized amplify caster
 * follow. Renders the same invariant CONTENT + behavior slots as every archetype
 * (the shared praxisDetail module) — only the dress changes.
 *
 * Always-dark: every colour resolves to a theme-identical --faction-singularity-*
 * token; the skin paints its own void field and never mutates data-theme.
 */

const VOID = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const SIGNAL = 'var(--faction-singularity-card-muted)'
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)'

const phosphor = (pct: number): string => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`
const signal = (pct: number): string => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: FONT,
  fontSize: 8,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: signal(60),
}

/** Void readout panel with a signal hairline, headed by a prompt title. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: VOID, border: `1px solid ${signal(42)}`, padding: 13 }}>
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${phosphor(1.2)} 2px, ${phosphor(1.2)} 4px)` }}
      />
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: PHOSPHOR, marginBottom: 10 }}>
          {title}
        </div>
        {children}
      </div>
    </section>
  )
}

export default function SingularityPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="singularity" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, color: PHOSPHOR, background: VOID }}>
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 42, height: 42, background: signal(14), border: `1px solid ${BORDER_HARD}`, color: SIGNAL, fontFamily: FONT, fontSize: 18 }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: FONT, fontSize: 16, color: PHOSPHOR, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ ...kicker, marginTop: 3 }}>
            {t('detail.singularity.mobile.node')} · {formatTimestamp(sealedDate)}
          </div>
        </div>
      </div>

      {/* Output artifacts — full media inside */}
      {praxis.media_items.length > 0 && (
        <Panel title={t('detail.singularity.mobile.artifacts')}>
          <MediaGallery media={praxis.media_items} layout="grid" />
        </Panel>
      )}

      {/* Finding */}
      <div>
        <div style={{ ...kicker, marginBottom: 4, color: SIGNAL }}>{t('detail.singularity.mobile.output')}</div>
        <h1 style={{ fontFamily: FONT, fontSize: 24, lineHeight: 1.2, margin: 0, color: PHOSPHOR, letterSpacing: '0.02em', overflowWrap: 'anywhere' }}>
          {'> '}
          {praxis.title ?? t('detail.singularity.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontFamily: FONT, fontSize: 12, color: phosphor(60) }}>
        {t('detail.singularity.mobile.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: PHOSPHOR, textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>
      </div>

      {/* Process-log body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview"
          style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.7, color: phosphor(80) }}
        />
      )}

      {/* Amplify caster */}
      <Panel title={t('detail.singularity.mobile.consensus')}>
        <div className="flex items-center justify-center" style={{ marginBottom: 12, fontFamily: FONT, fontSize: 13, color: PHOSPHOR }}>
          {t('detail.singularity.mobile.amplify')}
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          points={votes?.total_score}
          totalVotes={votes?.total_votes}
          accent={PHOSPHOR}
          accentFont={FONT}
        />
      </Panel>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
