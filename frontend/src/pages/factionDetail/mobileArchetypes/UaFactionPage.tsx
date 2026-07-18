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
  fontSize: 'var(--text-xs)',
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
        // ornament: avatar monogram, sized from the medallion it sits in — geometry, not text.
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontFamily: ENGRAVED, fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: INK }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: ENGRAVED,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: PAPER_WARM,
  background: ACCENT,
  border: `1px solid ${ACCENT}`,
  padding: 'var(--space-md) var(--space-lg)',
  boxShadow: '0 6px 16px rgba(194,84,31,.28)',
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  fontFamily: ENGRAVED,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: SUB,
  background: 'transparent',
  border: `1px solid ${LINE}`,
  padding: 'var(--space-md) var(--space-lg)',
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
      <section style={{ padding: 'var(--space-sm)', background: GILT, boxShadow: '0 12px 28px rgba(60,40,10,.2), inset 0 0 0 1px rgba(255,255,255,0.45)' }}>
        <div style={{ padding: 'var(--space-xs)', background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: PAPER,
              backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
              backgroundSize: '5px 5px',
              border: `1px solid ${LINE}`,
              padding: 'var(--space-xl) var(--space-lg)',
            }}
          >
            <div style={{ ...kicker, color: ACCENT }}>{t('ua.mobile.eyebrow')}</div>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontWeight: 700,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead display type — the engraved title is the skin's identity (§4/§270).
                fontSize: 34,
                lineHeight: 1.05,
                color: INK,
                margin: 'var(--space-xs) 0 0',
              }}
            >
              {name}
            </h1>
            <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', lineHeight: 1.6, color: SUB, margin: 'var(--space-sm) 0 0' }}>
              {factionDescription(faction.slug)}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <HeroStat value={members.length} label={t('mobile.membersStat')} />
              <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
            </div>
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 'var(--space-md)', color: GOLD }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: SUB, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: SUB, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: SUB, marginTop: 'var(--space-xl)' }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: MONO, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: INK }}>
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: PAPER_WARM, border: `1px solid ${GOLD}`, padding: 'var(--space-md) var(--space-sm)' }}>
      <b className="content-title" style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, display: 'block', lineHeight: 1, color: INK }}>
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
        background: PAPER,
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${ACCENT}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 'var(--text-xl)', color: ACCENT, width: 16, flex: 'none' }}>{rank}</span>
      <Medallion name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: DISPLAY,
          fontStyle: 'italic',
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: ENGRAVED, fontSize: 'var(--text-sm)', letterSpacing: '0.06em', color: GOLD, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
