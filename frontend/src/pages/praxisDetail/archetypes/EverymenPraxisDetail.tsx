/**
 * The Everymen praxis-read page archetype.
 *
 * Built from the Everymen canon: a union WORK REPORT filed at the hall, skinned
 * as a WW2 mobilize / victory poster. Stamped red masthead with a hard ink
 * drop-shadow, a red→gold stripe rule, the job-reference eyebrow, a poster
 * headline, the actor-scoped byline + base points, the report body, proof-of-work
 * plates, and the approval-stamp Concordance caster.
 *
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation.
 *
 * All colors via --faction-everymen* + the private --everymen-* palette
 * (index.css). Fonts via var(--font-accent) (Bebas) / var(--font-body).
 * Shades via color-mix(). Theme flips automatically through the tokens.
 * Actor-scoped byline themes to the AUTHOR's faction, not the task's.
 */
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import EverymenVote from '../../../components/vote/EverymenVote'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

const POSTER = 'var(--font-accent)' // Bebas Neue
const BODY = 'var(--font-body)'
const STRIPE = 'repeating-linear-gradient(90deg, var(--everymen-red) 0 16px, var(--everymen-gold) 16px 26px)'

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0 16px' }}>
      <h2
        style={{
          fontFamily: POSTER,
          fontSize: 25,
          letterSpacing: '0.04em',
          margin: 0,
          color: 'var(--everymen-paper-text)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </h2>
      <span style={{ flex: 1, height: 3, background: STRIPE, opacity: 0.55 }} />
    </div>
  )
}

export default function EverymenPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const modeLabel = praxis.type === 'collab' ? 'COLLAB' : 'SOLO'

  return (
    <div
      className="py-8"
      style={{
        maxWidth: '46rem',
        background: 'var(--everymen-paper)',
        border: '1.5px solid var(--everymen-ink)',
        boxShadow: '0 0 0 3px var(--everymen-paper), 0 0 0 4px var(--everymen-ink)',
        padding: 0,
        color: 'var(--everymen-paper-text)',
        fontFamily: BODY,
      }}
    >
      {/* ── Stamped masthead ── */}
      <div
        style={{
          background: 'var(--everymen-red)',
          color: 'var(--everymen-cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 22px',
        }}
      >
        <span style={{ fontFamily: POSTER, fontSize: 26, letterSpacing: '0.08em', lineHeight: 1, whiteSpace: 'nowrap' }}>
          Work Report · Filed
        </span>
        <span style={{ fontFamily: BODY, fontSize: 9, letterSpacing: '0.12em', textAlign: 'right' }}>
          {modeLabel}
        </span>
      </div>
      {/* red→gold stripe rule */}
      <div style={{ height: 4, background: STRIPE }} />

      <div style={{ padding: '24px 30px 30px' }}>
        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Identity / status strip ── */}
        <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--everymen-muted)', marginBottom: 4 }}>
          <Link to={`/tasks/${praxis.task_id}`} style={{ color: 'var(--everymen-muted)', textDecoration: 'none' }}>
            re: {praxis.task_title}
          </Link>
          {' · '}lvl {praxis.task_level_required}
          {' · '}sealed {formatTimestamp(sealedDate)}
          {praxis.moderation_status === 'flagged' && (
            <>
              {' · '}
              <span
                style={{
                  fontFamily: POSTER,
                  letterSpacing: '0.1em',
                  color: 'var(--everymen-cream)',
                  background: 'var(--everymen-red)',
                  border: '1px solid var(--everymen-ink)',
                  padding: '1px 6px',
                }}
              >
                FLAGGED
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--everymen-red)', marginBottom: 8 }}>
          the job, done
        </div>

        {/* ── Poster headline ── */}
        <h1
          style={{
            fontFamily: POSTER,
            fontWeight: 400,
            fontSize: 52,
            lineHeight: 0.98,
            letterSpacing: '0.01em',
            margin: 0,
            color: 'var(--everymen-paper-text)',
          }}
        >
          {praxis.title || 'Untitled filing'}
        </h1>

        {/* ── Owner actions ── */}
        <div style={{ marginTop: 16 }}>
          <PraxisOwnerActions state={state} />
        </div>

        {/* ── Actor-scoped byline + base points ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            paddingTop: 18,
            marginTop: 18,
            borderTop: '2px solid var(--everymen-ink)',
          }}
        >
          <Link to={`/characters/${praxis.created_by_id}`} style={{ flexShrink: 0 }}>
            <span
              style={{
                display: 'block',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: `radial-gradient(circle at 32% 28%, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}, ${factionCssVar(praxis.created_by_faction_slug, 'card-bg')} 72%)`,
                border: '1.5px solid var(--everymen-ink)',
              }}
            />
          </Link>
          <div style={{ lineHeight: 1.35, minWidth: 0, flex: 1 }}>
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: POSTER,
                fontSize: 22,
                color: 'var(--everymen-paper-text)',
                lineHeight: 1,
                textDecoration: 'none',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {praxis.created_by_display_name || `#${praxis.created_by_id}`}
            </Link>
            <div style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--everymen-muted)', marginTop: 3 }}>
              {praxis.type === 'collab' ? 'all hands' : 'one pair of hands'}
            </div>
          </div>
          {/* base points from the task */}
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: POSTER, fontSize: 30, lineHeight: 1, color: 'var(--everymen-red)' }}>
              ★ {praxis.task_point_value}
            </div>
            <div style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--everymen-muted)', marginTop: 3 }}>
              base points
            </div>
          </div>
        </div>

        {/* ── The report (account body) ── */}
        {praxis.body_text && (
          <>
            <SectionHead>The Work</SectionHead>
            <div
              className="markdown-preview"
              style={{
                fontFamily: BODY,
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--everymen-paper-text)',
              }}
            >
              <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
            </div>
          </>
        )}

        {/* ── Proof of work (evidence) ── */}
        {praxis.media_items.length > 0 && (
          <>
            <SectionHead>
              Proof of Work · {praxis.media_items.length} {praxis.media_items.length === 1 ? 'plate' : 'plates'}
            </SectionHead>
            <div
              style={{
                border: '1.5px solid var(--everymen-ink)',
                background: 'var(--everymen-cream)',
                boxShadow: '3px 4px 0 color-mix(in srgb, var(--everymen-ink) 18%, transparent)',
                padding: 10,
              }}
            >
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </>
        )}

        {/* ── The crew's marks (vote caster) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '26px 0 16px', gap: 14 }}>
          <h2 style={{ fontFamily: POSTER, fontSize: 25, letterSpacing: '0.04em', margin: 0, color: 'var(--everymen-paper-text)', whiteSpace: 'nowrap' }}>
            The Crew's Marks
          </h2>
          {/* points from votes */}
          {votes && votes.total_votes > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontFamily: POSTER, fontSize: 24, lineHeight: 1, color: 'var(--everymen-red)' }}>
                +{votes.total_score}
              </span>
              <span style={{ fontFamily: BODY, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--everymen-muted)', marginLeft: 6 }}>
                pts from votes
              </span>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 20 }}>
          <EverymenVote
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
