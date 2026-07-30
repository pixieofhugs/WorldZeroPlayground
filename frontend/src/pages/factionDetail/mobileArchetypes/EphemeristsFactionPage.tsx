import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionName, factionDescription } from '../../../utils/factions'
import { EphemeristsSigil } from '../../../components/sigil/EphemeristsSigil'
import {
  AuthorOctagon,
  BRASS,
  CAPTION,
  CTA_BG,
  CTA_INK,
  DECO,
  FlutedRule,
  INK,
  INNER,
  LINE,
  MARGINALIA,
  NILE,
  OCHRE,
  PAGE,
  QUIET,
  READING,
  SHADOW,
  SMALL_CAPS,
  Tally,
  PLATE as SHEET,
} from '../../../components/factionMarks/ephemeristsPlate'
import { MobileStickyBar } from './shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

/**
 * The Ephemerists MOBILE faction page (#527, swept onto the Valley plate by
 * #1208) — the plate, phone shaped. The same single-column slots as the Default
 * mobile faction page (a hero with real member/task counts, top keepers, recent
 * praxis, and the invite-gated Join model via `state.membership`, ADR-0019) —
 * only the dress changes: papyrus leaves on the page ground, incised small-caps
 * labels, keepers cut into octagon cartouches, and the summons on the plate's
 * own CTA band. Grounds on `--faction-ephemerists-plate-*`; theme-aware through
 * the cascade. Reuses the shared `mobile.*` faction copy so the slot contract
 * holds. Presentation-only — all data + the join handler arrive via
 * {@link FactionDetailState}.
 */

const NA_SLUG = 'na'

const kicker: CSSProperties = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.2em',
  color: QUIET,
}

/** A keeper's monogram, cut into the plate's octagon cartouche. */
function Medallion({ name, size }: { name: string; size: number }) {
  return <AuthorOctagon name={name} size={size} fontSize={size * 0.4} />
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>
        <span style={{ ...SMALL_CAPS, fontSize: 'var(--text-md)', letterSpacing: '0.18em', color: INK }}>
          {children}
        </span>
        <span style={{ flex: 1, height: 1, background: BRASS, opacity: 0.5 }} />
      </div>
      <FlutedRule />
    </div>
  )
}

const joinButton: CSSProperties = {
  width: '100%',
  ...SMALL_CAPS,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.12em',
  color: CTA_INK,
  background: CTA_BG,
  border: `2px solid ${BRASS}`,
  padding: 'var(--space-md) var(--space-lg)',
  cursor: 'pointer',
}

/** The Cancel affordance beside Join — static, so it lives at module scope (#586). */
const cancelButton: CSSProperties = {
  fontFamily: MARGINALIA,
  fontStyle: 'italic',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.06em',
  color: QUIET,
  background: 'transparent',
  border: `1px solid ${LINE}`,
  padding: 'var(--space-md) var(--space-lg)',
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
    <div data-skin="ephemerists" className="py-4" style={{ fontFamily: READING, color: INK, background: PAGE }} data-testid="mobile-faction-page">
      {/* Hero — one plate off the field journal */}
      <section style={{ position: 'relative', overflow: 'hidden', background: SHEET, border: `1px solid ${LINE}`, boxShadow: SHADOW, padding: 'var(--space-xl) var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <EphemeristsSigil size={13} color={BRASS} />
          <span style={{ ...kicker, color: CAPTION }}>{t('ephemerists.mobile.eyebrow')}</span>
        </div>
        <h1
          style={{
            fontFamily: DECO,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: masthead display type — the plate's title is the skin's identity (§4/§270).
            fontSize: 32,
            lineHeight: 1.05,
            letterSpacing: '0.04em',
            color: INK,
            margin: 'var(--space-xs) 0 0',
          }}
        >
          {name}
        </h1>
        <p className="content-text" style={{ fontFamily: READING, lineHeight: 1.7, color: QUIET, margin: 'var(--space-sm) 0 0' }}>
          {factionDescription(faction.slug)}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
          <HeroStat value={members.length} label={t('mobile.membersStat')} />
          <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
        </div>
      </section>

      {membership.state === 'member' && (
        <p style={{ ...kicker, marginTop: 'var(--space-md)', color: NILE }}>{t('mobile.memberBadge')}</p>
      )}

      {/* Top keepers */}
      <section className="mt-6">
        <SectionHead>{t('mobile.topMembers')}</SectionHead>
        {topMembers.length === 0 ? (
          <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: 'italic', color: QUIET, margin: 0 }}>{t('mobile.membersEmpty')}</p>
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
          <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: 'italic', color: QUIET, margin: 0 }}>{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {(membership.state === 'gate' || membership.state === 'burned') && (
        <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: 'italic', color: QUIET, marginTop: 'var(--space-xl)' }}>
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
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: 'italic', color: INK }}>
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
    <div style={{ flex: '1 1 0', textAlign: 'center', background: INNER, border: `1px solid ${LINE}`, padding: 'var(--space-md) var(--space-sm)' }}>
      <b className="content-title" style={{ fontFamily: DECO, display: 'block', lineHeight: 1, color: INK }}>
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
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${OCHRE}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ fontFamily: DECO, fontSize: 'var(--text-xl)', color: CAPTION, width: 16, flex: 'none' }}>{rank}</span>
      <Medallion name={member.display_name} size={28} />
      <span
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: READING,
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <Tally level={member.level} />
      <span style={{ ...SMALL_CAPS, fontSize: 'var(--text-sm)', letterSpacing: '0.12em', color: NILE, flex: 'none' }}>
        {t('mobile.memberStat', { level: member.level, score: member.all_time_score.toLocaleString() })}
      </span>
    </Link>
  )
}
