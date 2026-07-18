import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import AlbescentSigil from '../../../components/cards/AlbescentSigil'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * Albescent MOBILE faction page (#528) — the Record, phone shaped. The same
 * single-column slots as the Default mobile faction page (a hero with real
 * member/task counts, top members, recent praxis, and the invite-gated Join model
 * via `state.membership`, ADR-0019) — only the dress changes: cotton sheets, the
 * surveyor's Mark, hairlines, Cormorant-italic titles, one hue of ink and no
 * colour. Grounds on the `--faction-albescent-*` tokens; always-light. Reuses the
 * shared `mobile.*` faction copy so the slot contract holds. Presentation-only —
 * all data + the join handler arrive via {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const PAGE = 'var(--faction-albescent-page)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--faction-albescent-mono)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: ink(30),
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** A quiet witness circle — cotton face, ink italic glyph. */
function Witness({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: ink(4),
        border: `1px solid ${ink(14)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        fontStyle: 'italic',
        fontWeight: 300,
        // ornament: avatar monogram, sized from the circle it sits in — geometry, not text.
        fontSize: size * 0.42,
        color: ink(55),
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span style={{ fontFamily: MONO, fontSize: 'var(--text-sm)', letterSpacing: '0.2em', textTransform: 'uppercase', color: ink(40) }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: ink(8) }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  fontFamily: MONO,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: PAGE,
  background: INK,
  border: `1px solid ${INK}`,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-base)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: ink(45),
  background: 'transparent',
  border: `1px solid ${ink(14)}`,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

export default function AlbescentFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div data-skin="albescent" className="py-4" style={{ fontFamily: MONO, color: INK, background: PAGE }} data-testid="mobile-faction-page">
      {/* Hero — cotton sheet, centred */}
      <section
        style={{
          background: SHEET,
          border: `1px solid ${ink(10)}`,
          boxShadow: '0 2px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          padding: 'var(--space-2xl) var(--space-xl) var(--space-xl)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
          <AlbescentSigil size={34} />
        </div>
        <div style={{ ...kicker, letterSpacing: '0.3em', color: ink(40) }}>{t('albescent.mobile.eyebrow')}</div>
        <h1
          style={{
            fontFamily: FONT,
            fontStyle: 'italic',
            fontWeight: 300,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead display type — the Record's hand-set title is the skin's identity (§4/§270).
            fontSize: 34,
            lineHeight: 1.08,
            color: INK,
            margin: 'var(--space-sm) 0 0',
          }}
        >
          {name}
        </h1>
        <p className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', lineHeight: 1.6, color: ink(52), margin: 'var(--space-md) auto 0', maxWidth: 320 }}>
          {factionDescription(faction.slug)}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)', justifyContent: 'center' }}>
          <HeroStat value={members.length} label={t('mobile.membersStat')} />
          <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 'var(--space-md)', color: ink(45) }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: ink(45), margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: ink(45), margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: ink(45), marginTop: 'var(--space-xl)' }}>
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
              <p className="content-text" style={{ fontFamily: FONT, fontStyle: 'italic', color: INK }}>
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
    <div style={{ flex: '0 1 120px', textAlign: 'center', border: `1px solid ${ink(9)}`, padding: 'var(--space-md) var(--space-lg)' }}>
      <b className="content-title" style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, display: 'block', lineHeight: 1, color: INK }}>
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
        background: SHEET,
        border: `1px solid ${ink(10)}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 'var(--text-xl)', color: ink(45), width: 16, flex: 'none' }}>{rank}</span>
      <Witness name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: FONT,
          fontStyle: 'italic',
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: ink(38), flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
