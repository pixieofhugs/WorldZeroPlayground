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
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown, PraxisScoreBreakdown, MemberByline } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

const INK = 'var(--faction-albescent-card-text)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--font-body)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

/** Quiet mono section divider, e.g. "Account" / "Plates". */
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', margin: 'var(--space-xl) 0 var(--space-md)' }}>
      <div style={{ height: 1, flex: 1, background: ink(8) }} />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 'var(--text-xs)',
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
  const { praxis } = state
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
          gap: 'var(--space-lg)',
          padding: 'var(--space-md) var(--space-xl)',
          borderBottom: `1px solid ${ink(7)}`,
          background: ink(2),
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-sm)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: ink(30),
          }}
        >
          {t('detail.albescent.ref', { id: praxis.id })}
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: ink(28),
            borderBottom: `1px solid ${ink(18)}`,
            // Ornament: the lead between the status word and its own hairline
            // rule, not space between two elements (WORLD_ZERO_STYLE.md §4a,
            // ornament spacing). The nearest rung (4px) detaches the rule and
            // turns a ruled ledger entry into an underlined label.
            // eslint-disable-next-line local/no-raw-style-values -- ornament: hairline-rule lead under the status word.
            paddingBottom: 1,
          }}
        >
          {praxis.moderation_status === 'flagged' ? t('detail.albescent.status.underReview') : praxis.status === 'submitted' ? t('detail.albescent.status.returned') : praxis.status}
        </span>
      </div>

      <div style={{ padding: 'var(--space-xl) var(--space-xl) var(--space-2xl)' }}>
        {/* ── Behavior slots (invariant — shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Status strip ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Link
            to={`/tasks/${praxis.task_id}`}
            style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.14em', color: ink(34), textDecoration: 'none', textTransform: 'uppercase' }}
          >
            {t('detail.albescent.re', { task: praxis.task_title })}
          </Link>
          <span style={{ color: ink(20), fontSize: 'var(--text-xs)' }}>·</span>
          <span style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.1em', color: ink(34) }}>{t('detail.albescent.grade', { grade: praxis.task_level_required || '—' })}</span>
          <span style={{ color: ink(20), fontSize: 'var(--text-xs)' }}>·</span>
          <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-base)', color: ink(38) }}>{mode}</span>
          <span style={{ color: ink(20), fontSize: 'var(--text-xs)' }}>·</span>
          <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-base)', color: ink(38) }}>{t('detail.albescent.filed', { date: formatTimestamp(sealedDate) })}</span>
        </div>

        {/* ── The finding ── */}
        <h1
          style={{
            fontFamily: FONT,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'var(--text-display)',
            lineHeight: 1.05,
            color: INK,
            margin: '0 0 var(--space-lg)',
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
            gap: 'var(--space-lg)',
            paddingBottom: 'var(--space-xl)',
            marginBottom: 'var(--space-sm)',
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
              linkStyle={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 'var(--text-xl)', color: ink(72), textDecoration: 'none' }}
            />
            <span style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: ink(34) }}>{mode}</span>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div className="content-title" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, lineHeight: 1, color: ink(55) }}>
              {praxis.task_point_value}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.14em', color: ink(26), marginTop: 'var(--space-xs)' }}>{t('detail.albescent.ptsReturned')}</div>
          </div>
        </div>

        {/* ── The account ── */}
        {praxis.body_text && (
          <>
            <Divider label={t('detail.albescent.account')} />
            <MarkdownPreview
              source={praxis.body_text}
              className="markdown-preview content-text"
              style={{ fontFamily: FONT, fontStyle: 'italic', lineHeight: 1.7, color: ink(62) }}
            />
          </>
        )}

        {/* ── The plates (evidence) ── */}
        {praxis.media_items.length > 0 && (
          <>
            <Divider label={t('detail.albescent.plates', { count: praxis.media_items.length })} />
            <div style={{ border: `1px solid ${ink(10)}`, padding: 'var(--space-md)' }}>
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </>
        )}

        {/* ── Bear witness (vote caster) ── */}
        <Divider label={t('detail.albescent.bearWitness')} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <span className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: ink(48) }}>
            {t('detail.albescent.witnessPrompt')}
          </span>
          <PraxisScoreBreakdown state={state} align="right" accent={ink(60)} muted={ink(30)} font={FONT} />
        </div>
        <VoteUI
          factionSlug={praxis.task_faction_slug}
          praxisId={praxis.id}
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
