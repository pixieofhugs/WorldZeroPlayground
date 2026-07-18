import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFactions, getFactionStatus, type FactionOut, type FactionPageOut } from '../../../api/factions'
import { factionCssVar, FACTION_RAINBOW_ORDER, sortFactionsByRainbowOrder } from '../../../utils/factions'
import FactionSelectCard, { type SelectState } from '../../../components/cards/FactionSelectCard'
import { useAuth } from '../../../auth/AuthContext'
import { extractError } from '../../../utils/errors'

const NA_SLUG = 'na'

const STATUS_MEMBER = 'member'
const STATUS_INVITED = 'invited'
const STATUS_NOT_INVITED = 'not_invited'
const STATUS_CAN_RETURN = 'can_return'

/**
 * Default MOBILE factions-directory skin — the phone twin of the desktop
 * Factions grid. A single-column screen: a title over a seven-stripe faction
 * bar, an "unaffiliated" banner (shown only while the viewer hasn't sworn to a
 * faction), then a vertical stack of the SAME bespoke FactionSelectCard
 * archetypes desktop uses (#732), each visiting its faction's detail page where
 * all membership actions live (#347). Member counts are intentionally dropped —
 * no cheap per-faction count query exists (ADR-0035: real fields only).
 *
 * The stripe bar is a legend for the list: seven hard-edged spans in
 * FACTION_RAINBOW_ORDER, one per row below, so stripe N == card N. That's why
 * it is NOT `var(--faction-default-rainbow)` (a smooth gradient, no per-faction
 * correspondence) and why the list keeps rainbow order rather than desktop's
 * member-first sort.
 *
 * Self-fetches the (slug-only) faction list plus the viewer's per-faction
 * status, so the cards render real member/eligible/locked rather than a
 * uniform neutral. Bespoke faction directory skins register in Factions'
 * MOBILE_ARCHETYPE_BY_SLUG.
 */
export default function DefaultFactionsDirectory() {
  const { t } = useTranslation('factions')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const navigate = useNavigate()
  const character = user?.character ?? null
  const currentSlug = character?.faction_slug ?? null
  const unaffiliated = !currentSlug || currentSlug === NA_SLUG

  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionPage, setFactionPage] = useState<FactionPageOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // ponytail: only the status call is added here. The invitations feed (and
    // desktop's `invitationBySlug` fallback) belongs to the invitations panel,
    // issue #733 — an open letter already reports as `invited` in this payload.
    const load = async () => {
      const factionsData = await getFactions()
      if (cancelled) return
      setFactions(factionsData)
      if (!character) return
      const statusData = await getFactionStatus()
      if (!cancelled) setFactionPage(statusData)
    }
    load()
      .catch((err) => {
        if (!cancelled) setError(extractError(err, t('mobile.loadError')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t, character?.id])

  // Same invite-gated status → three-state mapping as DesktopFactions.
  const selectState = (slug: string): SelectState => {
    const status =
      factionPage?.all_factions.find((f) => f.slug === slug)?.status ?? STATUS_NOT_INVITED
    if (status === STATUS_MEMBER) return 'member'
    if (status === STATUS_INVITED || status === STATUS_CAN_RETURN) return 'eligible'
    return 'locked'
  }

  const visible = sortFactionsByRainbowOrder(factions.filter((f) => f.slug !== NA_SLUG))

  return (
    <div className="py-4" data-testid="mobile-factions-directory">
      <h1
        className="font-display italic font-medium mb-3"
        style={{ fontSize: 26, color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {tc('nav.factions')}
      </h1>

      {/* Faction legend: one hard-edged stripe per faction, in the same order
          as the cards below. Deliberately not extracted — single caller. */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {FACTION_RAINBOW_ORDER.map((slug) => (
          <span key={slug} style={{ flex: 1, background: factionCssVar(slug) }} />
        ))}
      </div>

      {unaffiliated && (
        <section
          className="sidebar-card mb-4"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              flex: 'none',
              background: 'var(--color-bg-surface-alt)',
              border: '1px solid var(--color-border)',
            }}
          />
          <div>
            <div
              className="font-display italic"
              style={{ fontSize: 16, color: 'var(--color-text-primary)' }}
            >
              {t('mobile.unaffiliatedTitle')}
            </div>
            <p
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}
            >
              {t('mobile.unaffiliatedBody')}
            </p>
          </div>
        </section>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('index.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">{error}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {visible.map((f) => (
            <FactionSelectCard
              key={f.slug}
              faction={f.slug}
              state={selectState(f.slug)}
              onVisit={() => navigate(`/factions/${f.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
