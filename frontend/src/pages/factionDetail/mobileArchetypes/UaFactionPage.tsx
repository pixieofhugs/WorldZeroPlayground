import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * University of Asthmatics MOBILE faction page (#525) — the gilt salon, phone shaped.
 * The same single-column slots as the Default mobile faction page (a hero with
 * real member/task counts, top members, recent praxis, and the invite-gated Join
 * model via `state.membership`, ADR-0019) — only the dress changes: parchment
 * plates in gold-leaf frames, engraved (Cinzel) kickers, Cormorant-italic titles,
 * amber accents. Grounds on the `--faction-ua-*` / `--ua-*` tokens; always-light
 * (UA never dims). Reuses the shared `mobile.*` faction copy so the slot contract
 * holds. Presentation-only — all data + the join handler arrive via
 * {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const WALL = 'var(--ua-wall)'
const INK = 'var(--faction-ua-card-text)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const GOLD_LT = 'var(--ua-gold-lt)'
const GOLD_PALE = 'var(--ua-gold-pale)'
const LINE = 'var(--ua-line)'
const GILT = 'var(--ua-gilt)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** Circular initials medallion — parchment face, amber italic glyph. */
function Medallion({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: PAPER_WARM,
        border: `1px solid ${GOLD_LT}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: DISPLAY,
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: size * 0.42,
        color: ACCENT,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontFamily: ENGRAVED, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: ENGRAVED,
  fontSize: 13,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: PAPER_WARM,
  background: ACCENT,
  border: `1px solid ${ACCENT}`,
  padding: '13px 16px',
  boxShadow: '0 6px 16px rgba(194,84,31,.28)',
  cursor: 'pointer',
}

export default function UaFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div data-skin="ua" className="py-4" style={{ fontFamily: MONO, color: INK, background: WALL }} data-testid="mobile-faction-page">
      {/* Hero — gilt-framed parchment masthead */}
      <section style={{ padding: 8, background: GILT, boxShadow: '0 12px 28px rgba(60,40,10,.2), inset 0 0 0 1px rgba(255,255,255,0.45)' }}>
        <div style={{ padding: 3, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: PAPER,
              backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
              backgroundSize: '5px 5px',
              border: `1px solid ${LINE}`,
              padding: '20px 18px',
            }}
          >
            <div style={{ ...kicker, color: ACCENT }}>{t('ua.mobile.eyebrow')}</div>
            <h1 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 34, lineHeight: 1.05, color: INK, margin: '4px 0 0' }}>
              {name}
            </h1>
            <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 13, lineHeight: 1.6, color: SUB, margin: '8px 0 0' }}>
              {factionDescription(faction.slug)}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
              <HeroStat value={members.length} label={t('mobile.membersStat')} />
              <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
            </div>
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 12, color: GOLD }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 14, color: SUB, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 14, color: SUB, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 14, color: SUB, marginTop: 24 }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 14, color: INK }}>
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
                    fontFamily: ENGRAVED,
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: SUB,
                    background: 'transparent',
                    border: `1px solid ${LINE}`,
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: PAPER_WARM, border: `1px solid ${GOLD}`, padding: '10px 6px' }}>
      <b style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 20, display: 'block', lineHeight: 1, color: INK }}>
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
        background: PAPER,
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${ACCENT}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16, color: ACCENT, width: 16, flex: 'none' }}>{rank}</span>
      <Medallion name={member.display_name} size={28} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: DISPLAY,
          fontStyle: 'italic',
          fontSize: 15,
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: ENGRAVED, fontSize: 9, letterSpacing: '0.06em', color: GOLD, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
