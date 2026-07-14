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
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, MemberByline } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import type { VoteSummary, VoterDetail } from '../../../api/votes'

const DISPLAY = "'Playfair Display', serif"
const REGALIA = "'Marcellus SC', serif"
const SERIF = "'EB Garamond', serif"
const MONO = "'Courier Prime', monospace"

function modeLabel(type: string, t: TFunction<'praxis'>): string {
  if (type === 'solo') return t('detail.ua.mode.solo')
  if (type === 'collab') return t('detail.ua.mode.collab')
  return t('detail.ua.mode.duel')
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  )
}

/**
 * "The Standing" — the salon ledger. Two honest metrics from the live vote
 * model: total_score (points earned) + total_votes (appraisal headcount), then
 * a gilt roster of who appraised the work and at what rung (value / 5). The UA
 * skin of the shared voter-breakdown surface — same real data, gilt language.
 *
 * NOTE: the design handoff also sketched a "give points / applaud" stepper and
 * a per-appraiser variable-points ledger (the old ADR-0005 dual-currency
 * model). The live backend is a single 1–5 appraisal per voter, so those are
 * omitted — casting an appraisal is "The Patronage" caster below. A real
 * points-currency ledger would need a new backend model (its own issue).
 */
function TheStanding({
  votes,
  voters,
}: {
  praxis: PraxisOut
  votes: VoteSummary | null
  voters: VoterDetail[]
}) {
  const { t } = useTranslation('praxis')
  if (!votes || votes.total_votes === 0) return null

  return (
    <div
      style={{
        marginTop: 8,
        marginBottom: 24,
        background: 'var(--ua-paper)',
        border: '1px solid var(--ua-line)',
        boxShadow: 'inset 0 0 0 4px var(--ua-paper), inset 0 0 0 5px var(--ua-line-soft)',
        padding: '22px 24px',
      }}
    >
      <div style={{ fontFamily: REGALIA, fontSize: 10, letterSpacing: '0.2em', color: 'var(--ua-gold)', marginBottom: 18 }}>
        {t('detail.ua.standing.heading')}
      </div>

      {/* Headline: points earned · appraisal headcount */}
      <div style={{ display: 'flex', marginBottom: voters.length ? 20 : 0 }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 42, lineHeight: 0.85, color: 'var(--ua-orange)' }}>
            {votes.total_score}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ua-sub)', marginTop: 7 }}>
            {t('detail.ua.standing.pointsEarned')}
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: 16, borderLeft: '1px solid var(--ua-line)' }}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 42, lineHeight: 0.85, color: 'var(--ua-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, color: 'var(--ua-gold)' }}>✦</span>
            {votes.total_votes}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ua-sub)', marginTop: 7 }}>
            {t('detail.ua.standing.appraisal', { count: votes.total_votes })}
          </div>
        </div>
      </div>

      {/* Appraisers' ledger — each patron + the rung they gave (value / 5) */}
      {voters.length > 0 && (
        <>
          <div style={{ borderTop: '1px dashed var(--ua-line-soft)', paddingTop: 15, fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ua-sub)', marginBottom: 13 }}>
            {t('detail.ua.standing.appraisedBy')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {voters.map((voter) => (
              <div key={voter.character_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to={`/characters/${voter.character_id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'color-mix(in srgb, var(--ua-gold-pale) 28%, var(--ua-paper))',
                      border: '1.5px solid var(--ua-line)',
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 9,
                      color: 'var(--ua-orange)',
                    }}
                  >
                    {initials(voter.display_name)}
                  </span>
                </Link>
                <Link
                  to={`/characters/${voter.character_id}`}
                  style={{ width: 96, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: SERIF, fontSize: 12.5, color: 'var(--ua-ink)', textDecoration: 'none' }}
                >
                  {voter.display_name}
                </Link>
                <div style={{ flex: 1, height: 9, background: 'color-mix(in srgb, var(--ua-gold-pale) 20%, var(--ua-paper))', border: '1px solid var(--ua-line-soft)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(voter.value / 5) * 100}%`, background: 'var(--ua-orange)', opacity: 0.9 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 14, color: 'var(--ua-orange)' }}>
                  {voter.value === 5 ? '✦' : `№${voter.value}`}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--ua-line)', marginTop: 12, paddingTop: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ua-sub)' }}>
              {t('detail.ua.standing.patronsTotal', { count: voters.length })}
            </span>
            <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: 'var(--ua-orange)' }}>
              {t('detail.ua.standing.pts', { points: votes.total_score })}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default function UAPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes, voters } = state
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
          {t('detail.ua.re', { task: praxis.task_title })}
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
            ? t('detail.ua.status.underReview')
            : praxis.moderation_status === 'failed'
            ? t('detail.ua.status.returned')
            : praxis.moderation_status === 'hidden'
            ? t('detail.ua.status.withdrawn')
            : t('detail.ua.status.exhibited')}
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
          <span>{t('detail.ua.acquisitionGrade', { grade: praxis.task_level_required > 0 ? praxis.task_level_required : '—' })}</span>
          <span style={{ color: 'var(--ua-line)' }}>·</span>
          <span>{modeLabel(praxis.type, t)}</span>
          <span style={{ color: 'var(--ua-line)' }}>·</span>
          <span style={{ fontFamily: SERIF, fontSize: 11, fontStyle: 'italic', letterSpacing: 0, textTransform: 'none', color: 'var(--ua-sub)' }}>
            {t('detail.ua.returnedToSalon', { date: formatTimestamp(sealedDate) })}
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
          {praxis.title ?? t('detail.ua.untitled')}
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
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 15,
                color: 'var(--ua-ink)',
                textDecoration: 'none',
              }}
            />
            <span
              style={{
                fontFamily: MONO,
                fontSize: 8,
                letterSpacing: '0.06em',
                color: 'var(--ua-muted)',
              }}
            >
              {t('detail.ua.acquiringHand')}
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
              {t('detail.ua.ptsAtStake')}
            </div>
          </div>
        </div>

        {/* ── The account (body) ── */}
        {praxis.body_text && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--ua-line-soft)' }} />
              <span style={{ fontFamily: REGALIA, fontSize: 9, letterSpacing: '0.22em', color: 'var(--ua-gold)', whiteSpace: 'nowrap' }}>
                {t('detail.ua.theProcess')}
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
                {t('detail.ua.thePlate', { count: praxis.media_items.length })}
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

        {/* ── The Standing — points, appraisals & the salon ledger ── */}
        <TheStanding praxis={praxis} votes={votes} voters={voters} />

        {/* ── The Patronage (cast your appraisal) ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 14, paddingTop: 16, borderTop: '1px solid var(--ua-line-soft)' }}>
            <span style={{ fontFamily: REGALIA, fontSize: 10, letterSpacing: '0.2em', color: 'var(--ua-gold)' }}>
              {t('detail.ua.patronage')}
            </span>
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
      </div>
    </div>
  )
}
