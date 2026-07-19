/**
 * The Singularity praxis-read page archetype.
 *
 * Built from the Singularity canon: the TERMINAL PRINTOUT — continuous-feed
 * paper with sprocket holes, scanlines, corner brackets, a blinking cursor, and
 * the signal-trace running head. A SEALED praxis is a filed protocol the faction
 * now casts signals on; the 1-5 vote is THE CONSENSUS ARRAY.
 *
 * Singularity is ALWAYS-DARK — its --faction-singularity-* tokens hold identical
 * terminal values in both themes, so this archetype styles its own container with
 * those tokens and NEVER mutates document theme. No hardcoded hex: every colour
 * is a --faction-singularity-* token or a color-mix / rgba overlay derived from
 * one. Actor-scoped byline themes to the AUTHOR's faction, not the task's.
 *
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation.
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

// ── Terminal atoms (presentation only — no shared behavior) ──────────────────

/** Continuous-feed sprocket strip — the printout's torn-edge perforation. */
function Sprockets({ position }: { position: 'top' | 'bottom' }) {
  const border =
    position === 'top'
      ? { borderBottom: '1px solid var(--faction-singularity-border-hard)' }
      : { borderTop: '1px solid var(--faction-singularity-border-hard)' }
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-xs) var(--space-md)',
        background: 'color-mix(in srgb, var(--faction-singularity-card-muted) 10%, transparent)',
        ...border,
      }}
    >
      {Array.from({ length: 14 }).map((_, sprocketIndex) => (
        <span
          key={sprocketIndex}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--faction-singularity-card-bg)',
            border: '1px solid color-mix(in srgb, var(--faction-singularity-card-muted) 45%, transparent)',
          }}
        />
      ))}
    </div>
  )
}

/** A labelled section rule — `> LABEL ─────────`. */
function SgDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', margin: 'var(--space-xl) 0 var(--space-md)' }}>
      <span
        style={{
          fontFamily: 'var(--font-faction-terminal)',
          fontSize: 'var(--text-xs)',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'color-mix(in srgb, var(--faction-singularity-card-accent) 55%, transparent)',
          whiteSpace: 'nowrap',
        }}
      >
        {'> '}{label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'color-mix(in srgb, var(--faction-singularity-card-muted) 28%, transparent)',
        }}
      />
    </div>
  )
}

