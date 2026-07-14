/**
 * Warriors of Whimsy praxis-read archetype — the sealed praxis rendered as a
 * "praxis.exe" desktop window: pink computer-witch chrome with a traffic-light
 * title bar, a dotted desktop body, Caveat-script "finding" headline, sparkle
 * charms, dotted-running-rule section dividers, and a window-framed evidence
 * shelf. Ported visually from the WoW praxis design kit (Warriors of Whimsy
 * Praxis.html / whimsy-exe.jsx); wired to the real {@link PraxisDetailState}.
 *
 * Invariant behavior slots (admin bar, banners, owner actions, flag) come from
 * the shared module — this archetype owns only presentation. WoW flips with the
 * theme normally, so every color reads from --faction-wow* tokens (light + dark
 * already defined in index.css). No document-theme mutation, no hardcoded hex.
 * The author byline themes to the AUTHOR's faction, not the task's.
 */
import type { CSSProperties } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import MediaGallery from '../../../components/MediaGallery'
import WowVote from '../../../components/vote/WowVote'
import { factionCssVar } from '../../../utils/factions'
import { formatTimestamp } from '../../../utils/dates'
import { PraxisAdminBar, PraxisStatusBanners, PraxisOwnerActions, PraxisFlagBlock, PraxisVoterBreakdown, MemberByline } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

// ── whimsy.exe token vocabulary (same as WowTaskDetail) ──────────────────────
const PINK = 'var(--faction-wow)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const WIN_BORDER = 'var(--faction-wow-win-border)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const DOT = 'var(--faction-wow-dot)'
const SCRIPT = 'var(--faction-wow-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime
const ON_ACCENT = 'var(--color-text-on-accent)'

/** Party-voiced label for the filing mode. A duel side is a solo praxis
 * (ADR-0011) — its duel context is shown by the shared DuelCrossLink, not here. */
function modeVoice(type: string, t: TFunction<'praxis'>): string {
  if (type === 'collab') return t('detail.wow.mode.collab')
  return t('detail.wow.mode.solo')
}

/** Sparkle charm — the kit's signature four-point star. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  )
}

/** Dotted section divider with a centered sparkle + uppercase label. */
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
      <span style={{ flex: 1, height: 0, borderTop: `2px dotted var(--faction-wow-border)` }} />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: BODY,
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: CARD_MUTED,
          whiteSpace: 'nowrap',
        }}
      >
        <Sparkle size={9} color={PINK} /> {label}
      </span>
      <span style={{ flex: 1, height: 0, borderTop: `2px dotted var(--faction-wow-border)` }} />
    </div>
  )
}

/** Pink window title bar — traffic lights + a sparkle-prefixed window name. */
function TitleBar({ name }: { name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 14px',
        background: `linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))`,
        borderBottom: `2px solid ${WIN_BORDER}`,
      }}
    >
      {['var(--faction-wow-scrap-deep)', 'var(--faction-wow-tape)', 'var(--faction-wow-ivy-leaf)'].map((lightColor) => (
        <span
          key={lightColor}
          style={{
            width: 11,
            height: 11,
            borderRadius: '50%',
            background: lightColor,
            border: '1.4px solid rgba(255,255,255,0.7)',
          }}
        />
      ))}
      <span
        style={{
          marginLeft: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: SCRIPT,
          fontSize: 20,
          color: TITLE_TEXT,
          letterSpacing: '0.03em',
        }}
      >
        <Sparkle size={11} color={TITLE_TEXT} /> {name}
      </span>
    </div>
  )
}

