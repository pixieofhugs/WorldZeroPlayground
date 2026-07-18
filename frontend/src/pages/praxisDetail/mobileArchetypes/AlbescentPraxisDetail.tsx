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
 * Albescent MOBILE praxis-detail skin (#528) — a filed account in the Register,
 * phone-shaped. A cotton sheet holds the returned work (full media); a
 * Cormorant-italic finding, the account body, and a thumb-sized "bear witness"
 * caster follow. Renders the same invariant CONTENT + behavior slots as every
 * archetype (the shared praxisDetail module) — only the dress changes: the
 * surveyor's Mark, hairlines, one hue of ink, no colour. Grounds on
 * `--faction-albescent-*` tokens; always-light.
 */

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const PAGE = 'var(--faction-albescent-page)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--faction-albescent-mono)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: ink(30),
}

/** Quiet mono section divider, e.g. "The Plates" / "Bear witness". */
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 4px' }}>
      <div style={{ height: 1, flex: 1, background: ink(8) }} />
      <span style={{ ...kicker, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: ink(8) }} />
    </div>
  )
}

/** A cotton sheet holding filed evidence. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: SHEET, border: `1px solid ${ink(10)}`, padding: 12 }}>{children}</div>
  )
}

export default function AlbescentPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="albescent" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: MONO, color: INK, background: PAGE }}>
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, background: ink(4), border: `1px solid ${ink(14)}`, color: ink(55), fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-content)' }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-content)', color: INK, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ ...kicker, marginTop: 3 }}>
            {t('detail.albescent.acquiringHand')} · {formatTimestamp(sealedDate)}
          </div>
        </div>
      </div>

      {/* Filed plates — full media inside */}
      {praxis.media_items.length > 0 && (
        <div>
          <Divider label={t('detail.albescent.mobile.plate')} />
          <Sheet>
            <MediaGallery media={praxis.media_items} layout="grid" />
          </Sheet>
        </div>
      )}

      {/* The finding */}
      <div>
        <div style={{ ...kicker, marginBottom: 4, color: ink(40) }}>{t('detail.albescent.mobile.theAccount')}</div>
        <h1 style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-heading)', lineHeight: 1.1, margin: 0, color: INK, overflowWrap: 'anywhere' }}>
          {praxis.title ?? t('detail.albescent.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-lg)', color: ink(48) }}>
        {t('detail.albescent.mobile.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: ink(72), textDecoration: 'none', borderBottom: `1px solid ${ink(20)}` }}>
          {praxis.task_title}
        </Link>
      </div>

      {/* Account body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: FONT, fontStyle: 'italic', lineHeight: 1.7, color: ink(62) }}
        />
      )}

      {/* Bear witness caster */}
      <div>
        <Divider label={t('detail.albescent.mobile.witness')} />
        <div className="flex items-center justify-center content-text" style={{ margin: '10px 0 12px', fontFamily: FONT, fontStyle: 'italic', color: ink(50) }}>
          {t('detail.albescent.witnessPrompt')}
        </div>
        <div style={{ marginBottom: 12 }}>
          <PraxisScoreBreakdown state={state} align="center" accent={INK} font={FONT} />
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          accent={INK}
          accentFont={FONT}
        />
      </div>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
