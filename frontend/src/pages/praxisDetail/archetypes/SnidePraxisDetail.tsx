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
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import SnideVote from '../../../components/vote/SnideVote'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown } from '../shared'
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
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const grade = praxis.task_level_required > 0 ? praxis.task_level_required : '—'
  const mode =
    praxis.type === 'solo' ? 'solo job' : praxis.type === 'collab' ? 'crew job' : 'turf war'

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
        padding: '28px 30px',
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
        <div style={{ lineHeight: 0, marginBottom: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              background: ACID,
              color: PAPER_INK,
              padding: '8px 16px',
              transform: 'rotate(-1.5deg)',
              boxShadow: `4px 4px 0 ${PINK}`,
            }}
          >
            <span
              style={{
                fontFamily: F_COND,
                fontSize: 17,
                letterSpacing: '0.14em',
                whiteSpace: 'nowrap',
              }}
            >
              S.N.I.D.E. · CLOSED CASE · FILED
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
            gap: 10,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to={`/tasks/${praxis.task_id}`}
            style={{
              fontFamily: F_COND,
              fontSize: 13,
              letterSpacing: '0.08em',
              color: ACID,
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            re: {praxis.task_title}
          </Link>
          <span style={{ color: MUTED, fontSize: 9 }}>·</span>
          <span
            style={{
              fontFamily: F_BODY,
              fontSize: 8.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            grade {grade}
          </span>
          <span style={{ color: MUTED, fontSize: 9 }}>·</span>
          <span
            style={{
              fontFamily: F_BODY,
              fontSize: 8.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            {mode}
          </span>
          <span style={{ color: MUTED, fontSize: 9 }}>·</span>
          <span
            style={{
              fontFamily: F_BODY,
              fontSize: 8.5,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            filed {formatTimestamp(sealedDate)}
          </span>
          {praxis.moderation_status === 'flagged' && (
            <span
              style={{
                fontFamily: F_COND,
                fontSize: 11,
                letterSpacing: '0.1em',
                color: '#fff',
                background: PINK,
                padding: '1px 8px',
                transform: 'rotate(-3deg)',
                textTransform: 'uppercase',
              }}
            >
              flagged
            </span>
          )}
        </div>

        {/* ── The finding (headline) ── */}
        <h1
          style={{
            fontFamily: F_ANTON,
            fontSize: 40,
            lineHeight: 0.9,
            color: PAPER_TEXT,
            margin: '0 0 14px',
            transform: 'skewX(-4deg)',
            letterSpacing: '0.01em',
          }}
        >
          {praxis.title ?? 'Untitled confession'}
        </h1>

        {/* Acid rule */}
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${PINK}, ${ACID}, transparent)`,
            marginBottom: 16,
          }}
        />

        {/* ── Owner actions ── */}
        <PraxisOwnerActions state={state} />

        {/* ── Actor-scoped byline (mugshot tab) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 24,
            paddingBottom: 16,
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
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: F_MARKER,
                fontSize: 22,
                color: PINK,
                textDecoration: 'none',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {praxis.created_by_display_name || `#${praxis.created_by_id}`}
            </Link>
            <span
              style={{
                fontFamily: F_BODY,
                fontSize: 8.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              pulled it off
            </span>
          </div>
          {/* Base point value from task */}
          <div
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 4,
              background: PAPER_INK,
              border: `1.5px solid ${PINK}`,
              padding: '4px 10px',
              transform: 'rotate(1.5deg)',
            }}
          >
            <span style={{ fontFamily: F_ANTON, fontSize: 22, color: ACID, lineHeight: 1 }}>
              +{praxis.task_point_value}
            </span>
            <span
              style={{
                fontFamily: F_BODY,
                fontSize: 7,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              base
            </span>
          </div>
        </div>

        {/* ── The confession (taped notebook) ── */}
        {praxis.body_text && (
          <div style={{ position: 'relative', marginBottom: 28 }}>
            <span
              style={{
                display: 'inline-block',
                background: ACID,
                color: PAPER_INK,
                fontFamily: F_MARKER,
                fontSize: 17,
                padding: '3px 13px',
                transform: 'rotate(-1.5deg)',
                boxShadow: `2px 2px 0 ${PINK}`,
                marginBottom: 12,
              }}
            >
              the confession
            </span>
            <div
              className="markdown-preview"
              style={{
                border: `1.5px solid ${PAPER_INK}`,
                borderLeft: `4px solid ${PINK}`,
                background: PAPER,
                color: PAPER_INK,
                backgroundImage:
                  'repeating-linear-gradient(180deg, transparent 0 27px, color-mix(in srgb, var(--faction-snide-ink) 11%, transparent) 27px 28px)',
                padding: '10px 18px 16px',
                fontFamily: F_BODY,
                fontSize: 13,
                lineHeight: '28px',
              }}
            >
              <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* ── The evidence (exhibit frames) ── */}
        {praxis.media_items.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <span
              style={{
                display: 'inline-block',
                background: ACID,
                color: PAPER_INK,
                fontFamily: F_MARKER,
                fontSize: 17,
                padding: '3px 13px',
                transform: 'rotate(1.5deg)',
                boxShadow: `2px 2px 0 ${PINK}`,
                marginBottom: 14,
              }}
            >
              evidence · {praxis.media_items.length}
            </span>
            <div
              style={{
                border: `1.5px solid ${ACID}`,
                background: 'color-mix(in srgb, var(--faction-snide-acid) 6%, transparent)',
                padding: 10,
              }}
            >
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </div>
        )}

        {/* ── Ransom divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 2, background: `color-mix(in srgb, ${ACID} 40%, transparent)` }} />
          <span style={{ fontFamily: F_MARKER, fontSize: 14, color: PINK, transform: 'rotate(-2deg)' }}>×</span>
          <div style={{ flex: 1, height: 2, background: `color-mix(in srgb, ${ACID} 40%, transparent)` }} />
        </div>

        {/* ── Cast a vote (the verdict) ── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                background: PINK,
                color: '#fff',
                fontFamily: F_MARKER,
                fontSize: 17,
                padding: '3px 13px',
                transform: 'rotate(-1deg)',
                boxShadow: `2px 2px 0 ${PAPER_INK}`,
              }}
            >
              the verdict
            </span>
            {/* Points from votes */}
            {votes && votes.total_votes > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 4,
                  transform: 'rotate(1deg)',
                }}
              >
                <span style={{ fontFamily: F_ANTON, fontSize: 22, color: ACID, lineHeight: 1 }}>
                  +{votes.total_score}
                </span>
                <span
                  style={{
                    fontFamily: F_BODY,
                    fontSize: 7,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: MUTED,
                  }}
                >
                  pts from votes
                </span>
              </div>
            )}
          </div>
          <SnideVote
            praxisId={praxis.id}
            points={votes?.total_score}
            totalVotes={votes?.total_votes}
            mode="caster"
          />
        </div>

        {/* ── Flag block ── */}
        <PraxisFlagBlock state={state} />

        <PraxisVoterBreakdown state={state} />

      </div>
    </div>
  )
}
