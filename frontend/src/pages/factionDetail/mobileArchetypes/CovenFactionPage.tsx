import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { CovenSigil } from '../../../components/sigil/CovenSigil'
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  CTA_FROM,
  CTA_INK,
  CTA_TO,
  DEEP,
  DISPLAY,
  GLOW,
  GOLD,
  HAND,
  HAIR,
  INK,
  READING,
  SHADOW,
  SigilMark,
  SlipAvatar,
  SLIP_SHEET,
  SOFT,
} from '../../../components/factionMarks/covenSlip'
import { factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from './shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * Cozy Coven MOBILE faction page (#531, re-dressed by #1209) — the coven, phone
 * shaped.
 *
 * The same single-column slots as the Default mobile faction page (a hero with
 * real member/task counts, top members, recent praxis, and the invite-gated Join
 * model via `state.membership`, ADR-0019) — only the dress changes. The
 * `wow.exe` window hero on its dotted board is gone with the rest of the sweep:
 * the slip band carries the badge and the name, the candlelit page is the ground,
 * and every panel is ward paper inside the slip's pink edge.
 *
 * The member rows are the design's COMMENT ROW, which is the only list shape it
 * draws — task and faction pages carry no roster in the design at all.
 *
 * Presentation-only — all data + the join handler arrive via
 * {@link FactionDetailState}. No copy changed; the shared `mobile.*` keys still
 * carry the slot contract.
 */

const NA_SLUG = 'na'
const CHROME = 'var(--font-faction-rounded)' // Quicksand

/** The reading voice — every prose line and empty state on the page. */
const PROSE: CSSProperties = {
  fontFamily: READING,
  fontStyle: 'italic',
  lineHeight: 1.55,
  color: SOFT,
}

/** Paper laid on the candlelight. */
const PANEL: CSSProperties = {
  background: CARD,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 12,
  boxSizing: 'border-box',
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 'var(--text-title)',
          lineHeight: 1.06,
          letterSpacing: '0.02em',
          color: INK,
        }}
      >
        {children}
      </span>
      <Braid style={{ flex: 1 }} />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-sm)',
  fontFamily: CHROME,
  fontSize: 'var(--text-xl)',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: CTA_INK,
  background: `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`,
  border: `1.5px solid ${CTA_TO}`,
  borderRadius: 14,
  padding: 'var(--space-md) var(--space-lg)',
  boxShadow: `0 8px 18px -8px ${GLOW}`,
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  ...CAPTION,
  background: 'transparent',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 12,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

export default function CovenFactionPage({ state }: { state: FactionDetailState }) {
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
      data-skin="coven"
      className="py-4 coven-candle-backdrop"
      style={{
        position: 'relative',
        fontFamily: CHROME,
        color: INK,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 'var(--space-lg)',
        paddingRight: 'var(--space-lg)',
      }}
      data-testid="mobile-faction-page"
    >
      {/* The candlelight wash is the page ground — `.coven-candle-backdrop` owns
          the blooms, the drift and the light/dark flip, and its `::before` is
          positioned, so the content sits above it explicitly (#911). */}
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Hero — the slip band over a candle-lit panel */}
      <section
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: `2px solid ${BORDER}`,
          boxShadow: SHADOW,
        }}
      >
        <div
          style={{
            padding: 'var(--space-xl) var(--space-lg)',
            background: SLIP_SHEET,
            borderBottom: `2px solid ${BORDER}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <SigilMark size={26} />
            <span style={CAPTION}>{t('coven.mobile.eyebrow')}</span>
          </div>
          <h1
            style={{
              fontFamily: HAND,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the coven's name hand-lettered in Caveat — the slip's masthead.
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 0.95,
              color: INK,
              margin: 'var(--space-xs) 0 0',
            }}
          >
            {name}
          </h1>
          <Braid style={{ margin: 'var(--space-sm) 0' }} />
          <p className="content-text" style={{ ...PROSE, margin: 0 }}>
            {factionDescription(faction.slug)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-lg)', background: CARD }}>
          <HeroStat value={members.length} label={t('mobile.membersStat')} />
          <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
        </div>
      </section>

      {membership.state === 'member' && (
        <p className="content-text" style={{ ...PROSE, margin: 'var(--space-md) 0 0' }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ ...PROSE, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ ...PROSE, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {(membership.state === 'gate' || membership.state === 'burned') && (
        <p className="content-text" style={{ ...PROSE, marginTop: 'var(--space-xl)' }}>
          {membership.state === 'burned'
            ? t('mobile.burnedHint', { faction: name })
            : t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="content-text" style={{ fontFamily: READING, color: 'var(--color-danger)' }}>{membership.joinError}</p>
          )}
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} style={joinButton}>
              <CovenSigil size={13} color={CTA_INK} />
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: READING, lineHeight: 1.6, color: INK }}>
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
    </div>
  )
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ ...PANEL, flex: '1 1 0', textAlign: 'center', padding: 'var(--space-md) var(--space-sm)' }}>
      <b className="content-title" style={{ fontFamily: READING, fontWeight: 600, display: 'block', lineHeight: 1, color: DEEP }}>{value}</b>
      <span style={{ ...CAPTION, fontSize: 'var(--text-xs)', marginTop: 'var(--space-xs)', display: 'block' }}>
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
        ...PANEL,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) var(--space-lg)',
        borderBottom: `1.5px solid ${HAIR}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ ...CAPTION, width: 16, flex: 'none' }}>{rank}</span>
      <SlipAvatar name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: HAND,
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <CovenSigil size={11} color={GOLD} />
      <span style={{ ...CAPTION, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
