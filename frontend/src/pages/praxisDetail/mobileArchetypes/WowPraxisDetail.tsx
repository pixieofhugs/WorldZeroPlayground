/**
 * Warriors of Whimsy MOBILE praxis-detail skin (#499) — the praxis.exe window on
 * a phone: a pink computer-witch window (traffic-light title bar, dotted board,
 * inner notepad) holds the full media, then a Caveat "finding" headline, the
 * account body, and a big thumb-sized star caster. Single-column; ported from
 * the Field Kit `wow-treatment` §05 praxis detail. Renders the same invariant
 * CONTENT + behavior slots as every archetype (shared module) — only the dress
 * changes. Grounds on the `--faction-wow-*` tokens already in index.css (same
 * set WowPraxisDetail / WowFieldDesk use). Presentation-only.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import { formatTimestamp } from '../../../utils/dates'
import { factionName } from '../../../utils/factions'
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

const PINK = 'var(--faction-wow)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const WIN_BORDER = 'var(--faction-wow-win-border)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const DOT = 'var(--faction-wow-dot)'
const SCRIPT = 'var(--faction-wow-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime
const ON_ACCENT = 'var(--color-text-on-accent)'

/** The kit's four-point sparkle. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  )
}

/** A pink window: dotted title bar + dotted board wrapping an inner notepad. */
function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `2px solid ${WIN_BORDER}`,
        boxShadow: `0 8px 22px color-mix(in srgb, ${PINK} 22%, transparent)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 12px',
          background: 'linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))',
          borderBottom: `2px solid ${WIN_BORDER}`,
        }}
      >
        {['var(--faction-wow-scrap-deep)', 'var(--faction-wow-tape)', 'var(--faction-wow-ivy-leaf)'].map((c) => (
          <span
            key={c}
            style={{ width: 9, height: 9, borderRadius: '50%', background: c, border: '1.2px solid rgba(255,255,255,0.7)' }}
          />
        ))}
        <span
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: SCRIPT, fontSize: 18, color: TITLE_TEXT }}
        >
          <Sparkle size={11} color={TITLE_TEXT} />
          {title}
        </span>
      </div>
      <div
        style={{
          padding: 12,
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: 13 }}>
          {children}
        </div>
      </div>
    </section>
  )
}

export default function WowPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div
      data-skin="wow"
      className="page"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: BODY, color: CARD_TEXT, background: BODY_BG }}
    >
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background: `linear-gradient(150deg, ${PINK}, var(--faction-wow-card-muted))`,
              border: `1.5px solid ${WIN_BORDER}`,
              color: ON_ACCENT,
              fontFamily: SCRIPT,
              fontSize: 20,
            }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: SCRIPT, fontSize: 22, color: TITLE_TEXT, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ marginTop: 2, fontSize: 9, color: CARD_MUTED, letterSpacing: '0.06em' }}>
            {t('mobileFeed.byline', { faction: factionName(praxis.created_by_faction_slug), time: formatTimestamp(sealedDate) })}
          </div>
        </div>
      </div>

      {/* praxis.exe window — full media inside */}
      {praxis.media_items.length > 0 && (
        <Window title={t('detail.wow.windows.keepsakes')}>
          <MediaGallery media={praxis.media_items} layout="grid" />
        </Window>
      )}

      {/* Finding headline */}
      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: CARD_MUTED, marginBottom: 4 }}>
          {t('detail.wow.theFinding')}
        </div>
        <h1 style={{ fontFamily: SCRIPT, fontWeight: 700, fontSize: 34, lineHeight: 1.12, margin: 0, color: TITLE_TEXT, overflowWrap: 'anywhere' }}>
          {praxis.title ?? t('detail.wow.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontSize: 9.5, color: CARD_MUTED, letterSpacing: '0.04em' }}>
        {t('detail.wow.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: TITLE_TEXT, fontWeight: 700, textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>{' '}
        {t('detail.wow.lvlSealed', { level: praxis.task_level_required, date: formatTimestamp(sealedDate) })}
      </div>

      {/* Account body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview"
          style={{ fontFamily: BODY, fontSize: 13, lineHeight: 1.75, color: CARD_TEXT }}
        />
      )}

      {/* hearts.exe — the touch star caster */}
      <Window title={t('detail.wow.windows.hearts')}>
        <div
          className="flex items-center justify-center gap-2"
          style={{ marginBottom: 12, fontFamily: SCRIPT, fontSize: 22, color: TITLE_TEXT }}
        >
          <Sparkle size={13} color={PINK} />
          {t('detail.wow.sendLove')}
        </div>
        <MobileStarVote
          praxisId={praxis.id}
          points={votes?.total_score}
          totalVotes={votes?.total_votes}
          accent={PINK}
          accentFont={SCRIPT}
        />
      </Window>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
