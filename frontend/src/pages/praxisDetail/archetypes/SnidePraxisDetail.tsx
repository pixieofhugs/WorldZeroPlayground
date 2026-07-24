/**
 * The S.N.I.D.E. praxis-read page archetype.
 *
 * Built from the SNIDE canon: a ransom/xerox dossier — a CLOSED CASE filed on
 * photocopier-ink stock, with acid-green and hot-zine-pink ransom stamps, taped
 * confession on ruled notebook paper, and exhibit-framed evidence. SNIDE is
 * ALWAYS-DARK: the ink surface is scoped to this archetype's own container via
 * the --faction-snide-card-* / --faction-snide-* tokens (index.css). We never
 * mutate the document theme, so the dossier reads identically in light + dark.
 *
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation. The actor-scoped
 * byline themes to the AUTHOR's faction, not the task's.
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown, PraxisScoreBreakdown, MemberByline } from '../shared'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import type { PraxisDetailState } from '../usePraxisDetail'

// Always-dark dossier tokens (scoped to this archetype's container).
const INK = 'var(--faction-snide-card-bg)' // photocopier ink — the surface
const PAPER_TEXT = 'var(--faction-snide-card-text)' // warm xerox paper, on ink
const MUTED = 'var(--faction-snide-card-muted)' // faded newsprint grey
const ACID = 'var(--faction-snide-acid)' // toxic / radioactive green
const PINK = 'var(--faction-snide-pink)' // hot zine pink
const PAPER = 'var(--faction-snide-paper)' // warm xerox stock (the notebook)
const PAPER_INK = 'var(--faction-snide-ink)' // ink on the paper inserts

const F_ANTON = 'var(--faction-snide-font-impact)'
const F_COND = 'var(--faction-snide-font-cond)'
const F_MARKER = 'var(--faction-snide-font-marker)'
const F_BODY = 'var(--font-body)'

export default function SnidePraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const grade = praxis.task_level_required > 0 ? praxis.task_level_required : '—'
  const mode =
    praxis.type === 'solo' ? t('detail.snide.mode.solo') : praxis.type === 'collab' ? t('detail.snide.mode.collab') : t('detail.snide.mode.duel')

  return (
    <div
      className="py-8 max-w-2xl"
      style={{
        position: 'relative',
        fontFamily: F_BODY,
        color: PAPER_TEXT,
        background: INK,
        border: `1.5px solid ${ACID}`,
        boxShadow: '6px 7px 0 rgba(0,0,0,0.4)',
        padding: 'var(--space-2xl) var(--space-2xl)',
      }}
    >
      {/* Halftone screen over the ink — pointer-events: none */}
      <div
        className="ht-dots"
        style={{
          position: 'absolute',
          inset: 0,
          color: 'rgba(182,255,46,0.06)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* All content sits above the halftone */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Stamped masthead ── */}
        <div style={{ lineHeight: 0, marginBottom: 'var(--space-lg)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              background: ACID,
              color: PAPER_INK,
              padding: 'var(--space-sm) var(--space-lg)',
              transform: 'rotate(-1.5deg)',
              boxShadow: `4px 4px 0 ${PINK}`,
            }}
          >
            <span
              style={{
                fontFamily: F_COND,
                fontSize: 'var(--text-content)',
                letterSpacing: '0.14em',
                whiteSpace: 'nowrap',
              }}
            >
              {t('detail.snide.closedCaseFiled')}
            </span>
          </div>
        </div>

        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Case-file status strip ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to={`/tasks/${praxis.task_id}`}
            style={{
              fontFamily: F_COND,
              fontSize: 'var(--text-lg)',
              letterSpacing: '0.08em',
              color: ACID,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            {t('detail.snide.re', { task: praxis.task_title })}
          </Link>
          <span style={{ color: MUTED, fontSize: 'var(--text-sm)' }}>·</span>
          <span
            style={{
              fontFamily: F_BODY,
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            {t('detail.snide.grade', { grade })}
          </span>
          <span style={{ color: MUTED, fontSize: 'var(--text-sm)' }}>·</span>
          <span
            style={{
              fontFamily: F_BODY,
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            {mode}
          </span>
          <span style={{ color: MUTED, fontSize: 'var(--text-sm)' }}>·</span>
          <span
            style={{
              fontFamily: F_BODY,
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            {t('detail.snide.filed', { date: formatTimestamp(sealedDate) })}
          </span>
          {praxis.moderation_status === 'flagged' && (
            <span
              style={{
                fontFamily: F_COND,
                fontSize: 'var(--text-md)',
                letterSpacing: '0.1em',
                color: '#fff',
                background: PINK,
                padding: 'var(--space-xs) var(--space-sm)',
                transform: 'rotate(-3deg)',
                textTransform: 'uppercase',
              }}
            >
              {t('detail.snide.flagged')}
            </span>
          )}
        </div>

        {/* ── The finding (headline) ── */}
        <h1
          style={{
            fontFamily: F_ANTON,
            fontSize: 'var(--text-display)',
            lineHeight: 0.9,
            color: PAPER_TEXT,
            margin: '0 0 var(--space-lg)',
            transform: 'skewX(-4deg)',
            letterSpacing: '0.01em',
          }}
        >
          {praxis.title ?? t('detail.snide.untitled')}
        </h1>

        {/* Acid rule */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${PINK}, ${ACID}, transparent)`,
            marginBottom: 'var(--space-lg)',
          }}
        />

        {/* ── Owner actions ── */}
        <PraxisOwnerActions state={state} />

        {/* ── Actor-scoped byline (mugshot tab) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            paddingBottom: 'var(--space-lg)',
            borderBottom: `1.5px dashed color-mix(in srgb, ${PAPER_TEXT} 30%, transparent)`,
          }}
        >
          <Link to={`/characters/${praxis.created_by_id}`} style={{ flexShrink: 0 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}, ${factionCssVar(praxis.created_by_faction_slug, 'card-bg')})`,
                border: `2px solid ${ACID}`,
                transform: 'rotate(-4deg)',
              }}
            />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: F_MARKER,
                fontSize: 'var(--text-title)',
                color: PINK,
                textDecoration: 'none',
              }}
            />
            <span
              style={{
                fontFamily: F_BODY,
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              {t('detail.snide.pulledItOff')}
            </span>
          </div>
          {/* Base point value from task */}
          <div
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 'var(--space-xs)',
              background: PAPER_INK,
              border: `1.5px solid ${PINK}`,
              padding: 'var(--space-xs) var(--space-md)',
              transform: 'rotate(1.5deg)',
            }}
          >
            <span style={{ fontFamily: F_ANTON, fontSize: 'var(--text-title)', color: ACID, lineHeight: 1 }}>
              +{praxis.task_point_value}
            </span>
            <span
              style={{
                fontFamily: F_BODY,
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              {t('detail.snide.base')}
            </span>
          </div>
        </div>

        {/* ── Metatask seals (#932) — read-only stack, below the byline/points
            block, above the evidence. Each seal keeps its issuing faction's
            voice, not SNIDE's; an empty stack renders nothing. ── */}
        {praxis.applied_metatasks.length > 0 && (
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <MetaTaskSeal metatasks={praxis.applied_metatasks} />
          </div>
        )}

        {/* ── The confession (taped notebook) ── */}
        {praxis.body_text && (
          <div style={{ position: 'relative', marginBottom: 'var(--space-2xl)' }}>
            <span
              style={{
                display: 'inline-block',
                background: ACID,
                color: PAPER_INK,
                fontFamily: F_MARKER,
                fontSize: 'var(--text-content)',
                padding: 'var(--space-xs) var(--space-md)',
                transform: 'rotate(-1.5deg)',
                boxShadow: `2px 2px 0 ${PINK}`,
                marginBottom: 'var(--space-md)',
              }}
            >
              {t('detail.snide.theConfession')}
            </span>
            <MarkdownPreview
              source={praxis.body_text}
              className="markdown-preview content-text"
              style={{
                border: `1.5px solid ${PAPER_INK}`,
                borderLeft: `4px solid ${PINK}`,
                background: PAPER,
                color: PAPER_INK,
                backgroundImage:
                  'repeating-linear-gradient(180deg, transparent 0 27px, color-mix(in srgb, var(--faction-snide-ink) 11%, transparent) 27px 28px)',
                padding: 'var(--space-md) var(--space-lg) var(--space-lg)',
                fontFamily: F_BODY,
                lineHeight: '28px',
              }}
            />
          </div>
        )}

        {/* ── The evidence (exhibit frames) ── */}
        {praxis.media_items.length > 0 && (
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <span
              style={{
                display: 'inline-block',
                background: ACID,
                color: PAPER_INK,
                fontFamily: F_MARKER,
                fontSize: 'var(--text-content)',
                padding: 'var(--space-xs) var(--space-md)',
                transform: 'rotate(1.5deg)',
                boxShadow: `2px 2px 0 ${PINK}`,
                marginBottom: 'var(--space-lg)',
              }}
            >
              {t('detail.snide.evidence', { count: praxis.media_items.length })}
            </span>
            <div
              style={{
                border: `1.5px solid ${ACID}`,
                background: 'color-mix(in srgb, var(--faction-snide-acid) 6%, transparent)',
                padding: 'var(--space-md)',
              }}
            >
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </div>
        )}

        {/* ── Ransom divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ flex: 1, height: 2, background: `color-mix(in srgb, ${ACID} 40%, transparent)` }} />
          <span style={{ fontFamily: F_MARKER, fontSize: 'var(--text-xl)', color: PINK, transform: 'rotate(-2deg)' }}>×</span>
          <div style={{ flex: 1, height: 2, background: `color-mix(in srgb, ${ACID} 40%, transparent)` }} />
        </div>

        {/* ── Cast a vote (the verdict) ── */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-md)',
              flexWrap: 'wrap',
              marginBottom: 'var(--space-md)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                background: PINK,
                color: '#fff',
                fontFamily: F_MARKER,
                fontSize: 'var(--text-content)',
                padding: 'var(--space-xs) var(--space-md)',
                transform: 'rotate(-1deg)',
                boxShadow: `2px 2px 0 ${PAPER_INK}`,
              }}
            >
              {t('detail.snide.theVerdict')}
            </span>
            {/* Earned-points breakdown (#641) */}
            <div style={{ transform: 'rotate(1deg)' }}>
              <PraxisScoreBreakdown state={state} align="right" accent={ACID} muted={MUTED} font={F_ANTON} />
            </div>
          </div>
          <VoteUI
            factionSlug={praxis.task_faction_slug}
            praxisId={praxis.id}
            viewerCanVote={praxis.viewer_can_vote}
          />
        </div>

        {/* ── Flag block ── */}
        <PraxisFlagBlock state={state} />

        <PraxisVoterBreakdown state={state} />

      </div>
    </div>
  )
}
