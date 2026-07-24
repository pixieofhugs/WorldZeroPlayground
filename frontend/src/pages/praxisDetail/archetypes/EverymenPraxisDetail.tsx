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

const POSTER = 'var(--font-accent)' // Bebas Neue
const BODY = 'var(--font-body)'
const STRIPE = 'repeating-linear-gradient(90deg, var(--everymen-red) 0 16px, var(--everymen-gold) 16px 26px)'

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', margin: 'var(--space-xl) 0 var(--space-lg)' }}>
      <h2
        style={{
          fontFamily: POSTER,
          fontSize: 'var(--text-title)',
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
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const modeLabel = praxis.type === 'collab' ? t('detail.everymen.mode.collab') : t('detail.everymen.mode.solo')

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
          gap: 'var(--space-md)',
          padding: 'var(--space-md) var(--space-xl)',
        }}
      >
        <span style={{ fontFamily: POSTER, fontSize: 'var(--text-title)', letterSpacing: '0.08em', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {t('detail.everymen.workReportFiled')}
        </span>
        <span style={{ fontFamily: BODY, fontSize: 'var(--text-sm)', letterSpacing: '0.12em', textAlign: 'right' }}>
          {modeLabel}
        </span>
      </div>
      {/* red→gold stripe rule */}
      <div style={{ height: 4, background: STRIPE }} />

      <div style={{ padding: 'var(--space-xl) var(--space-2xl) var(--space-2xl)' }}>
        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── Identity / status strip ── */}
        <div style={{ fontSize: 'var(--text-sm)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--everymen-muted)', marginBottom: 'var(--space-xs)' }}>
          <Link to={`/tasks/${praxis.task_id}`} style={{ color: 'var(--everymen-muted)', textDecoration: 'none' }}>
            {t('detail.everymen.re', { task: praxis.task_title })}
          </Link>
          {' · '}{t('detail.everymen.lvl', { level: praxis.task_level_required })}
          {' · '}{t('detail.everymen.sealed', { date: formatTimestamp(sealedDate) })}
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
                  padding: 'var(--space-xs) var(--space-sm)',
                }}
              >
                {t('detail.everymen.flagged')}
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--everymen-red)', marginBottom: 'var(--space-sm)' }}>
          {t('detail.everymen.theJobDone')}
        </div>

        {/* ── Poster headline ── */}
        <h1
          style={{
            fontFamily: POSTER,
            fontWeight: 400,
            fontSize: 'var(--text-display)',
            lineHeight: 0.98,
            letterSpacing: '0.01em',
            margin: 0,
            color: 'var(--everymen-paper-text)',
          }}
        >
          {praxis.title || t('detail.everymen.untitled')}
        </h1>

        {/* ── Owner actions ── */}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <PraxisOwnerActions state={state} />
        </div>

        {/* ── Actor-scoped byline + base points ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            paddingTop: 'var(--space-lg)',
            marginTop: 'var(--space-lg)',
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
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: POSTER,
                fontSize: 'var(--text-title)',
                color: 'var(--everymen-paper-text)',
                lineHeight: 1,
                textDecoration: 'none',
              }}
            />
            <div style={{ fontSize: 'var(--text-sm)', letterSpacing: '0.06em', color: 'var(--everymen-muted)', marginTop: 'var(--space-xs)' }}>
              {praxis.type === 'collab' ? t('detail.everymen.hands.collab') : t('detail.everymen.hands.solo')}
            </div>
          </div>
          {/* base points from the task */}
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: POSTER, fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--everymen-red)' }}>
              ★ {praxis.task_point_value}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--everymen-muted)', marginTop: 'var(--space-xs)' }}>
              {t('detail.everymen.basePoints')}
            </div>
          </div>
        </div>

        {/* ── Metatask seals (#932) — read-only stack, below the byline/points
            block, above the proof-of-work plates. Each seal keeps its issuing
            faction's voice, not Everymen's; an empty stack renders nothing. ── */}
        {praxis.applied_metatasks.length > 0 && (
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <MetaTaskSeal metatasks={praxis.applied_metatasks} />
          </div>
        )}

        {/* ── The report (account body) ── */}
        {praxis.body_text && (
          <>
            <SectionHead>{t('detail.everymen.theWork')}</SectionHead>
            <MarkdownPreview
              source={praxis.body_text}
              className="markdown-preview content-text"
              style={{
                fontFamily: BODY,
                lineHeight: 1.7,
                color: 'var(--everymen-paper-text)',
              }}
            />
          </>
        )}

        {/* ── Proof of work (evidence) ── */}
        {praxis.media_items.length > 0 && (
          <>
            <SectionHead>
              {t('detail.everymen.proofOfWork', { count: praxis.media_items.length })}
            </SectionHead>
            <div
              style={{
                border: '1.5px solid var(--everymen-ink)',
                background: 'var(--everymen-cream)',
                boxShadow: '3px 4px 0 color-mix(in srgb, var(--everymen-ink) 18%, transparent)',
                padding: 'var(--space-md)',
              }}
            >
              <MediaGallery media={praxis.media_items} layout="grid" />
            </div>
          </>
        )}

        {/* ── The crew's marks (vote caster) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 'var(--space-xl) 0 var(--space-lg)', gap: 'var(--space-lg)' }}>
          <h2 style={{ fontFamily: POSTER, fontSize: 'var(--text-title)', letterSpacing: '0.04em', margin: 0, color: 'var(--everymen-paper-text)', whiteSpace: 'nowrap' }}>
            {t('detail.everymen.crewsMarks')}
          </h2>
          {/* earned-points breakdown (#641) */}
          <div style={{ flexShrink: 0 }}>
            <PraxisScoreBreakdown state={state} align="right" accent="var(--everymen-red)" muted="var(--everymen-muted)" font={POSTER} />
          </div>
        </div>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
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
