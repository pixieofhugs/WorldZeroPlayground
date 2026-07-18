import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * S.N.I.D.E. MOBILE faction page (#530) — the crew's dossier, phone shaped. The
 * same single-column slots as the Default mobile faction page (a hero with real
 * member/task counts, top members, recent praxis, and the invite-gated Join
 * model via `state.membership`, ADR-0019) — only the paste-up changes: a dark
 * ransom masthead over an acid rule, taped rows, hot-pink Join. Grounds on the
 * `--faction-snide-*` tokens; native-dark. Reuses the shared `mobile.*` faction
 * copy so the slot contract holds. Presentation-only — all data + the join
 * handler arrive via {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const ACCENT_WALL = 'var(--faction-snide)'
const PINK = 'var(--faction-snide-pink)'
const TAPE = 'var(--faction-snide-tape)'
const LINE = 'var(--faction-snide-border)'
const PAPER = 'var(--faction-snide-paper)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const BLACK = 'var(--faction-snide-font-black)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** Square initials mug — acid face, dark impact glyph. */
function Mug({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        background: ACID,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: IMPACT,
        // ornament: avatar monogram, sized from the mugshot it sits in — geometry, not text.
        fontSize: size * 0.46,
        color: INK,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontFamily: COND, fontSize: 'var(--text-xl)', letterSpacing: '0.06em', textTransform: 'uppercase', color: ACID }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: BLACK,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: PAPER,
  background: PINK,
  border: 'none',
  padding: '14px 16px',
  boxShadow: '2px 3px 0 rgba(0,0,0,.4)',
  cursor: 'pointer',
}

export default function SnideFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div data-skin="snide" className="py-4" style={{ fontFamily: TYPE, color: WALL_TEXT, background: WALL }} data-testid="mobile-faction-page">
      {/* Hero — dark ransom masthead */}
      <section style={{ position: 'relative', background: INK, color: TEXT, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, padding: '20px 18px', transform: 'rotate(-0.6deg)', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(182,255,46,0.08) 32%, transparent 34%)', backgroundSize: '5px 5px' }} />
        <span aria-hidden style={{ position: 'absolute', top: -11, left: 26, width: 64, height: 24, background: TAPE, transform: 'rotate(-5deg)', opacity: 0.92 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ ...kicker, color: ACID }}>{t('snide.mobile.eyebrow')}</div>
          {/* ornament: masthead display type — the flyposted title is the skin's identity (§4/§270). */}
          <h1 style={{ fontFamily: COND, fontSize: 34, letterSpacing: '0.02em', lineHeight: 1.02, color: TEXT, margin: '4px 0 0' }}>
            {name}
          </h1>
          <p className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.6, color: MUTED, margin: '8px 0 0' }}>
            {factionDescription(faction.slug)}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
            <HeroStat value={members.length} label={t('mobile.membersStat')} />
            <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 12, color: ACCENT_WALL }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: MARKER, color: MUTED, margin: 0, transform: 'rotate(-1deg)' }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: MARKER, color: MUTED, margin: 0, transform: 'rotate(-1deg)' }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: MARKER, color: MUTED, marginTop: 24, transform: 'rotate(-1deg)' }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: TYPE, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: COND, letterSpacing: '0.02em', color: WALL_TEXT }}>
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
                    fontFamily: TYPE,
                    fontSize: 'var(--text-md)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: MUTED,
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, padding: '10px 6px' }}>
      <b className="content-title" style={{ fontFamily: IMPACT, display: 'block', lineHeight: 1, color: ACID }}>
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
        background: INK,
        color: TEXT,
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${ACID}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: IMPACT, fontSize: 'var(--text-xl)', color: ACID, width: 16, flex: 'none' }}>{rank}</span>
      <Mug name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: COND,
          letterSpacing: '0.02em',
          color: TEXT,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: TYPE, fontSize: 'var(--text-sm)', letterSpacing: '0.06em', color: MUTED, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
