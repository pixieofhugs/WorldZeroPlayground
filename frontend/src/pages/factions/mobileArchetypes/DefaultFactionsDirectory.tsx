import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import {
  getFactions,
  getFactionStatus,
  getInvitations,
  type FactionOut,
  type FactionPageOut,
  type InvitationLetterOut,
} from '../../../api/factions'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import { relativeTime } from '../../../utils/dates'
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
 * Factions grid. A single-column screen, in render order: a title, the faction
 * stripe bar, any invitation letters the player holds (#733), an "unaffiliated"
 * banner (shown only while the viewer hasn't sworn to a faction), then a
 * vertical stack of the SAME bespoke FactionSelectCard
 * archetypes desktop uses (#732), each visiting its faction's detail page where
 * all membership actions live (#347). Member counts are intentionally dropped —
 * no cheap per-faction count query exists (ADR-0035: real fields only).
 *
 * The stripe bar is a legend for the list: one hard-edged span per rendered
 * row, in the same rainbow order, so stripe N == card N. That's why it is NOT
 * `var(--faction-default-rainbow)` (a smooth gradient, no per-faction
 * correspondence) and why the list keeps rainbow order rather than desktop's
 * member-first sort. The stripe count follows the fetched list rather than a
 * static seven — Albescent is hidden until revealed (ADR-0027).
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
  const [invitations, setInvitations] = useState<InvitationLetterOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // The invitations feed backs the letters PANEL only — never card state.
    // Desktop's extra `|| invitationBySlug[slug]` arm in its `selectState` is
    // dead code: `_NON_INVITE_FACTION_SLUGS = {"na", "albescent"}` (backend
    // services/character_stats.py) means no letter is ever written for those
    // two, and `get_account_invited_faction_slugs` excludes the same pair while
    // being ACCOUNT-pooled — strictly broader than the character-scoped
    // /factions/invitations. So every slug this feed can return already reports
    // `invited` in /factions/status. `selectState` stays as-is (#733).
    const load = async () => {
      const factionsData = await getFactions()
      if (cancelled) return
      setFactions(factionsData)
      if (!character) return
      const [statusData, invitesData] = await Promise.all([getFactionStatus(), getInvitations()])
      if (cancelled) return
      setFactionPage(statusData)
      setInvitations(invitesData)
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
        style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {tc('nav.factions')}
      </h1>

      {/* Faction legend: one hard-edged stripe per faction, in the same order
          as the cards below. Deliberately not extracted — single caller.

          Driven off `visible` (the rows actually rendered), NOT the static
          FACTION_RAINBOW_ORDER: Albescent is a secret society omitted from
          /factions until the account is revealed to it (ADR-0027, #390,
          routers/factions.py:53). A hardcoded seven-stripe bar would both
          break the stripe==row correspondence for unrevealed players and
          leak Albescent's existence in its own colour. */}
      {visible.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            height: 10,
            borderRadius: 999,
            overflow: 'hidden',
            marginBottom: 'var(--space-xl)',
          }}
        >
          {visible.map((f) => (
            <span key={f.slug} style={{ flex: 1, background: factionCssVar(f.slug) }} />
          ))}
        </div>
      )}

      {/* Invitation letters. Rendered only when the player actually holds one —
          an empty list draws NOTHING (no header, no empty state).

          ponytail: NO collapse toggle, unlike desktop's collapsed-by-default
          panel. Desktop can collapse because its grid is fully visible above
          the fold and each tile already shows `eligible`; on a phone the cards
          are a tall vertical stack, so this panel is the only thing that tells
          an invited player a letter exists without scrolling. A collapsed
          `▸ Recent Invitations (1)` would defeat the point of the issue, and
          one or two rows never need collapsing. Rows link to the detail page,
          which owns Accept/Decline (ADR-0030, #347). */}
      {invitations.length > 0 && (
        <div className="mb-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('index.recentInvitations', { count: invitations.length })}
          </span>
          {invitations.map((inv) => (
            <Link
              key={inv.faction_slug}
              to={`/factions/${inv.faction_slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-md)',
                textDecoration: 'none',
                background: `linear-gradient(135deg, ${factionCssVar(inv.faction_slug, 'light')}, transparent)`,
                borderLeft: `3px solid ${factionCssVar(inv.faction_slug, 'border')}`,
              }}
            >
              <span className="eyebrow">{t('index.inviteBadge')}</span>
              <span
                className="font-body"
                style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)', flex: 1, lineHeight: 1.4 }}
              >
                <Trans
                  t={t}
                  i18nKey="index.invitedToJoin"
                  values={{ faction: factionName(inv.faction_slug) }}
                  components={[
                    <span key="0" />,
                    <span key="1" style={{ fontWeight: 700, color: factionCssVar(inv.faction_slug) }} />,
                  ]}
                />
              </span>
              <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
                {relativeTime(inv.delivered_at)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {unaffiliated && (
        <section
          className="sidebar-card mb-4"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)' }}
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
              style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}
            >
              {t('mobile.unaffiliatedTitle')}
            </div>
            <p
              className="font-body"
              style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)', lineHeight: 1.4 }}
            >
              {t('mobile.unaffiliatedBody')}
            </p>
          </div>
        </section>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('index.loading')}</p>
      ) : error ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">{error}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
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
