import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from './shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * Singularity MOBILE faction page (#526) — the dark terminal, phone shaped. The
 * same single-column slots as the Default mobile faction page (a hero with real
 * member/task counts, primary nodes, recent praxis, and the invite-gated Join
 * model via `state.membership`, ADR-0019) — only the dress changes: bracketed
 * readout panels, `>`-prompts, phosphor-green text on a void field.
 *
 * Always-dark: every colour resolves to a theme-identical --faction-singularity-*
 * token; the skin paints its own void field and never mutates data-theme. Reuses
 * the shared `mobile.*` faction copy so the slot contract holds. Presentation-only
 * — all data + the join handler arrive via {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const VOID = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const SIGNAL = 'var(--faction-singularity-card-muted)'
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
// The credits accent: a GOLD SCALAR, not a rainbow. It read the retired brand
// palette's first stop until #1220 (ADR-0066) pointed it at the token that
// actually means "the spectrum's yellow as an ink". Consequence to know: the
// brand palette was theme-invariant and this one is not, so the accent now
// deepens in light (7.0:1 on the terminal black) and lifts in dark (10.0:1).
// If Singularity's credits panel ever wants its own gold, that is a
// --faction-singularity-* token, not a brand one.
const AMBER = 'var(--faction-default-gold)'
const FONT = 'var(--font-faction-terminal)'

const phosphor = (pct: number): string => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`
const signal = (pct: number): string => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: FONT,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: signal(60),
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** Signal-ringed initials node glyph. */
function NodeGlyph({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: signal(14),
        border: `1px solid ${BORDER_HARD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        // ornament: avatar monogram, sized from the node it sits in — geometry, not text.
        fontSize: size * 0.36,
        color: SIGNAL,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontFamily: FONT, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: PHOSPHOR }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: signal(30) }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: FONT,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: VOID,
  background: PHOSPHOR,
  border: `1px solid ${PHOSPHOR}`,
  padding: 'var(--space-md) var(--space-lg)',
  boxShadow: `0 0 16px ${phosphor(30)}`,
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  fontFamily: FONT,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: signal(60),
  background: 'transparent',
  border: `1px solid ${signal(38)}`,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

export default function SingularityFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div data-skin="singularity" className="py-4" style={{ fontFamily: FONT, color: PHOSPHOR, background: VOID }} data-testid="mobile-faction-page">
      {/* Hero — bracketed readout masthead */}
      <section style={{ position: 'relative', overflow: 'hidden', background: VOID, border: `1px solid ${BORDER_HARD}`, padding: 'var(--space-xl) var(--space-lg)' }}>
        <div
          aria-hidden
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `repeating-linear-gradient(to bottom, transparent, transparent 2px, ${phosphor(1.2)} 2px, ${phosphor(1.2)} 4px)` }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ ...kicker, color: PHOSPHOR }}>{t('singularity.mobile.eyebrow')}</div>
          <h1
            style={{
              fontFamily: FONT,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead display type — the terminal banner is the skin's identity (§4/§270).
              fontSize: 26,
              lineHeight: 1.05,
              color: PHOSPHOR,
              letterSpacing: '0.03em',
              margin: 'var(--space-sm) 0 0',
            }}
          >
            {'> '}
            {name}
          </h1>
          <p className="content-text" style={{ fontFamily: FONT, lineHeight: 1.7, color: phosphor(60), margin: 'var(--space-md) 0 0' }}>
            {factionDescription(faction.slug)}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <HeroStat value={members.length} label={t('mobile.membersStat')} />
            <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 'var(--space-md)', color: AMBER }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Primary nodes */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: FONT, color: phosphor(50), margin: 0 }}>{t('mobile.membersEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topMembers.map((m, index) => (
              <MemberRow key={m.id} rank={index + 1} member={m} />
            ))}
          </div>
        )}
      </section>

      {/* Recent praxis */}
      <section className="mt-6">
        <SectionHead>{t('mobile.recentPraxis')}</SectionHead>
        {recentPraxis.length === 0 ? (
          <p className="content-text" style={{ fontFamily: FONT, color: phosphor(50), margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: FONT, color: phosphor(55), marginTop: 'var(--space-xl)' }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: FONT, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: FONT, lineHeight: 1.6, color: phosphor(72) }}>
                {switching
                  ? t('detail.join.confirmSwitch', { faction: name, current: factionName(currentSlug) })
                  : t('detail.join.confirm', { faction: name })}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  onClick={() => void membership.join()}
                  disabled={membership.joining}
                  style={{ ...joinButton, flex: 1, opacity: membership.joining ? 0.6 : 1 }}
                >
                  {membership.joining ? t('mobile.joining') : t('mobile.confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={membership.joining}
                  style={cancelButton}
                >
                  {t('detail.join.cancel')}
                </button>
              </div>
            </>
          )}
        </MobileStickyBar>
      )}
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ flex: '1 1 0', textAlign: 'center', background: signal(8), border: `1px solid ${signal(28)}`, padding: 'var(--space-md) var(--space-sm)' }}>
      <b className="content-title" style={{ fontFamily: FONT, display: 'block', lineHeight: 1, color: PHOSPHOR }}>
        {value}
      </b>
      <span style={{ ...kicker, marginTop: 'var(--space-xs)', display: 'block' }}>{label}</span>
    </div>
  )
}

function MemberRow({ rank, member }: { rank: number; member: CharacterOut }) {
  const { t } = useTranslation('factions')
  return (
    <Link
      to={`/characters/${member.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) var(--space-lg)',
        background: VOID,
        border: `1px solid ${signal(38)}`,
        borderLeft: `3px solid ${PHOSPHOR}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: FONT, fontSize: 'var(--text-xl)', color: SIGNAL, width: 16, flex: 'none' }}>{rank}</span>
      <NodeGlyph name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: FONT,
          color: PHOSPHOR,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 'var(--text-sm)', letterSpacing: '0.04em', color: AMBER, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