export default function SingularityPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at
  const grade = praxis.task_level_required > 0 ? praxis.task_level_required : '—'
  const instance =
    praxis.type === 'solo'
      ? t('detail.singularity.instance.solo')
      : praxis.type === 'collab'
      ? t('detail.singularity.instance.collab')
      : t('detail.singularity.instance.duel')

  return (
    <div
      className="py-8 max-w-2xl"
      style={{
        position: 'relative',
        fontFamily: 'var(--font-faction-terminal)',
        color: 'var(--faction-singularity-card-text)',
        background: 'var(--faction-singularity-card-bg)',
        border: '1px solid var(--faction-singularity-border-hard)',
        boxShadow:
          '0 0 0 1px color-mix(in srgb, var(--faction-singularity-card-muted) 12%, transparent), 0 0 40px -20px color-mix(in srgb, var(--faction-singularity-card-accent) 30%, transparent)',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      {/* Scanline overlay — phosphor-green stripes, multiply-soft, never interactive */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0 2px, rgba(74,222,128,0.025) 2px 4px)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* ── Top perforation ── */}
        <Sprockets position="top" />

        {/* ── Signal-trace running head ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            flexWrap: 'wrap',
            padding: 'var(--space-md) var(--space-xl)',
            borderBottom: '1px solid color-mix(in srgb, var(--faction-singularity-card-muted) 28%, transparent)',
            background: 'color-mix(in srgb, var(--faction-singularity-card-accent) 3%, transparent)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-sm)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--faction-singularity-card-muted)',
            }}
          >
            {t('detail.singularity.sealedProtocol')}
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.12em',
              color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 55%, transparent)',
            }}
          >
            {t('detail.singularity.signalTrace', { date: formatTimestamp(sealedDate) })}
          </span>
        </div>

        <div style={{ padding: 'var(--space-xl) var(--space-xl) var(--space-2xl)' }}>
          {/* ── Behavior slots (invariant — from shared module) ── */}
          <PraxisAdminBar state={state} />
          <PraxisStatusBanners state={state} />

          {/* ── Status line — identity + moderation ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                background: 'var(--faction-singularity-card-accent)',
                color: 'var(--faction-singularity-card-bg)',
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: 'var(--space-xs) var(--space-md)',
                fontWeight: 700,
              }}
            >
              ● {t('detail.singularity.sealed')}
            </span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-xs) var(--space-md)',
                border: '1px solid color-mix(in srgb, var(--faction-singularity-card-muted) 40%, transparent)',
                color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 80%, transparent)',
                letterSpacing: '0.14em',
              }}
            >
              {instance}
            </span>
            <Link
              to={`/tasks/${praxis.task_id}`}
              style={{
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.08em',
                textDecoration: 'none',
                color: 'color-mix(in srgb, var(--faction-singularity-card-accent) 65%, transparent)',
              }}
            >
              {t('detail.singularity.re', { task: praxis.task_title })}
            </Link>
            <span style={{ color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 35%, transparent)', fontSize: 'var(--text-xs)' }}>·</span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.1em',
                color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 60%, transparent)',
              }}
            >
              {t('detail.singularity.gradeCredits', { grade, points: praxis.task_point_value })}
            </span>
            {praxis.moderation_status === 'flagged' && (
              <>
                <span style={{ color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 35%, transparent)', fontSize: 'var(--text-xs)' }}>·</span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger)',
                    padding: 'var(--space-xs) var(--space-sm)',
                  }}
                >
                  {t('detail.singularity.flagged')}
                </span>
              </>
            )}
          </div>

          {/* ── Output headline ── */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.2em',
                marginBottom: 'var(--space-sm)',
                color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 55%, transparent)',
              }}
            >
              {t('detail.singularity.output')}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-faction-terminal)',
                fontWeight: 700,
                fontSize: 'var(--text-heading)',
                lineHeight: 1.08,
                letterSpacing: '0.02em',
                margin: 0,
                color: 'var(--faction-singularity-card-accent)',
              }}
            >
              {praxis.title ?? t('detail.singularity.untitled')}
              <span
                className="sg-blink"
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 30,
                  marginLeft: 'var(--space-sm)',
                  verticalAlign: 'middle',
                  background: 'var(--faction-singularity-card-accent)',
                }}
              />
            </h1>
          </div>

          {/* ── Owner actions ── */}
          <PraxisOwnerActions state={state} />

          {/* ── Actor-scoped byline — themed to AUTHOR's faction ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              paddingBottom: 'var(--space-lg)',
              marginBottom: 'var(--space-sm)',
              borderBottom: '1px dashed color-mix(in srgb, var(--faction-singularity-card-muted) 28%, transparent)',
            }}
          >
            <Link to={`/characters/${praxis.created_by_id}`}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-base)',
                  letterSpacing: '0.06em',
                  color: 'var(--faction-singularity-card-muted)',
                  background: `color-mix(in srgb, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')} 20%, var(--faction-singularity-card-bg))`,
                  border: `1px solid ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}`,
                }}
              >
                N
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
              <MemberByline
                praxis={praxis}
                linkStyle={{
                  fontSize: 'var(--text-lg)',
                  textDecoration: 'none',
                  color: 'var(--faction-singularity-card-accent)',
                }}
                renderName={(name) => `NODE_${name}`}
              />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.06em',
                  color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 50%, transparent)',
                }}
              >
                {t('detail.singularity.instanceLabel', { instance: instance.toLowerCase() })}
              </span>
            </div>
            {/* Base point value from task */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="content-title" style={{ lineHeight: 1, color: 'var(--faction-singularity-card-accent)' }}>
                {praxis.task_point_value}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.12em',
                  marginTop: 'var(--space-xs)',
                  color: 'color-mix(in srgb, var(--faction-singularity-card-muted) 50%, transparent)',
                }}
              >
                {t('detail.singularity.baseCredits')}
              </div>
            </div>
          </div>

          {/* ── The account body → PROCESS_LOG ── */}
          {praxis.body_text && (
            <>
              <SgDivider label={t('detail.singularity.processLog')} />
              <MarkdownPreview
                source={praxis.body_text}
                className="markdown-preview content-text"
                style={{
                  lineHeight: 1.75,
                  color: 'color-mix(in srgb, var(--faction-singularity-card-accent) 78%, transparent)',
                  marginBottom: 'var(--space-sm)',
                }}
              />
            </>
          )}

          {/* ── Evidence → ARTIFACTS, terminal-framed ── */}
          {praxis.media_items.length > 0 && (
            <>
              <SgDivider
                label={t('detail.singularity.artifacts', { count: praxis.media_items.length })}
              />
              <div
                style={{
                  border: '1px solid color-mix(in srgb, var(--faction-singularity-card-muted) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--faction-singularity-card-muted) 6%, transparent)',
                  padding: 'var(--space-md)',
                }}
              >
                <MediaGallery media={praxis.media_items} layout="grid" />
              </div>
            </>
          )}

          {/* ── The consensus array (vote caster) ── */}
          <SgDivider label={t('detail.singularity.consensusArray')} />
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <PraxisScoreBreakdown
                state={state}
                align="right"
                accent="var(--faction-singularity-card-accent)"
                muted="color-mix(in srgb, var(--faction-singularity-card-muted) 55%, transparent)"
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
        </div>

        {/* ── Bottom perforation ── */}
        <Sprockets position="bottom" />
      </div>
    </div>
  )
}
