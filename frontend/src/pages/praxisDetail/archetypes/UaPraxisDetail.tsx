/**
 * The University of Asthmatics (UA) praxis-read page archetype.
 *
 * REPOINTED, NOT REBUILT (#853). The layout, ornament and language here are
 * still the old "gilt salon" — an acquisition sheet exhibited on a salon wall,
 * with regalia labels and an "appraisal" ledger. #853 only swapped the colour
 * names: every reference to the deleted legacy `--ua-*` family now reads the
 * `--faction-ua-*` sun-bleached primitives instead, so the page stops painting
 * with tokens that no longer exist. Gold is gone (it moved to WOW) and the
 * evidence plate's gilt double-frame is now a sand/neutral mat. A real rebuild
 * against the UA identity kit is a separate, future issue.
 *
 * It also dims now. The old "the salon never dims" claim died with #848: every
 * `--faction-ua-*` token has a [data-theme="dark"] value, so this container
 * follows the theme without any JS branch.
 *
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation. Voting routes
 * through the <VoteUI factionSlug=…> dispatcher, which falls back to the global
 * vote stamps for UA (no bespoke UA vote component exists).
 *
 * All colors via --faction-ua-* in index.css. Actor-scoped byline themes to the
 * AUTHOR's faction, not the task's.
 */
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import MediaGallery from '../../../components/MediaGallery'
import VoteUI from '../../../components/vote/VoteUI'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, MemberByline, praxisBreakdownParts } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import type { VoteSummary, VoterDetail } from '../../../api/votes'

