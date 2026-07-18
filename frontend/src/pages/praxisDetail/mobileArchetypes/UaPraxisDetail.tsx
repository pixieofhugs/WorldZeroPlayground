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
  PraxisScoreBreakdown,
  MemberByline,
} from '../shared'
import { MobileStarVote } from './shared'

/**
 * University of Asthmatics MOBILE praxis-detail skin (#525) — an acquisition
 * hung in the salon, phone-shaped. A gilt-framed plate holds the exhibited work
 * (full media); a Cormorant-italic finding headline, the account body, and a
 * thumb-sized appraisal caster follow. Renders the same invariant CONTENT +
 * behavior slots as every archetype (the shared praxisDetail module) — only the
 * dress changes. Grounds on `--faction-ua-*` / `--ua-*` tokens; always-light.
 */

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const WALL = 'var(--ua-wall)'
const INK = 'var(--faction-ua-card-text)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const GOLD_PALE = 'var(--ua-gold-pale)'
const LINE = 'var(--ua-line)'
const GILT = 'var(--ua-gilt)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

/** Exhibited plate — the gilt sandwich frame around a parchment body. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ padding: 8, background: GILT, boxShadow: '0 10px 24px rgba(60,40,10,.18), inset 0 0 0 1px rgba(255,255,255,0.45)' }}>
      <div style={{ padding: 3, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
        <div style={{ background: PAPER, border: `1px solid ${LINE}`, padding: 13 }}>
          <div style={{ fontFamily: ENGRAVED, fontSize: 'var(--text-sm)', letterSpacing: '0.13em', textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>
            {title}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function UaPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="ua" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: MONO, color: INK, background: WALL }}>
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 42, height: 42, background: PAPER_WARM, border: `1px solid ${GOLD}`, boxShadow: `0 0 0 3px ${PAPER_WARM}, 0 0 0 4px ${GOLD_PALE}`, color: ACCENT, fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-content)' }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-content)', color: INK, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ ...kicker, marginTop: 3 }}>
            {t('detail.ua.acquiringHand')} · {formatTimestamp(sealedDate)}
          </div>
        </div>
      </div>

      {/* Exhibited plate — full media inside */}
      {praxis.media_items.length > 0 && (
        <Plate title={t('detail.ua.mobile.plate')}>
          <MediaGallery media={praxis.media_items} layout="grid" />
        </Plate>
      )}

      {/* Finding headline */}
      <div>
        <div style={{ ...kicker, marginBottom: 4, color: SUB }}>{t('detail.ua.mobile.theAcquisition')}</div>
        <h1 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-heading)', lineHeight: 1.1, margin: 0, color: INK, overflowWrap: 'anywhere' }}>
          {praxis.title ?? t('detail.ua.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 'var(--text-lg)', color: SUB }}>
        {t('detail.ua.mobile.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: ACCENT, fontWeight: 700, textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>
      </div>

      {/* Account body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: DISPLAY, lineHeight: 1.75, color: INK }}
        />
      )}

      {/* Appraisal caster */}
      <Plate title={t('detail.ua.standing.heading')}>
        <div className="flex items-center justify-center content-text" style={{ marginBottom: 12, fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, color: INK }}>
          {t('detail.ua.mobile.appraise')}
        </div>
        <div style={{ marginBottom: 12 }}>
          <PraxisScoreBreakdown state={state} align="center" accent={ACCENT} font={DISPLAY} />
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          accent={ACCENT}
          accentFont={DISPLAY}
        />
      </Plate>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