export default function WowPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes } = state
  if (!praxis) return null

  const sealedDate = praxis.submitted_at ?? praxis.created_at

  /** Soft rounded status pill shared across the chrome. */
  const pill: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 8.5,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '5px 11px',
    borderRadius: 20,
    background: 'var(--faction-wow-light)',
    color: CARD_TEXT,
    border: `1px solid var(--faction-wow-border)`,
    whiteSpace: 'nowrap',
  }

  return (
    <div className="py-8" style={{ fontFamily: BODY, color: CARD_TEXT }}>
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Behavior slots (invariant — from shared module) ── */}
        <PraxisAdminBar state={state} />
        <PraxisStatusBanners state={state} />

        {/* ── The praxis.exe window ── */}
        <div
          style={{
            position: 'relative',
            borderRadius: 14,
            overflow: 'hidden',
            border: `2px solid ${WIN_BORDER}`,
            boxShadow: `0 14px 34px color-mix(in srgb, ${PINK} 30%, transparent)`,
          }}
        >
          <TitleBar name={t('detail.wow.windows.praxis')} />

          {/* desktop body — dotted grid */}
          <div
            style={{
              position: 'relative',
              padding: '26px 30px 30px',
              background: NOTEPAD_BG,
              backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
              backgroundSize: '15px 15px',
            }}
          >
            <Sparkle
              size={20}
              color="var(--faction-wow-tape)"
              style={{ position: 'absolute', top: 18, right: 22, transform: 'rotate(10deg)' }}
            />

            {/* ── 1 · status row: sealed · mode · re:task · level · moderation ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 18 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: `linear-gradient(180deg, ${PINK}, ${CARD_MUTED})`,
                  color: ON_ACCENT,
                  fontSize: 8.5,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontWeight: 700,
                  boxShadow: `0 3px 8px var(--faction-wow-light)`,
                }}
              >
                <Sparkle size={10} color={ON_ACCENT} /> sealed
              </span>
              <span style={pill}>{modeVoice(praxis.type, t)}</span>
              <span style={{ fontSize: 9.5, color: CARD_MUTED, letterSpacing: '0.04em' }}>
                {t('detail.wow.re')}{' '}
                <Link
                  to={`/tasks/${praxis.task_id}`}
                  style={{ color: TITLE_TEXT, fontWeight: 700, textDecoration: 'none' }}
                >
                  {praxis.task_title}
                </Link>{' '}
                {t('detail.wow.lvlSealed', { level: praxis.task_level_required, date: formatTimestamp(sealedDate) })}
              </span>
              {praxis.moderation_status === 'flagged' && (
                <span
                  style={{
                    ...pill,
                    color: 'var(--color-danger)',
                    borderColor: 'var(--color-danger)',
                    background: 'transparent',
                  }}
                >
                  {t('detail.wow.flagged')}
                </span>
              )}
            </div>

            {/* ── 1 · the finding headline ── */}
            <div
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: CARD_MUTED,
                marginBottom: 8,
              }}
            >
              {t('detail.wow.theFinding')}
            </div>
            <h1
              style={{
                fontFamily: SCRIPT,
                fontWeight: 700,
                fontSize: 46,
                lineHeight: 1.12,
                margin: 0,
                color: TITLE_TEXT,
                overflowWrap: 'anywhere',
              }}
            >
              {praxis.title ?? t('detail.wow.untitled')}
            </h1>

            {/* ── Owner actions (invariant) ── */}
            <div style={{ marginTop: 16 }}>
              <PraxisOwnerActions state={state} />
            </div>

            {/* ── 2 · author byline (themed to AUTHOR faction) + 6 · points earned ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingTop: 18,
                marginTop: 18,
                borderTop: `2px dotted var(--faction-wow-border)`,
              }}
            >
              <Link to={`/characters/${praxis.created_by_id}`} style={{ flexShrink: 0 }}>
                <span
                  style={{
                    display: 'flex',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(150deg, ${factionCssVar(praxis.created_by_faction_slug, 'card-accent')}, ${factionCssVar(praxis.created_by_faction_slug, 'card-bg')})`,
                    border: `1.5px solid ${WIN_BORDER}`,
                    color: ON_ACCENT,
                    fontFamily: SCRIPT,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {(praxis.created_by_display_name || '?')[0]?.toUpperCase()}
                </span>
              </Link>
              <div style={{ lineHeight: 1.4, minWidth: 0 }}>
                <MemberByline
                  praxis={praxis}
                  linkStyle={{
                    fontFamily: SCRIPT,
                    fontSize: 22,
                    color: TITLE_TEXT,
                    lineHeight: 1,
                    textDecoration: 'none',
                  }}
                />
                <div
                  style={{ fontSize: 9, color: CARD_MUTED, letterSpacing: '0.06em', marginTop: 2 }}
                >
                  {t('detail.wow.witchWhoCast')}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: SCRIPT, fontSize: 30, lineHeight: 1, color: PINK }}>
                  ◆ {praxis.task_point_value}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: CARD_MUTED,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginTop: 3,
                  }}
                >
                  {t('detail.wow.basePoints')}
                </div>
              </div>
            </div>

            {/* ── 3 · the account (body text) ── */}
            {praxis.body_text && (
              <>
                <Divider label={t('detail.wow.whatIDid')} />
                <div
                  className="markdown-preview"
                  style={{ fontFamily: BODY, fontSize: 12, lineHeight: 1.75, color: CARD_TEXT }}
                >
                  <ReactMarkdown>{praxis.body_text}</ReactMarkdown>
                </div>
              </>
            )}

            {/* ── 4 · the evidence (media) — window-framed shelf ── */}
            {praxis.media_items.length > 0 && (
              <>
                <Divider
                  label={t('detail.wow.keepsakes', { count: praxis.media_items.length })}
                />
                <div
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: `2px solid ${NOTEPAD_BORDER}`,
                    boxShadow: `0 6px 16px color-mix(in srgb, ${PINK} 18%, transparent)`,
                  }}
                >
                  <TitleBar name={t('detail.wow.windows.keepsakes')} />
                  <div
                    style={{
                      padding: 12,
                      background: NOTEPAD_BG,
                      backgroundImage: `radial-gradient(${DOT} 1.3px, transparent 1.3px)`,
                      backgroundSize: '13px 13px',
                    }}
                  >
                    <MediaGallery media={praxis.media_items} layout="grid" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 5 · vote caster + 6 · points from votes — hearts.exe window ── */}
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            border: `2px solid ${WIN_BORDER}`,
            boxShadow: `0 10px 26px color-mix(in srgb, ${PINK} 26%, transparent)`,
          }}
        >
          <TitleBar name={t('detail.wow.windows.hearts')} />
          <div
            style={{
              padding: '20px 24px 22px',
              background: NOTEPAD_BG,
              backgroundImage: `radial-gradient(${DOT} 1.3px, transparent 1.3px)`,
              backgroundSize: '13px 13px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: SCRIPT,
                  fontSize: 24,
                  color: TITLE_TEXT,
                }}
              >
                <Sparkle size={14} color={PINK} /> {t('detail.wow.sendLove')}
              </span>
              {votes && votes.total_votes > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: SCRIPT, fontSize: 26, color: PINK, lineHeight: 1 }}>
                    +{votes.total_score}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      color: CARD_MUTED,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginLeft: 6,
                    }}
                  >
                    {t('detail.wow.pointsFromVotes')}
                  </span>
                </div>
              )}
            </div>
            <WowVote
              praxisId={praxis.id}
              points={votes?.total_score}
              totalVotes={votes?.total_votes}
              mode="caster"
            />
          </div>
        </div>

        {/* ── 7 · flag block (invariant) ── */}
        <PraxisFlagBlock state={state} />

        <PraxisVoterBreakdown state={state} />
      </div>
    </div>
  )
}
