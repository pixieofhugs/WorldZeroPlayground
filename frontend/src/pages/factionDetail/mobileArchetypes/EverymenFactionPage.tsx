import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from './shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * Everymen MOBILE faction page (#529) — the union hall, phone shaped. The same
 * single-column slots as the Default mobile faction page (a hero with real
 * member/task counts, top members, recent praxis, and the invite-gated Join
 * model via `state.membership`, ADR-0019) — only the dress changes: a red
 * masthead billboard with the cog seal, cream newsprint plates framed in ink,
 * knockout Bebas headings, gold seals. Grounds on the `--everymen-*` tokens;
 * flips with `[data-theme]`. Reuses the shared `mobile.*` faction copy so the
 * slot contract holds. Presentation-only — all data + the join handler arrive via
 * {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const INK = 'var(--everymen-ink)'
const CREAM = 'var(--everymen-cream)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** The Everymen cog seal — a riveted gear, the union's mark. */
function CogSeal({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <g fill={GOLD}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect key={deg} x="11" y="0.5" width="2" height="5" rx="0.5" transform={`rotate(${deg} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={GOLD} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={GOLD} />
    </svg>
  )
}

/** Square initials seal — gold face, red glyph, union ink border. */
function Seal({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        background: GOLD,
        border: `1.5px solid ${INK}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: ACCENT_FONT,
        // ornament: avatar monogram, sized from the seal it sits in — geometry, not text.
        fontSize: size * 0.5,
        color: RED,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-content)', letterSpacing: '0.04em', color: INK, whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 3, background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: ACCENT_FONT,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.08em',
  color: CREAM,
  background: RED,
  border: `2px solid ${INK}`,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  fontFamily: ACCENT_FONT,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.06em',
  color: MUTED,
  background: PAPER_DEEP,
  border: `1.5px solid ${INK}`,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

export default function EverymenFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div data-skin="everymen" className="py-4" style={{ fontFamily: BODY_FONT, color: INK, background: PAPER }} data-testid="mobile-faction-page">
      {/* Hero — union masthead billboard */}
      <section style={{ border: `3px solid ${INK}`, background: RED, color: CREAM, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', background: INK, color: GOLD, padding: 'var(--space-sm) var(--space-lg)' }}>
          <CogSeal size={16} />
          <span style={{ ...kicker, color: CREAM }}>{t('everymen.mobile.eyebrow')}</span>
        </div>
        <div style={{ height: 4, background: GOLD }} />
        <div style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
          <h1
            style={{
              fontFamily: ACCENT_FONT,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead display type — the sign-painted title is the skin's identity (§4/§270).
              fontSize: 40,
              lineHeight: 0.92,
              letterSpacing: '0.01em',
              color: CREAM,
              textShadow: `2px 2px 0 ${INK}`,
              margin: 0,
            }}
          >
            {name}
          </h1>
          <p className="content-text" style={{ fontFamily: BODY_FONT, lineHeight: 1.6, color: CREAM, margin: 'var(--space-md) 0 0' }}>
            {factionDescription(faction.slug)}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <HeroStat value={members.length} label={t('mobile.membersStat')} />
            <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 'var(--space-md)', color: RED }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: BODY_FONT, color: MUTED, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: BODY_FONT, color: MUTED, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {(membership.state === 'gate' || membership.state === 'burned') && (
        <p className="content-text" style={{ fontFamily: BODY_FONT, color: MUTED, marginTop: 'var(--space-xl)' }}>
          {membership.state === 'burned'
            ? t('mobile.burnedHint', { faction: name })
            : t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: BODY_FONT, color: RED }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: BODY_FONT, color: INK }}>
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: INK, border: `1.5px solid ${GOLD}`, padding: 'var(--space-md) var(--space-sm)' }}>
      <b className="content-title" style={{ fontFamily: ACCENT_FONT, display: 'block', lineHeight: 0.9, color: GOLD }}>
        {value}
      </b>
      <span style={{ ...kicker, marginTop: 'var(--space-xs)', display: 'block', color: CREAM }}>{label}</span>
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
        background: PAPER,
        border: `2px solid ${INK}`,
        borderLeft: `5px solid ${RED}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: ACCENT_FONT, fontSize: 'var(--text-xl)', color: RED, width: 16, flex: 'none' }}>{rank}</span>
      <Seal name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: ACCENT_FONT,
          letterSpacing: '0.02em',
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ ...kicker, flex: 'none', color: RED }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
