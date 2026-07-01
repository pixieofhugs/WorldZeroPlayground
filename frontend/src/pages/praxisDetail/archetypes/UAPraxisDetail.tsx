/**
 * The University of Asthmatics (UA) praxis-read page archetype — the GILT SALON.
 *
 * Built from the UA canon: an acquisition sheet exhibited on a salon wall —
 * burnt-amber/cream/gold/brown-ink palette, gilt-framed plate for the evidence,
 * Playfair italics for the headline, EB-Garamond serif body, Marcellus-SC small
 * caps for the regalia labels. The salon never dims: UA is always-light, so its
 * --faction-ua* / --ua-* tokens are identical in both themes and we style the
 * container with them directly without mutating the document theme.
 *
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation. Voting routes
 * through the <VoteUI factionSlug=…> dispatcher, which falls back to the global
 * vote stamps for UA (no bespoke UA vote component exists).
 *
 * All colors via --faction-ua* + the gilt private palette (--ua-*), index.css.
 * Actor-scoped byline themes to the AUTHOR's faction, not the task's.
 */
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

const DISPLAY = "'Playfair Display', serif"
const REGALIA = "'Marcellus SC', serif"
const SERIF = "'EB Garamond', serif"
const MONO = "'Courier Prime', monospace"

function modeLabel(type: string): string {
  if (type === 'solo') return 'a sole acquisition'
  if (type === 'collab') return 'a collaborative acquisition'
  return 'a dueling acquisition'
}

