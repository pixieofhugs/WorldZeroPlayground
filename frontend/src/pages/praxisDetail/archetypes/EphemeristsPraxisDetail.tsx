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
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import EphemeristsVote from '../../../components/vote/EphemeristsVote'
import { EphMark, EphEyebrow, Foxing, LapisLastWord, toRoman } from '../../../components/cards/ephemeristsAtoms'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

export default function EphemeristsPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { praxis, votes } = state
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
        padding: '28px 32px',
      }}
    >
      {/* Age-foxing overlay — multiply-blended, pointer-events: none */}
      <Foxing opacity={0.45} />

      {/* All content sits above the foxing */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Masthead ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <EphEyebrow motto="finding · testament · codex" />
        </div>

        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Status strip ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to={`/tasks/${praxis.task_id}`}
            style={{
              fontFamily: 'var(--eph-display)',
              fontSize: 8,
              letterSpacing: '0.18em',
              color: 'var(--eph-muted)',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            re: {praxis.task_title}
          </Link>
          <span style={{ color: 'color-mix(in srgb, var(--eph-ink) 25%, transparent)', fontSize: 8 }}>·</span>
          <span
            style={{
              fontFamily: 'var(--eph-display)',
              fontSize: 8,
              letterSpacing: '0.12em',
              color: 'var(--eph-muted)',
            }}
          >
            Grade {grade}
          </span>
          <span style={{ color: 'color-mix(in srgb, var(--eph-ink) 25%, transparent)', fontSize: 8 }}>·</span>
          <span
            style={{
              fontFamily: 'var(--eph-serif)',
              fontSize: 8,
              fontStyle: 'italic',
              color: 'var(--eph-muted)',
            }}
          >
            sealed {formatTimestamp(sealedDate)}
          </span>
          {praxis.moderation_status === 'flagged' && (
            <>
              <span style={{ color: 'color-mix(in srgb, var(--eph-ink) 25%, transparent)', fontSize: 8 }}>·</span>
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 7,
                  letterSpacing: '0.1em',
                  color: 'var(--eph-rubric)',
                  border: '1px solid var(--eph-rubric)',
                  padding: '1px 5px',
                }}
              >
                flagged
              </span>
            </>
          )}
        </div>

        {/* ── Finding headline ── */}
        <h1
          style={{
            fontFamily: 'var(--eph-display)',
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'var(--eph-ink)',
            marginBottom: 4,
            letterSpacing: '0.01em',
          }}
        >
          <LapisLastWord text={praxis.title ?? 'Untitled filing'} footnote />
        </h1>

        {/* Ink rule */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, var(--eph-rubric), color-mix(in srgb, var(--eph-ink) 18%, transparent))`,
            marginBottom: 16,
          }}
        />

        {/* ── Owner actions ── */}
        <PraxisOwnerActions state={state} />

        {/* ── Actor-scoped byline ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            paddingBottom: 14,
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
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: 'var(--eph-serif)',
                fontStyle: 'italic',
                fontSize: 13,
                color: 'var(--eph-lapis)',
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
                fontFamily: 'var(--eph-display)',
                fontSize: 7.5,
                letterSpacing: '0.1em',
                color: 'var(--eph-muted)',
              }}
            >
              {praxis.type === 'solo' ? 'sole filing' : praxis.type === 'collab' ? 'collaborative filing' : 'dueling filing'}
            </span>
          </div>
          {/* Point value from task */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontFamily: 'var(--eph-display)',
                fontSize: 18,
                color: 'var(--eph-ink)',
                lineHeight: 1,
              }}
            >
              {praxis.task_point_value}
            </div>
            <span
              style={{
                fontFamily: 'var(--eph-display)',
                fontSize: 7,
                letterSpacing: '0.14em',
                color: 'var(--eph-muted)',
              }}
            >
              BASE PTS
            </span>
          </div>
        </div>

        {/* ── The account ── */}
        {praxis.body_text && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <EphMark size={10} color="var(--eph-rubric)" />
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 8,
                  letterSpacing: '0.2em',
                  color: 'var(--eph-rubric)',
                  textTransform: 'uppercase',
                }}
              >
                The account
              </span>
            </div>
            <div
              className="markdown-preview"
              style={{
                fontFamily: 'var(--eph-script)',
                fontStyle: 'italic',
                fontSize: 15,
                lineHeight: 1.8,
                color: 'var(--eph-vellum-text)',
              }}
            >
              <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* ── The evidence ── */}
        {praxis.media_items.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <EphMark size={10} color="var(--eph-rubric)" />
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 8,
                  letterSpacing: '0.2em',
                  color: 'var(--eph-rubric)',
                  textTransform: 'uppercase',
                }}
              >
                The evidence · {praxis.media_items.length} {praxis.media_items.length === 1 ? 'specimen' : 'specimens'}
              </span>
            </div>
            <div
              style={{
                border: '1px solid color-mix(in srgb, var(--eph-ink) 14%, transparent)',
                padding: 10,
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
            gap: 8,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--eph-ink) 14%, transparent)' }} />
          <EphMark size={12} color="var(--eph-gold)" />
          <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--eph-ink) 14%, transparent)' }} />
        </div>

        {/* ── The concordance (vote caster) ── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <EphMark size={10} color="var(--eph-rubric)" />
              <span
                style={{
                  fontFamily: 'var(--eph-display)',
                  fontSize: 8,
                  letterSpacing: '0.2em',
                  color: 'var(--eph-rubric)',
                  textTransform: 'uppercase',
                }}
              >
                The concordance
              </span>
            </div>
            {/* Points from votes */}
            {votes && votes.total_votes > 0 && (
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: 'var(--eph-display)',
                    fontSize: 18,
                    color: 'var(--eph-ink)',
                    lineHeight: 1,
                  }}
                >
                  +{votes.total_score}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--eph-display)',
                    fontSize: 7,
                    letterSpacing: '0.14em',
                    color: 'var(--eph-muted)',
                    marginLeft: 4,
                  }}
                >
                  PTS FROM VOTES
                </span>
              </div>
            )}
          </div>
          <EphemeristsVote
            praxisId={praxis.id}
            points={votes?.total_score}
            totalVotes={votes?.total_votes}
            mode="caster"
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
