import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * Warriors of Whimsy MOBILE faction page (#531) — the coven, phone shaped. The
 * same single-column slots as the Default mobile faction page (a hero with real
 * member/task counts, top members, recent praxis, and the invite-gated Join model
 * via `state.membership`, ADR-0019) — only the dress changes: a pink scrapbook
 * "wow.exe" window hero on a dotted board, Caveat script, sparkle accents, rose
 * accent. Grounds on the `--faction-wow-*` window tokens already in index.css (the
 * set the WOW pilots use); always-light. Reuses the shared `mobile.*` faction copy
 * so the slot contract holds. Presentation-only — all data + the join handler
 * arrive via {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const PINK = 'var(--faction-wow)'
const PINK_DEEP = 'var(--faction-wow-card-accent)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const WIN_BORDER = 'var(--faction-wow-win-border)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const DOT = 'var(--faction-wow-dot)'
const SCRIPT = 'var(--faction-wow-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime
const ON_ACCENT = 'var(--color-text-on-accent)'

/** The kit's four-point sparkle. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  )
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** Circular initials sticker — pink→deep wash face, Caveat glyph. */
function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(150deg, var(--faction-wow-title-from), ${PINK})`,
        border: `1.5px solid ${WIN_BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SCRIPT,
        // ornament: avatar monogram, sized from the sticker it sits in - geometry, not text.
        fontSize: size * 0.5,
        color: ON_ACCENT,
      }}
    >
      {initial(name)}
    </span>
  )
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: SCRIPT, fontSize: 'var(--text-title)', color: TITLE_TEXT }}>
        <Sparkle size={13} color={PINK} />
        {children}
      </span>
      <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${PINK} 0 8px, transparent 8px 14px)` }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: BODY,
  fontSize: 'var(--text-xl)',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: ON_ACCENT,
  background: `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})`,
  border: `1.5px solid ${PINK_DEEP}`,
  borderRadius: 14,
  padding: '13px 16px',
  boxShadow: `0 6px 16px color-mix(in srgb, ${PINK} 30%, transparent)`,
  cursor: 'pointer',
}

export default function WowFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  if (!faction) return null

  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)
  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div
      data-skin="wow"
      className="py-4"
      style={{
        fontFamily: BODY,
        color: CARD_TEXT,
        background: BODY_BG,
        backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
        backgroundSize: '15px 15px',
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
      data-testid="mobile-faction-page"
    >
      {/* Hero — wow.exe window wrapping a pink gradient panel */}
      <section
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: `2px solid ${WIN_BORDER}`,
          boxShadow: `0 8px 22px color-mix(in srgb, ${PINK} 22%, transparent)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 12px',
            background: 'linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))',
            borderBottom: `2px solid ${WIN_BORDER}`,
          }}
        >
          {['var(--faction-wow-scrap-deep)', 'var(--faction-wow-tape)', 'var(--faction-wow-ivy-leaf)'].map((c) => (
            <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, border: '1.2px solid rgba(255,255,255,0.7)' }} />
          ))}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: SCRIPT, fontSize: 'var(--text-content)', color: TITLE_TEXT }}>
            <Sparkle size={11} color={TITLE_TEXT} />
            {t('wow.mobile.eyebrow')}
          </span>
        </div>
        <div
          style={{
            padding: '22px 18px 20px',
            background: 'linear-gradient(160deg, var(--faction-wow-title-from), var(--faction-wow-card-muted) 60%, var(--faction-wow))',
            color: TITLE_TEXT,
          }}
        >
          {/* ornament: masthead display type - the hand-lettered title is the skin's identity (§4/§270). */}
          <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SCRIPT, fontSize: 36, lineHeight: 0.95, margin: 0 }}>
            <Sparkle size={18} color={TITLE_TEXT} />
            {name}
          </h1>
          <p className="content-text" style={{ fontFamily: BODY, lineHeight: 1.6, color: PINK_DEEP, margin: '8px 0 0' }}>
            {factionDescription(faction.slug)}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <HeroStat value={members.length} label={t('mobile.membersStat')} />
            <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
          </div>
        </div>
      </section>

      {membership.state === 'member' && (
        <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK, margin: '12px 0 0' }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="content-text" style={{ fontFamily: BODY, color: CARD_MUTED, marginTop: 24, lineHeight: 1.6 }}>
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: BODY, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              <Sparkle size={13} color={ON_ACCENT} />
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: BODY, lineHeight: 1.6, color: CARD_TEXT }}>
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
                    fontFamily: BODY,
                    fontSize: 'var(--text-md)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: CARD_MUTED,
                    background: 'transparent',
                    border: `1.5px solid ${NOTEPAD_BORDER}`,
                    borderRadius: 12,
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 12, padding: '11px 6px' }}>
      <b className="content-title" style={{ fontFamily: SCRIPT, display: 'block', lineHeight: 1, color: TITLE_TEXT }}>{value}</b>
      <span style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.16em', textTransform: 'uppercase', color: CARD_MUTED, marginTop: 5, display: 'block' }}>
        {label}
      </span>
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
        background: NOTEPAD_BG,
        border: `1.5px solid ${NOTEPAD_BORDER}`,
        borderRadius: 12,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: SCRIPT, fontSize: 'var(--text-xl)', color: PINK, width: 16, flex: 'none' }}>{rank}</span>
      <Avatar name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: SCRIPT,
          color: TITLE_TEXT,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span style={{ fontFamily: BODY, fontSize: 'var(--text-sm)', letterSpacing: '0.04em', color: PINK_DEEP, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