const DISPLAY = "var(--faction-ua-card-font)"
const REGALIA = "var(--faction-ua-body-font)"
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
  praxis,
  votes,
  voters,
}: {
  praxis: PraxisOut
  votes: VoteSummary | null
  voters: VoterDetail[]
}) {
  const { t } = useTranslation('praxis')
  if (!votes || votes.total_votes === 0) return null
  // The single earned-points breakdown (#641) — merit = base × mult + votes,
  // ×1.0 today so it reads `{base} + {votes}` like the card's PraxisScoreHero.
  const { base, votePoints, isPlain, multiplierLabel } = praxisBreakdownParts(praxis, votes)

  return (
    <div
      style={{
        marginTop: 'var(--space-sm)',
        marginBottom: 'var(--space-xl)',
        background: 'var(--faction-ua-card-bg)',
        border: '1px solid var(--faction-ua-rule)',
        boxShadow: 'inset 0 0 0 4px var(--faction-ua-card-bg), inset 0 0 0 5px var(--faction-ua-hair)',
        padding: 'var(--space-xl) var(--space-xl)',
      }}
    >
      <div style={{ fontFamily: REGALIA, fontSize: 'var(--text-base)', letterSpacing: '0.2em', color: 'var(--faction-ua-card-accent)', marginBottom: 'var(--space-lg)' }}>
        {t('detail.ua.standing.heading')}
      </div>

      {/* Headline: points earned · appraisal headcount */}
      <div style={{ display: 'flex', marginBottom: voters.length ? "var(--space-xl)" : 0 }}>
        <div style={{ flex: 1, paddingRight: 'var(--space-lg)' }}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-display)', lineHeight: 0.85, color: 'var(--faction-ua-card-accent)', whiteSpace: 'nowrap' }}>
            {base}
            {!isPlain && (
              <>
                <span style={{ opacity: 0.55, margin: '0 var(--space-xs)' }}>×</span>
                {multiplierLabel}
              </>
            )}
            <span style={{ opacity: 0.55, margin: '0 var(--space-xs)' }}>+</span>
            {votePoints}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--faction-ua-card-body)', marginTop: 'var(--space-sm)' }}>
            {t('detail.ua.standing.pointsEarned')}
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: 'var(--space-lg)', borderLeft: '1px solid var(--faction-ua-rule)' }}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-display)', lineHeight: 0.85, color: 'var(--faction-ua-card-text)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: 'var(--text-content)', color: 'var(--faction-ua-card-accent)' }}>✦</span>
            {votes.total_votes}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--faction-ua-card-body)', marginTop: 'var(--space-sm)' }}>
            {t('detail.ua.standing.appraisal', { count: votes.total_votes })}
          </div>
        </div>
      </div>

      {/* Appraisers' ledger — each patron + the rung they gave (value / 5) */}
      {voters.length > 0 && (
        <>
          <div style={{ borderTop: '1px dashed var(--faction-ua-hair)', paddingTop: 'var(--space-lg)', fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--faction-ua-card-body)', marginBottom: 'var(--space-md)' }}>
            {t('detail.ua.standing.appraisedBy')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {voters.map((voter) => (
              <div key={voter.character_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <Link to={`/characters/${voter.character_id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'color-mix(in srgb, var(--faction-ua-panel) 28%, var(--faction-ua-card-bg))',
                      border: '1.5px solid var(--faction-ua-rule)',
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--faction-ua-card-accent)',
                    }}
                  >
                    {initials(voter.display_name)}
                  </span>
                </Link>
                <Link
                  to={`/characters/${voter.character_id}`}
                  style={{ width: 96, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: SERIF, fontSize: 'var(--text-lg)', color: 'var(--faction-ua-card-text)', textDecoration: 'none' }}
                >
                  {voter.display_name}
                </Link>
                <div style={{ flex: 1, height: 9, background: 'color-mix(in srgb, var(--faction-ua-panel) 20%, var(--faction-ua-card-bg))', border: '1px solid var(--faction-ua-hair)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(voter.value / 5) * 100}%`, background: 'var(--faction-ua-card-accent)', opacity: 0.9 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--faction-ua-card-accent)' }}>
                  {voter.value === 5 ? '✦' : `№${voter.value}`}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--faction-ua-rule)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
            <span style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faction-ua-card-body)' }}>
              {t('detail.ua.standing.patronsTotal', { count: voters.length })}
            </span>
            <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-title)', color: 'var(--faction-ua-card-accent)' }}>
              {t('detail.ua.standing.pts', { points: votes.total_score })}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default function UaPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes, voters } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at

  return (
    <div
      className="py-8 max-w-2xl"
      style={{
        position: 'relative',
        background: 'var(--faction-ua-card-bg)',
        // gilt salon double-frame: paper inset, then a thin gold line
        border: '1px solid var(--faction-ua-rule)',
        boxShadow: `0 16px 38px var(--color-overlay-medium),
                    inset 0 0 0 4px var(--faction-ua-card-bg),
                    inset 0 0 0 5px var(--faction-ua-hair)`,
        padding: 0,
      }}
    >
      {/* ── Header band — the acquisition sheet's letterhead ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-lg)',
          padding: 'var(--space-md) var(--space-xl)',
          borderBottom: '1px solid var(--faction-ua-hair)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--faction-ua-panel) 28%, var(--faction-ua-card-bg)), var(--faction-ua-card-bg))',
        }}
      >
        <Link
          to={`/tasks/${praxis.task_id}`}
          style={{
            fontFamily: REGALIA,
            fontSize: 'var(--text-base)',
            letterSpacing: '0.14em',
            color: 'var(--faction-ua-card-accent)',
            textDecoration: 'none',
          }}
        >
          {t('detail.ua.re', { task: praxis.task_title })}
        </Link>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 'var(--text-xs)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--faction-ua)',
            border: '1px solid var(--faction-ua-border)',
            padding: 'var(--space-xs) var(--space-sm)',
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

      <div style={{ padding: 'var(--space-2xl) var(--space-2xl) var(--space-2xl)' }}>
        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Eyebrow: grade · mode · sealed ── */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 'var(--text-xs)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--faction-ua-card-muted)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
            alignItems: 'center',
          }}
        >
          <span>{t('detail.ua.acquisitionGrade', { grade: praxis.task_level_required > 0 ? praxis.task_level_required : '—' })}</span>
          <span style={{ color: 'var(--faction-ua-rule)' }}>·</span>
          <span>{modeLabel(praxis.type, t)}</span>
          <span style={{ color: 'var(--faction-ua-rule)' }}>·</span>
          <span style={{ fontFamily: SERIF, fontSize: 'var(--text-md)', fontStyle: 'italic', letterSpacing: 0, textTransform: 'none', color: 'var(--faction-ua-card-body)' }}>
            {t('detail.ua.returnedToSalon', { date: formatTimestamp(sealedDate) })}
          </span>
        </div>

        {/* ── The headline ── */}
        <h1
          style={{
            fontFamily: DISPLAY,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 'var(--text-display)',
            lineHeight: 1.06,
            color: 'var(--faction-ua-card-text)',
            marginBottom: 'var(--space-lg)',
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
            gap: 'var(--space-lg)',
            paddingBottom: 'var(--space-xl)',
            marginBottom: 'var(--space-xl)',
            borderBottom: '1px solid var(--faction-ua-hair)',
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
                fontSize: 'var(--text-xl)',
                color: 'var(--faction-ua-card-text)',
                textDecoration: 'none',
              }}
            />
            <span
              style={{
                fontFamily: MONO,
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.06em',
                color: 'var(--faction-ua-card-muted)',
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
                fontSize: 'var(--text-heading)',
                lineHeight: 1,
                color: 'var(--faction-ua-card-accent)',
              }}
            >
              {praxis.task_point_value}
            </div>
            <div
              style={{
                fontFamily: REGALIA,
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.1em',
                color: 'var(--faction-ua-card-muted)',
                marginTop: 'var(--space-xs)',
              }}
            >
              {t('detail.ua.ptsAtStake')}
            </div>
          </div>
        </div>

        {/* ── The account (body) ── */}
        {praxis.body_text && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', margin: '0 0 var(--space-lg)' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--faction-ua-hair)' }} />
              <span style={{ fontFamily: REGALIA, fontSize: 'var(--text-sm)', letterSpacing: '0.22em', color: 'var(--faction-ua-card-accent)', whiteSpace: 'nowrap' }}>
                {t('detail.ua.theProcess')}
              </span>
              <div style={{ height: 1, flex: 1, background: 'var(--faction-ua-hair)' }} />
            </div>
            <MarkdownPreview
              source={praxis.body_text}
              className="markdown-preview content-text"
              style={{
                fontFamily: SERIF,
                lineHeight: 1.85,
                color: 'var(--faction-ua-card-body)',
              }}
            />
          </div>
        )}

        {/* ── The evidence — gilt-framed plate ── */}
        {praxis.media_items.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', margin: '0 0 var(--space-lg)' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--faction-ua-hair)' }} />
              <span style={{ fontFamily: REGALIA, fontSize: 'var(--text-sm)', letterSpacing: '0.22em', color: 'var(--faction-ua-card-accent)', whiteSpace: 'nowrap' }}>
                {t('detail.ua.thePlate', { count: praxis.media_items.length })}
              </span>
              <div style={{ height: 1, flex: 1, background: 'var(--faction-ua-hair)' }} />
            </div>
            {/* Sheet frame: sand outer, a neutral inner mat, then the gallery.
                Was a gilt double-frame; the gilt gradient died with the legacy
                family (#853) and gold now belongs to WOW. */}
            <div
              style={{
                padding: 'var(--space-sm)',
                background: 'var(--faction-ua-panel)',
                boxShadow: `0 10px 22px var(--color-overlay-medium),
                            inset 0 0 0 1px var(--faction-ua-hair)`,
              }}
            >
              <div
                style={{
                  padding: 'var(--space-xs)',
                  background: 'var(--faction-ua-rule)',
                }}
              >
                <div style={{ background: 'var(--faction-ua-card-bg)', padding: 'var(--space-sm)' }}>
                  <MediaGallery media={praxis.media_items} layout="grid" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── The Standing — points, appraisals & the salon ledger ── */}
        <TheStanding praxis={praxis} votes={votes} voters={voters} />

        {/* ── The Patronage (cast your appraisal) ── */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ marginBottom: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--faction-ua-hair)' }}>
            <span style={{ fontFamily: REGALIA, fontSize: 'var(--text-base)', letterSpacing: '0.2em', color: 'var(--faction-ua-card-accent)' }}>
              {t('detail.ua.patronage')}
            </span>
          </div>
          <VoteUI
            factionSlug={praxis.task_faction_slug}
            praxisId={praxis.id}
          />
        </div>

        {/* ── Flag block ── */}
        <PraxisFlagBlock state={state} />
      </div>
    </div>
  )
}
