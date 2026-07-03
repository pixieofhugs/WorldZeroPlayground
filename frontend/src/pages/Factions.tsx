import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFactions, getFactionStatus, getInvitations } from '../api/factions'
import type { FactionOut, FactionPageOut, InvitationLetterOut } from '../api/factions'
import PageTitle from '../components/ui/PageTitle'
import FactionCard from '../components/cards/FactionCard'
import { extractError } from '../utils/errors'
import { factionCssVar } from '../utils/factions'
import { relativeTime } from '../utils/dates'
import { useAuth } from '../auth/AuthContext'

const AGED_OUT_SLUG = 'aged_out'
const NA_SLUG = 'na'

const STATUS_MEMBER = 'member'
const STATUS_INVITED = 'invited'
const STATUS_NOT_INVITED = 'not_invited'
const STATUS_DEFECTED = 'defected'
const STATUS_CAN_RETURN = 'can_return'

/** Factions that should be hidden from the player-facing grid */
const HIDDEN_SLUGS = new Set([NA_SLUG, AGED_OUT_SLUG, 'ua'])

/**
 * Factions grid — a directory of pure PREVIEW cards. Each whole card is a link
 * to the faction's detail page (`/factions/:slug`), where ALL membership actions
 * (Join / Leave / Accept / Decline) now live (issue #347). The grid itself
 * carries no interactive controls; it only previews name, description, and the
 * viewer's status, and orders the cards by that status.
 */
export default function Factions() {
  const { user } = useAuth()
  const character = user?.character ?? null

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

  if (loading) return <div className="py-8 font-body text-muted">Loading...</div>

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
              Recent Invitations ({invitations.length})
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
                    <span className="eyebrow">INVITE</span>
                    <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)', flex: 1 }}>
                      You've been invited to join{' '}
                      <span style={{ fontWeight: 700, color: factionCssVar(inv.faction_slug) }}>{inv.faction_name}</span>
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
          Everyone starts unaffiliated. Earn an invitation through task work to join a faction.
        </p>
      )}

      {/* Faction grid — each whole card links to the faction's detail page,
          where the membership actions live (issue #347). */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {sortedFactions.map((f) => {
          const status = statusFor(f.slug)
          const isDefected = status === STATUS_DEFECTED

          // "welcome_back" reads better than the raw "can_return" status badge.
          const cardStatus = status === STATUS_CAN_RETURN ? 'welcome_back' : status

          // Compact per-card invitation marker (when an open letter exists).
          // Skip for current-member / defected states where it would be noise.
          const invitation = invitationBySlug[f.slug]
          const invitationNote =
            invitation && status !== STATUS_MEMBER && status !== STATUS_DEFECTED
              ? relativeTime(invitation.delivered_at)
              : null

          return (
            <div
              key={f.slug}
              style={{
                flex: '1 1 280px',
                minWidth: 260,
                maxWidth: 420,
                opacity: isDefected ? 0.5 : 1,
              }}
            >
              <Link
                to={`/factions/${f.slug}`}
                aria-label={`View ${f.name}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <FactionCard
                  faction={f}
                  status={cardStatus}
                  invitationNote={invitationNote}
                />
              </Link>

              {/* Not-invited hint */}
              {character && status === STATUS_NOT_INVITED && (
                <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 6, fontStyle: 'italic' }}>
                  Complete tasks from this faction to unlock an invitation.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
