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
 * Everymen MOBILE praxis-detail skin (#529) — a filed work report, phone shaped.
 * The proof of work sits in a union ledger plate; a knockout Bebas finding
 * headline, the report body, and a thumb-sized "mark the work" caster follow.
 * Renders the same invariant CONTENT + behavior slots as every archetype (the
 * shared praxisDetail module) — only the dress changes. Grounds on the
 * `--everymen-*` tokens; flips with `[data-theme]`.
 */

const INK = 'var(--everymen-ink)' // structure only: borders/rules (stays near-black in dark)
const PAPER_TEXT = 'var(--everymen-paper-text)' // text on the paper surface (flips in dark)
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 8,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** Cream ledger plate framed in union ink, headed by a Bebas title. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: PAPER, border: `2px solid ${INK}`, padding: 14 }}>
      <div style={{ fontFamily: ACCENT_FONT, fontSize: 15, letterSpacing: '0.06em', color: RED, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function EverymenPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="everymen" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: BODY_FONT, color: PAPER_TEXT, background: PAPER }}>
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center"
            style={{ width: 42, height: 42, background: GOLD, border: `2px solid ${INK}`, color: RED, fontFamily: ACCENT_FONT, fontSize: 22 }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: ACCENT_FONT, fontSize: 20, letterSpacing: '0.02em', color: PAPER_TEXT, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ ...kicker, marginTop: 3 }}>
            {t('detail.everymen.mobile.filed')} · {formatTimestamp(sealedDate)}
          </div>
        </div>
      </div>

      {/* Proof of work — full media inside */}
      {praxis.media_items.length > 0 && (
        <Plate title={t('detail.everymen.mobile.plate')}>
          <MediaGallery media={praxis.media_items} layout="grid" />
        </Plate>
      )}

      {/* Finding headline */}
      <div>
        <div style={{ ...kicker, marginBottom: 4, color: RED }}>{t('detail.everymen.theWork')}</div>
        <h1 style={{ fontFamily: ACCENT_FONT, fontSize: 34, lineHeight: 0.95, letterSpacing: '0.01em', margin: 0, color: PAPER_TEXT, overflowWrap: 'anywhere' }}>
          {praxis.title ?? t('detail.everymen.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: MUTED }}>
        {t('detail.everymen.mobile.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ fontFamily: ACCENT_FONT, fontSize: 16, letterSpacing: '0.02em', color: RED, textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>
      </div>

      {/* Report body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview"
          style={{ fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.75, color: PAPER_TEXT }}
        />
      )}

      {/* The crew's marks — vote caster */}
      <Plate title={t('detail.everymen.crewsMarks')}>
        <div className="flex items-center justify-center" style={{ marginBottom: 12, fontFamily: ACCENT_FONT, fontSize: 18, letterSpacing: '0.04em', color: PAPER_TEXT }}>
          {t('detail.everymen.mobile.appraise')}
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          points={votes?.total_score}
          totalVotes={votes?.total_votes}
          accent={RED}
          accentFont={ACCENT_FONT}
        />
      </Plate>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