export default function UAPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at

  return (
    <div
      className="py-8 max-w-2xl"
      style={{
        position: 'relative',
        background: 'var(--ua-paper)',
        // gilt salon double-frame: paper inset, then a thin gold line
        border: '1px solid var(--ua-line)',
        boxShadow: `0 16px 38px color-mix(in srgb, var(--ua-ink) 16%, transparent),
                    inset 0 0 0 4px var(--ua-paper),
                    inset 0 0 0 5px var(--ua-line-soft)`,
        padding: 0,
      }}
    >
      {/* ── Header band — the acquisition sheet's letterhead ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '12px 26px',
          borderBottom: '1px solid var(--ua-line-soft)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--ua-gold-pale) 28%, var(--ua-paper)), var(--ua-paper))',
        }}
      >
        <Link
          to={`/tasks/${praxis.task_id}`}
          style={{
            fontFamily: REGALIA,
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--ua-gold)',
            textDecoration: 'none',
          }}
        >
          re: {praxis.task_title}
        </Link>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--faction-ua)',
            border: '1px solid var(--faction-ua-border)',
            padding: '3px 9px',
          }}
        >
          {praxis.moderation_status === 'flagged'
            ? 'Under review'
            : praxis.moderation_status === 'failed'
            ? 'Returned'
            : praxis.moderation_status === 'hidden'
            ? 'Withdrawn from view'
            : 'Exhibited'}
        </span>
      </div>

      <div style={{ padding: '30px 30px 34px' }}>
        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Eyebrow: grade · mode · sealed ── */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ua-muted)',
            marginBottom: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span>Acquisition · Grade {praxis.task_level_required > 0 ? praxis.task_level_required : '—'}</span>
          <span style={{ color: 'var(--ua-line)' }}>·</span>
          <span>{modeLabel(praxis.type)}</span>
          <span style={{ color: 'var(--ua-line)' }}>·</span>
          <span style={{ fontFamily: SERIF, fontSize: 11, fontStyle: 'italic', letterSpacing: 0, textTransform: 'none', color: 'var(--ua-sub)' }}>
            returned to the Salon {formatTimestamp(sealedDate)}
          </span>
        </div>

        {/* ── The headline ── */}
        <h1
          style={{
            fontFamily: DISPLAY,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 42,
            lineHeight: 1.06,
            color: 'var(--ua-ink)',
            marginBottom: 18,
          }}
        >
          {praxis.title ?? 'Untitled acquisition'}
        </h1>

        {/* ── Owner actions ── */}
        <PraxisOwnerActions state={state} />

        {/* ── Actor-scoped byline (themed to AUTHOR faction) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            paddingBottom: 22,
            marginBottom: 24,
            borderBottom: '1px solid var(--ua-line-soft)',
          }}
        >
          <Link to={`/characters/${praxis.created_by_id}`}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                flexShrink: 0,
                border: `1px solid ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}`,
                background: `linear-gradient(135deg, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}, ${factionCssVar(praxis.created_by_faction_slug, 'card-bg')})`,
              }}
            />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 15,
                color: 'var(--ua-ink)',
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
                fontFamily: MONO,
                fontSize: 8,
                letterSpacing: '0.06em',
                color: 'var(--ua-muted)',
              }}
            >
              The acquiring hand
            </span>
          </div>
          {/* Base point value from the task */}
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: 30,
                lineHeight: 1,
                color: 'var(--ua-orange)',
              }}
            >
              {praxis.task_point_value}
            </div>
            <div
              style={{
                fontFamily: REGALIA,
                fontSize: 8,
                letterSpacing: '0.1em',
                color: 'var(--ua-muted)',
                marginTop: 2,
              }}
            >
              pts at stake
            </div>
          </div>
        </div>

        {/* ── The account (body) ── */}
        {praxis.body_text && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--ua-line-soft)' }} />
              <span style={{ fontFamily: REGALIA, fontSize: 9, letterSpacing: '0.22em', color: 'var(--ua-gold)', whiteSpace: 'nowrap' }}>
                The Process
              </span>
              <div style={{ height: 1, flex: 1, background: 'var(--ua-line-soft)' }} />
            </div>
            <div
              className="markdown-preview"
              style={{
                fontFamily: SERIF,
                fontSize: 14,
                lineHeight: 1.85,
                color: 'var(--ua-sub)',
              }}
            >
              <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* ── The evidence — gilt-framed plate ── */}
        {praxis.media_items.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--ua-line-soft)' }} />
              <span style={{ fontFamily: REGALIA, fontSize: 9, letterSpacing: '0.22em', color: 'var(--ua-gold)', whiteSpace: 'nowrap' }}>
                The Plate · {praxis.media_items.length} {praxis.media_items.length === 1 ? 'work' : 'works'}
              </span>
              <div style={{ height: 1, flex: 1, background: 'var(--ua-line-soft)' }} />
            </div>
            {/* gilt frame: gold-leaf outer, gold inner mat, then the gallery */}
            <div
              style={{
                padding: 9,
                background: 'var(--ua-gilt)',
                boxShadow: `0 10px 22px color-mix(in srgb, var(--ua-ink) 20%, transparent),
                            inset 0 0 0 1px color-mix(in srgb, white 40%, transparent)`,
              }}
            >
              <div
                style={{
                  padding: 3,
                  background: 'linear-gradient(135deg, var(--ua-gold), var(--ua-gold-pale))',
                }}
              >
                <div style={{ background: 'var(--ua-paper)', padding: 6 }}>
                  <MediaGallery media={praxis.media_items} layout="grid" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── The critique (vote caster) ── */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
              paddingTop: 16,
              borderTop: '1px solid var(--ua-line-soft)',
            }}
          >
            <span style={{ fontFamily: REGALIA, fontSize: 10, letterSpacing: '0.2em', color: 'var(--ua-gold)' }}>
              The Patronage
            </span>
            {/* Points earned from votes */}
            {votes && votes.total_votes > 0 && (
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 22,
                    color: 'var(--ua-orange)',
                  }}
                >
                  +{votes.total_score}
                </span>
                <span
                  style={{
                    fontFamily: REGALIA,
                    fontSize: 8,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ua-muted)',
                    marginLeft: 6,
                  }}
                >
                  points returned
                </span>
              </div>
            )}
          </div>
          <VoteUI
            factionSlug={praxis.task_faction_slug}
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
