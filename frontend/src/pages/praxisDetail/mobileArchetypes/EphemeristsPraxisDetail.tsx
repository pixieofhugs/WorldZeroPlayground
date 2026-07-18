import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import { EphemeristsSigil } from '../../../components/cards/ephemeristsAtoms'
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
 * The Ephemerists MOBILE praxis-detail skin (#527) — a sealed ephemeris leaf,
 * phone-shaped. A ledger-ruled vellum plate holds the filed evidence (full
 * media); a Cinzel finding headline, the account body, and a thumb-sized
 * concordance caster follow. Renders the same invariant CONTENT + behavior slots
 * as every archetype (the shared praxisDetail module) — only the dress changes.
 * Grounds on `--eph-*` tokens; theme-aware through the cascade.
 */

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const LAPIS = 'var(--eph-lapis)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'
const SCRIPT = 'var(--eph-script)'

const kicker: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** A ledger leaf bound in a gold-deep hairline on aged vellum. */
function Leaf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: VELLUM, border: `1px solid ${GOLD_DEEP}`, padding: 'var(--space-md)' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 'var(--text-sm)', letterSpacing: '0.13em', textTransform: 'uppercase', color: RUBRIC, marginBottom: 'var(--space-md)' }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function EphemeristsPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="ephemerists" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: SERIF, color: TEXT, background: VELLUM_DEEP }}>
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 42, height: 42, background: VELLUM_DEEP, border: `1.5px solid ${GOLD_DEEP}`, color: RUBRIC, fontFamily: DISPLAY, fontWeight: 700, fontSize: 'var(--text-content)' }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'var(--text-content)', color: TEXT, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)' }}>
            {t('detail.ephemerists.acquiringHand')} · {formatTimestamp(sealedDate)}
          </div>
        </div>
        <EphemeristsSigil size={20} color={LAPIS} />
      </div>

      {/* Evidence plate — full media inside */}
      {praxis.media_items.length > 0 && (
        <Leaf title={t('detail.ephemerists.mobile.plate')}>
          <MediaGallery media={praxis.media_items} layout="grid" />
        </Leaf>
      )}

      {/* Finding headline */}
      <div>
        <div style={{ ...kicker, marginBottom: 'var(--space-xs)', color: LAPIS }}>{t('detail.ephemerists.mobile.theFinding')}</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'var(--text-heading)', lineHeight: 1.1, margin: 0, color: TEXT, overflowWrap: 'anywhere' }}>
          {praxis.title ?? t('detail.ephemerists.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 'var(--text-xl)', color: MUTED }}>
        {t('detail.ephemerists.mobile.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: LAPIS, fontWeight: 700, textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>
      </div>

      {/* Account body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: SERIF, lineHeight: 1.7, color: TEXT }}
        />
      )}

      {/* Concordance caster */}
      <Leaf title={t('detail.ephemerists.concordance')}>
        <div className="flex items-center justify-center content-text" style={{ marginBottom: 'var(--space-md)', fontFamily: SCRIPT, fontStyle: 'italic', color: TEXT }}>
          {t('detail.ephemerists.mobile.appraise')}
        </div>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <PraxisScoreBreakdown state={state} align="center" accent={RUBRIC} font={DISPLAY} />
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          accent={RUBRIC}
          accentFont={DISPLAY}
        />
      </Leaf>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
