import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { getFactions, getFactionStatus, getInvitations } from '../api/factions'
import type { FactionOut, FactionPageOut, InvitationLetterOut } from '../api/factions'
import PageTitle from '../components/ui/PageTitle'
import FactionSelectCard from '../components/cards/FactionSelectCard'
import type { SelectState } from '../components/cards/FactionSelectCard'
import { extractError } from '../utils/errors'
import { factionCssVar } from '../utils/factions'
import { relativeTime } from '../utils/dates'
import { useAuth } from '../auth/AuthContext'

const NA_SLUG = 'na'

const STATUS_MEMBER = 'member'
const STATUS_INVITED = 'invited'
const STATUS_NOT_INVITED = 'not_invited'
const STATUS_DEFECTED = 'defected'
const STATUS_CAN_RETURN = 'can_return'

/** System slugs hidden from the player-facing grid (not real factions). UA is
 *  shown — the design's select.card set includes its gilt-salon tile. */
const HIDDEN_SLUGS = new Set([NA_SLUG])

/**
 * Factions grid — a directory of pure PREVIEW tiles (the design select.card
 * archetypes). Each tile's CTA links to the faction's detail page
 * (`/factions/:slug`), where ALL membership actions (Join / Leave / Accept /
 * Decline) now live (issue #347). The grid itself carries no membership
 * controls; it only previews each faction's archetype + the viewer's status,
 * and orders the cards by that status.
 */
export default function Factions() {
  const { t } = useTranslation('factions')
  const { user } = useAuth()
  const character = user?.character ?? null
  const navigate = useNavigate()

  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionPage, setFactionPage] = useState<FactionPageOut | null>(null)
  const [invitations, setInvitations] = useState<InvitationLetterOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invitations panel (collapsed by default once each card surfaces its own status)
  const [invitationsExpanded, setInvitationsExpanded] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const factionsData = await getFactions()
      setFactions(factionsData)

      if (character) {
        const [statusData, invitesData] = await Promise.all([
          getFactionStatus(),
          getInvitations(),
        ])
        setFactionPage(statusData)
        setInvitations(invitesData)
      }
    } catch (err) {
      setError(extractError(err, 'Could not load factions.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchAll() }, [character?.id])

  const statusFor = (slug: string): string => {
    if (!factionPage) return STATUS_NOT_INVITED
    const entry = factionPage.all_factions.find((f) => f.slug === slug)
    return entry?.status ?? STATUS_NOT_INVITED
  }

  if (loading) return <div className="py-8 font-body text-muted">{t('index.loading')}</div>

  // Index invitations by slug for quick per-card lookup
  const invitationBySlug: Record<string, InvitationLetterOut> = {}
  for (const letter of invitations) {
    invitationBySlug[letter.faction_slug] = letter
  }

  // Build the visible faction list (exclude hidden system factions)
  const visibleFactions = factions.filter((f) => !HIDDEN_SLUGS.has(f.slug))

  // Sort: current member first, then invited, then can_return, then rest
  const statusPriority: Record<string, number> = {
    [STATUS_MEMBER]: 0,
    [STATUS_INVITED]: 1,
    [STATUS_CAN_RETURN]: 2,
    [STATUS_NOT_INVITED]: 3,
    [STATUS_DEFECTED]: 4,
  }
  const sortedFactions = [...visibleFactions].sort((a, b) => {
    const sa = statusPriority[statusFor(a.slug)] ?? 3
    const sb = statusPriority[statusFor(b.slug)] ?? 3
    return sa - sb
  })

  // Map the invite-gated status (+ any open letter) to the select-card's
  // three-state model. Joining itself happens on the faction detail page.
  const selectState = (slug: string): SelectState => {
    const status = statusFor(slug)
    if (status === STATUS_MEMBER) return 'member'
    if (status === STATUS_INVITED || status === STATUS_CAN_RETURN || invitationBySlug[slug]) return 'eligible'
    return 'locked'
  }

  return (
    <div className="py-8">
      <PageTitle title="Factions" />

      {error && (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2 mb-4">{error}</p>
      )}

      {/* Invitation letters — collapsible; each card also surfaces its own status below */}
      {character && invitations.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setInvitationsExpanded((v) => !v)}
            className="eyebrow"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              fontSize: 9,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: invitationsExpanded ? 8 : 0,
            }}
            aria-expanded={invitationsExpanded}
          >
            <span>{invitationsExpanded ? '▾' : '▸'}</span>
            <span>
              {t('index.recentInvitations', { count: invitations.length })}
            </span>
          </button>
          {invitationsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {invitations.map((inv) => {
                return (
                  <div
                    key={inv.faction_slug}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: `linear-gradient(135deg, ${factionCssVar(inv.faction_slug, 'light')}, transparent)`,
                      borderLeft: `3px solid ${factionCssVar(inv.faction_slug, 'border')}`,
                    }}
                  >
                    <span className="eyebrow">{t('index.inviteBadge')}</span>
                    <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)', flex: 1 }}>
                      <Trans
                        t={t}
                        i18nKey="index.invitedToJoin"
                        values={{ faction: inv.faction_name }}
                        components={[
                          <span key="0" />,
                          <span key="1" style={{ fontWeight: 700, color: factionCssVar(inv.faction_slug) }} />,
                        ]}
                      />
                    </span>
                    <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', fontSize: 8 }}>
                      {relativeTime(inv.delivered_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Logged-out hint */}
      {!character && (
        <p className="font-body text-sm text-muted mb-6">
          {t('index.loggedOutHint')}
        </p>
      )}

      {/* Faction directory grid — one uniform 360×300 archetype tile per faction.
          The tile's CTA visits the faction's detail page, which owns the Join block. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        {sortedFactions.map((f) => (
          <div
            key={f.slug}
            style={{ opacity: statusFor(f.slug) === STATUS_DEFECTED ? 0.5 : 1 }}
          >
            <FactionSelectCard
              faction={f.slug}
              state={selectState(f.slug)}
              onVisit={() => navigate(`/factions/${f.slug}`)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
