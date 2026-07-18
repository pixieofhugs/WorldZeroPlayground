import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { EphemeristsSigil } from '../../../components/cards/ephemeristsAtoms'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * The Ephemerists MOBILE faction page (#527) — the codex, phone shaped. The same
 * single-column slots as the Default mobile faction page (a hero with real
 * member/task counts, top keepers, recent praxis, and the invite-gated Join model
 * via `state.membership`, ADR-0019) — only the dress changes: ledger-ruled vellum
 * leaves in gold-deep hairlines, Cinzel labels, lapis-inked keepers. Grounds on
 * the `--eph-*` tokens; theme-aware through the cascade. Reuses the shared
 * `mobile.*` faction copy so the slot contract holds. Presentation-only — all
 * data + the join handler arrive via {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const LAPIS = 'var(--eph-lapis)'
const INK = 'var(--eph-ink)'
const GOLD = 'var(--eph-gold)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const PARCHMENT = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'
const SCRIPT = 'var(--eph-script)'

const kicker: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** Circular initials medallion — vellum face, rubric Cinzel glyph. */
function Medallion({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: VELLUM_DEEP,
        border: `1px solid ${GOLD_DEEP}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: DISPLAY,
        fontWeight: 700,
        // ornament: avatar monogram, sized from the circle it sits in — geometry, not text.
        fontSize: size * 0.42,
        color: RUBRIC,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontFamily: DISPLAY, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: PARCHMENT,
  background: INK,
  border: `1px solid ${GOLD}`,
  padding: '13px 16px',
  cursor: 'pointer',
}

export default function EphemeristsFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div data-skin="ephemerists" className="py-4" style={{ fontFamily: SERIF, color: TEXT, background: VELLUM_DEEP }} data-testid="mobile-faction-page">
      {/* Hero — ledger-ruled vellum masthead */}
      <section style={{ position: 'relative', overflow: 'hidden', background: VELLUM, border: `1.5px solid ${INK}`, boxShadow: '0 12px 28px rgba(42,29,18,0.18)', padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: RUBRIC }}>
          <EphemeristsSigil size={13} color={LAPIS} />
          <span style={{ ...kicker, color: LAPIS }}>{t('ephemerists.mobile.eyebrow')}</span>
        </div>
        {/* ornament: masthead display type — the illuminated title is the skin's identity (§4/§270). */}
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, lineHeight: 1.05, color: TEXT, margin: '4px 0 0' }}>
          {name}
        </h1>
        <p className="content-text" style={{ fontFamily: SCRIPT, fontStyle: 'italic', lineHeight: 1.6, color: MUTED, margin: '8px 0 0' }}>
          {factionDescription(faction.slug)}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
          <HeroStat value={members.length} label={t('mobile.membersStat')} />
          <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 12, color: RUBRIC }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top keepers */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SCRIPT, fontStyle: 'italic', color: MUTED, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: SCRIPT, fontStyle: 'italic', color: MUTED, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: SCRIPT, fontStyle: 'italic', color: MUTED, marginTop: 24 }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: SERIF, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: SCRIPT, fontStyle: 'italic', color: TEXT }}>
                {switching
                  ? t('detail.join.confirmSwitch', { faction: name, current: factionName(currentSlug) })
                  : t('detail.join.confirm', { faction: name })}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
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
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 'var(--text-md)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: MUTED,
                    background: 'transparent',
                    border: `1px solid ${GOLD_DEEP}`,
                    padding: '11px 16px',
                    cursor: 'pointer',
                  }}
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: VELLUM_DEEP, border: `1px solid ${GOLD}`, padding: '10px 6px' }}>
      <b className="content-title" style={{ fontFamily: DISPLAY, fontWeight: 700, display: 'block', lineHeight: 1, color: TEXT }}>
        {value}
      </b>
      <span style={{ ...kicker, marginTop: 5, display: 'block' }}>{label}</span>
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
        gap: 12,
        padding: '10px 14px',
        background: VELLUM,
        border: `1px solid ${GOLD_DEEP}`,
        borderLeft: `4px solid ${RUBRIC}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 'var(--text-xl)', color: RUBRIC, width: 16, flex: 'none' }}>{rank}</span>
      <Medallion name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: DISPLAY,
          fontWeight: 700,
          color: TEXT,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: DISPLAY, fontSize: 'var(--text-sm)', letterSpacing: '0.06em', color: LAPIS, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
