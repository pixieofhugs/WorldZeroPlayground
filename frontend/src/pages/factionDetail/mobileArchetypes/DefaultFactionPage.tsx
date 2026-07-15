import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/PraxisCard'
import { factionCssVar, factionName, factionDescription } from '../../../utils/factions'
import { MobileStickyBar } from '../../taskDetail/mobileArchetypes/shared'
import type { CharacterOut } from '../../../api/auth'
import type { FactionDetailState } from '../useFactionDetail'

const NA_SLUG = 'na'

/**
 * Default MOBILE faction-page skin — the phone twin of the desktop faction
 * detail. Single-column: a colour-washed hero (the faction wears its colour
 * while the app chrome stays neutral), real member/task counts, the top members,
 * recent praxis, and a sticky Join action pinned above the tab bar.
 *
 * Join respects the invite-gated model (ADR-0019) via the shared
 * `state.membership`: only an "eligible" viewer gets the Join CTA (with a
 * confirm step — switching factions is irreversible); a member sees a standing
 * badge, a gated viewer a soft hint, and a logged-out / UA non-member nothing.
 * Bespoke faction page skins register in FactionDetail's MOBILE_ARCHETYPE_BY_SLUG.
 */
export default function DefaultFactionPage({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation('factions')
  const { faction, members, tasks, recentPraxis, membership } = state
  const [confirming, setConfirming] = useState(false)

  // Guarded non-null by the dispatcher.
  if (!faction) return null

  const color = factionCssVar(faction.slug)
  const name = factionName(faction.slug)
  const topMembers = [...members].sort((a, b) => b.all_time_score - a.all_time_score).slice(0, 3)

  const currentSlug = membership.currentFactionSlug
  const switching = currentSlug && currentSlug !== NA_SLUG

  return (
    <div className="py-4" data-testid="mobile-faction-page">
      {/* Hero — wears the faction colour; app chrome stays neutral. */}
      <section
        style={{
          borderRadius: 14,
          padding: '20px 16px',
          background: color,
          color: 'var(--color-text-on-accent)',
        }}
      >
        <h1 className="font-display italic font-medium" style={{ fontSize: 26, lineHeight: 1.1 }}>
          {name}
        </h1>
        <p className="font-body" style={{ fontSize: 11, opacity: 0.92, marginTop: 5, lineHeight: 1.5 }}>
          {factionDescription(faction.slug)}
        </p>
        <div style={{ display: 'flex', gap: 20, marginTop: 15 }}>
          <HeroStat value={members.length} label={t('mobile.membersStat')} />
          <HeroStat value={tasks.length} label={t('mobile.tasksStat')} />
        </div>
      </section>

      {membership.state === 'member' && (
        <p
          className="eyebrow"
          style={{ marginTop: 12, color: factionCssVar(faction.slug, 'border') }}
        >
          {t('mobile.memberBadge')}
        </p>
      )}

      {/* Top members */}
      <section className="mt-6">
        <h2 className="eyebrow mb-2">{t('mobile.topMembers')}</h2>
        {topMembers.length === 0 ? (
          <p className="font-body text-muted text-sm">{t('mobile.membersEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topMembers.map((m, index) => (
              <MemberRow key={m.id} rank={index + 1} member={m} accent={color} />
            ))}
          </div>
        )}
      </section>

      {/* Recent praxis */}
      <section className="mt-6">
        <h2 className="eyebrow mb-2">{t('mobile.recentPraxis')}</h2>
        {recentPraxis.length === 0 ? (
          <p className="font-body text-muted text-sm">{t('mobile.praxisEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </section>

      {membership.state === 'gate' && (
        <p className="font-body text-sm text-muted mt-6">
          {t('mobile.gateHint', { faction: name })}
        </p>
      )}

      {/* Sticky Join — only an eligible viewer can act (ADR-0019). */}
      {membership.state === 'eligible' && (
        <MobileStickyBar>
          {membership.joinError && (
            <p className="font-body text-sm text-red-600">{membership.joinError}</p>
          )}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={JOIN_BUTTON_STYLE}
            >
              {t('mobile.join', { faction: name })}
            </button>
          ) : (
            <>
              <p className="font-body text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {switching
                  ? t('detail.join.confirmSwitch', { faction: name, current: factionName(currentSlug) })
                  : t('detail.join.confirm', { faction: name })}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void membership.join()}
                  disabled={membership.joining}
                  style={{ ...JOIN_BUTTON_STYLE, flex: 1, opacity: membership.joining ? 0.6 : 1 }}
                >
                  {membership.joining ? t('mobile.joining') : t('mobile.confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={membership.joining}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-secondary)',
                    background: 'transparent',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 999,
                    padding: '10px 16px',
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

const JOIN_BUTTON_STYLE = {
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--color-text-on-accent)',
  background: 'var(--color-text-primary)',
  border: 'none',
  borderRadius: 999,
  padding: '13px 16px',
  cursor: 'pointer',
} as const

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <b className="font-display italic" style={{ fontSize: 18, display: 'block', lineHeight: 1 }}>
        {value}
      </b>
      <span
        style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.85 }}
      >
        {label}
      </span>
    </div>
  )
}

function MemberRow({
  rank,
  member,
  accent,
}: {
  rank: number
  member: CharacterOut
  accent: string
}) {
  const { t } = useTranslation('factions')
  return (
    <Link
      to={`/characters/${member.id}`}
      className="sidebar-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        textDecoration: 'none',
      }}
    >
      <span
        className="font-display italic"
        style={{ fontSize: 16, color: accent, width: 18, flex: 'none' }}
      >
        {rank}
      </span>
      <span
        className="font-body"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.display_name}
      </span>
      <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', flex: 'none' }}>
        {t('mobile.memberStat', {
          level: member.level,
          score: member.all_time_score.toLocaleString(),
        })}
      </span>
    </Link>
  )
}
