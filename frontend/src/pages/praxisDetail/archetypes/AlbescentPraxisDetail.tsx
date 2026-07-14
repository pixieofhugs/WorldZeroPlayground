/**
 * Albescent praxis-read archetype — "The Register" (ADR-0017, issue #231).
 *
 * A returned task is a filed account the faction now witnesses: always-light
 * vellum, Cormorant Garamond italic, near-black ink, a quiet mono for labels,
 * and the "bear witness" framing around the interactive caster. Ported from the
 * design bundle's EntryRead onto the real PraxisDetailState.
 *
 * Albescent is a FIRST-CLASS identity on this surface (not a ua alias): the
 * explicit ARCHETYPE_BY_SLUG['albescent'] entry beats the albescent→ua alias via
 * pickVariant, and the archetype reads its own component-private
 * --faction-albescent-* tokens (identical light/dark — always-light, never dims).
 * The behavior slots come from the shared module; this archetype owns only
 * presentation.
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown, MemberByline } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

const INK = 'var(--faction-albescent-card-text)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--font-body)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

/** Quiet mono section divider, e.g. "Account" / "Plates". */
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
      <div style={{ height: 1, flex: 1, background: ink(8) }} />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: ink(28),
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ height: 1, flex: 1, background: ink(8) }} />
    </div>
  )
}

export default function AlbescentPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const mode =
    praxis.type === 'solo' ? t('detail.albescent.mode.solo') : praxis.type === 'collab' ? t('detail.albescent.mode.collab') : t('detail.albescent.mode.duel')

  return (
    <div
      className="py-8 max-w-2xl"
      style={{
        background: 'var(--faction-albescent-card-bg)',
        border: `1px solid ${ink(10)}`,
        color: INK,
        fontFamily: MONO,
      }}
    >
      {/* ── Header band ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '10px 24px',
          borderBottom: `1px solid ${ink(7)}`,
          background: ink(2),
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: ink(30),
          }}
        >
          {t('detail.albescent.ref', { id: praxis.id })}
        </span>
        <span
          style={{
            fontSize: 7,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: ink(28),
            borderBottom: `1px solid ${ink(18)}`,
            paddingBottom: 1,
          }}
        >
          {praxis.moderation_status === 'flagged' ? t('detail.albescent.status.underReview') : praxis.status === 'submitted' ? t('detail.albescent.status.returned') : praxis.status}
        </span>
      </div>

      <div style={{ padding: '24px 24px 28px' }}>
        {/* ── Behavior slots (invariant — shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Status strip ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <Link
            to={`/tasks/${praxis.task_id}`}
            style={{ fontSize: 7.5, letterSpacing: '0.14em', color: ink(34), textDecoration: 'none', textTransform: 'uppercase' }}
          >
            {t('detail.albescent.re', { task: praxis.task_title })}
          </Link>
          <span style={{ color: ink(20), fontSize: 8 }}>·</span>
          <span style={{ fontSize: 7.5, letterSpacing: '0.1em', color: ink(34) }}>{t('detail.albescent.grade', { grade: praxis.task_level_required || '—' })}</span>
          <span style={{ color: ink(20), fontSize: 8 }}>·</span>
          <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 10, color: ink(38) }}>{mode}</span>
          <span style={{ color: ink(20), fontSize: 8 }}>·</span>
          <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 10, color: ink(38) }}>{t('detail.albescent.filed', { date: formatTimestamp(sealedDate) })}</span>
        </div>

        {/* ── The finding ── */}
        <h1
          style={{
            fontFamily: FONT,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 44,
            lineHeight: 1.05,
            color: INK,
            margin: '0 0 16px',
          }}
        >
          {praxis.title ?? t('detail.albescent.untitled')}
        </h1>

        {/* ── Owner actions ── */}
        <PraxisOwnerActions state={state} />

        {/* ── Byline (actor-scoped to the author's faction) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            paddingBottom: 20,
            marginBottom: 6,
            borderBottom: `1px solid ${ink(6)}`,
          }}
        >
          <Link to={`/characters/${praxis.created_by_id}`}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                flexShrink: 0,
                border: `1px solid ${ink(12)}`,
                background: `linear-gradient(135deg, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}, ${factionCssVar(praxis.created_by_faction_slug, 'card-bg')})`,
              }}
            />
          </Link>
          <div style={{ minWidth: 0 }}>
            <MemberByline
              praxis={praxis}
              linkStyle={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 15, color: ink(72), textDecoration: 'none' }}
            />
            <span style={{ fontSize: 7.5, letterSpacing: '0.06em', color: ink(34) }}>{mode}</span>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 28, lineHeight: 1, color: ink(55) }}>
              {praxis.task_point_value}
            </div>
            <div style={{ fontSize: 7, letterSpacing: '0.14em', color: ink(26), marginTop: 2 }}>{t('detail.albescent.ptsReturned')}</div>
          </div>
        </div>

        {/* ── The account ── */}
        {praxis.body_text && (
          <>
            <Divider label={t('detail.albescent.account')} />
            <div
              className="markdown-preview"
              style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: ink(62) }}
            >
              <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
            </div>
          </>
        )}

        {/* ── The plates (evidence) ── */}
        {praxis.media_items.length > 0 && (
          <>
            <Divider label={t('detail.albescent.plates', { count: praxis.media_items.length })} />
            <div style={{ border: `1px solid ${ink(10)}`, padding: 10 }}>
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </>
        )}

        {/* ── Bear witness (vote caster) ── */}
        <Divider label={t('detail.albescent.bearWitness')} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 13, color: ink(48) }}>
            {t('detail.albescent.witnessPrompt')}
          </span>
          {votes && votes.total_votes > 0 && (
            <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 16, color: ink(60), whiteSpace: 'nowrap' }}>
              +{votes.total_score}{' '}
              <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.14em', color: ink(30) }}>{t('detail.albescent.fromWitnesses')}</span>
            </span>
          )}
        </div>
        <VoteUI
          factionSlug={praxis.task_faction_slug}
          praxisId={praxis.id}
          points={votes?.total_score}
          totalVotes={votes?.total_votes}
          mode="caster"
        />

        {/* ── Flag block ── */}
        <PraxisFlagBlock state={state} />

        <PraxisVoterBreakdown state={state} />

        {/* Backer ledger slot — per-voter breakdown; reserved (#195) */}
        {/* Comments slot — neutral chrome rendered by the dispatcher (#167) */}
      </div>
    </div>
  )
}
