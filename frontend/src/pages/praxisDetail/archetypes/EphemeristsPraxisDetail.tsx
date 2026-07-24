/**
 * The Ephemerists praxis-read page archetype.
 *
 * Built from the Ephemerists canon: vellum stock, iron-gall ink, foxing stains,
 * Cinzel headings, Cormorant Garamond body, the wax-seal Concordance caster.
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation.
 *
 * All colors via --eph-* and --faction-ephemerists-* CSS vars (index.css).
 * Actor-scoped byline themes to the AUTHOR's faction, not the task's.
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { EphemeristsSigil, EphEyebrow, Foxing, LapisLastWord, toRoman } from '../../../components/cards/ephemeristsAtoms'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown, PraxisScoreBreakdown, MemberByline } from '../shared'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import type { PraxisDetailState } from '../usePraxisDetail'

export default function EphemeristsPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const grade = praxis.task_level_required > 0 ? toRoman(praxis.task_level_required) : '—'

  return (
    <div
      className="py-8 max-w-2xl"
      style={{
        position: 'relative',
        background: 'var(--eph-vellum)',
        border: '1px solid color-mix(in srgb, var(--eph-ink) 12%, transparent)',
        padding: 'var(--space-2xl) var(--space-2xl)',
      }}
    >
      {/* Age-foxing overlay — multiply-blended, pointer-events: none */}
      <Foxing opacity={0.45} />

      {/* All content sits above the foxing */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Masthead ── */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <EphEyebrow motto={t('detail.ephemerists.motto')} />
        </div>

        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Status strip ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to={`/tasks/${praxis.task_id}`}
            style={{
              fontFamily: 'var(--eph-display)',
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.18em',
              color: 'var(--eph-muted)',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            {t('detail.ephemerists.re', { task: praxis.task_title })}
          </Link>
          <span style={{ color: 'color-mix(in srgb, var(--eph-ink) 25%, transparent)', fontSize: 'var(--text-xs)' }}>·</span>
          <span
            style={{
              fontFamily: 'var(--eph-display)',
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.12em',
              color: 'var(--eph-muted)',
            }}
          >
            {t('detail.ephemerists.grade', { grade })}
          </span>
          <span style={{ color: 'color-mix(in srgb, var(--eph-ink) 25%, transparent)', fontSize: 'var(--text-xs)' }}>·</span>
          <span
            style={{
              fontFamily: 'var(--eph-serif)',
              fontSize: 'var(--text-xs)',
              fontStyle: 'italic',
              color: 'var(--eph-muted)',
            }}
          >
            {t('detail.ephemerists.sealed', { date: formatTimestamp(sealedDate) })}
          </span>
          {praxis.moderation_status === 'flagged' && (
            <>
              <span style={{ color: 'color-mix(in srgb, var(--eph-ink) 25%, transparent)', fontSize: 'var(--text-xs)' }}>·</span>
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.1em',
                  color: 'var(--eph-rubric)',
                  border: '1px solid var(--eph-rubric)',
                  padding: 'var(--space-xs) var(--space-xs)',
                }}
              >
                {t('detail.ephemerists.flagged')}
              </span>
            </>
          )}
        </div>

        {/* ── Finding headline ── */}
        <h1
          style={{
            fontFamily: 'var(--eph-display)',
            fontSize: 'var(--text-title)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'var(--eph-vellum-text)',
            marginBottom: 'var(--space-xs)',
            letterSpacing: '0.01em',
          }}
        >
          <LapisLastWord text={praxis.title ?? t('detail.ephemerists.untitled')} footnote />
        </h1>

        {/* Ink rule */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, var(--eph-rubric), color-mix(in srgb, var(--eph-ink) 18%, transparent))`,
            marginBottom: 'var(--space-lg)',
          }}
        />

        {/* ── Owner actions ── */}
        <PraxisOwnerActions state={state} />

        {/* ── Actor-scoped byline ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
            paddingBottom: 'var(--space-lg)',
            borderBottom: '1px dashed color-mix(in srgb, var(--eph-ink) 18%, transparent)',
          }}
        >
          <Link to={`/characters/${praxis.created_by_id}`}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}, ${factionCssVar(praxis.created_by_faction_slug, 'card-bg')})`,
                border: '1.5px solid color-mix(in srgb, var(--eph-ink) 20%, transparent)',
              }}
            />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: 'var(--eph-serif)',
                fontStyle: 'italic',
                fontSize: 'var(--text-lg)',
                color: 'var(--eph-lapis)',
                textDecoration: 'none',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--eph-display)',
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.1em',
                color: 'var(--eph-muted)',
              }}
            >
              {praxis.type === 'solo' ? t('detail.ephemerists.mode.solo') : praxis.type === 'collab' ? t('detail.ephemerists.mode.collab') : t('detail.ephemerists.mode.duel')}
            </span>
          </div>
          {/* Point value from task */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              className="content-title"
              style={{
                fontFamily: 'var(--eph-display)',
                color: 'var(--eph-vellum-text)',
                lineHeight: 1,
              }}
            >
              {praxis.task_point_value}
            </div>
            <span
              style={{
                fontFamily: 'var(--eph-display)',
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.14em',
                color: 'var(--eph-muted)',
              }}
            >
              {t('detail.ephemerists.basePts')}
            </span>
          </div>
        </div>

        {/* ── Metatask seals (#932) — read-only stack, below the byline/points
            block, above the evidence. Dispatched on each metatask's issuing
            faction; an empty stack renders nothing. ── */}
        {praxis.applied_metatasks.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <MetaTaskSeal metatasks={praxis.applied_metatasks} />
          </div>
        )}

        {/* ── The account ── */}
        {praxis.body_text && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <EphemeristsSigil size={10} color="var(--eph-rubric)" />
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.2em',
                  color: 'var(--eph-rubric)',
                  textTransform: 'uppercase',
                }}
              >
                {t('detail.ephemerists.theAccount')}
              </span>
            </div>
            <MarkdownPreview
              source={praxis.body_text}
              className="markdown-preview content-text"
              style={{
                fontFamily: 'var(--eph-script)',
                fontStyle: 'italic',
                lineHeight: 1.8,
                color: 'var(--eph-vellum-text)',
              }}
            />
          </div>
        )}

        {/* ── The evidence ── */}
        {praxis.media_items.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <EphemeristsSigil size={10} color="var(--eph-rubric)" />
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.2em',
                  color: 'var(--eph-rubric)',
                  textTransform: 'uppercase',
                }}
              >
                {t('detail.ephemerists.evidence', { count: praxis.media_items.length })}
              </span>
            </div>
            <div
              style={{
                border: '1px solid color-mix(in srgb, var(--eph-ink) 14%, transparent)',
                padding: 'var(--space-md)',
              }}
            >
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </div>
        )}

        {/* ── Ornamental divider ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--eph-ink) 14%, transparent)' }} />
          <EphemeristsSigil size={12} color="var(--eph-gold)" />
          <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--eph-ink) 14%, transparent)' }} />
        </div>

        {/* ── The concordance (vote caster) ── */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <EphemeristsSigil size={10} color="var(--eph-rubric)" />
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.2em',
                  color: 'var(--eph-rubric)',
                  textTransform: 'uppercase',
                }}
              >
                {t('detail.ephemerists.concordance')}
              </span>
            </div>
            {/* Earned-points breakdown (#641) */}
            <PraxisScoreBreakdown
              state={state}
              align="right"
              accent="var(--eph-vellum-text)"
              muted="var(--eph-muted)"
              font="var(--eph-display)"
            />
          </div>
          <VoteUI
            factionSlug={praxis.task_faction_slug}
            praxisId={praxis.id}
          />
        </div>

        {/* ── Flag block ── */}
        <PraxisFlagBlock state={state} />

        <PraxisVoterBreakdown state={state} />

        {/* Backer ledger slot — per-voter breakdown; filled by #195 */}
        {/* Comments slot — actor-scoped surface, see CONTEXT.md; built separately (#167) */}

      </div>
    </div>
  )
}
