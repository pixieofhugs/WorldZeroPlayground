import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'
import type { CurrentUser } from './auth'
import { dropAllCaches } from '../utils/cacheEpoch'
import { notifyRequestsChanged } from '../utils/requestsBus'

// Faction name/description prose is no longer backend-emitted (issue #461): the
// row is slug + status only (ADR-0038), and the frozen English words live in the
// factions.json catalog. Resolve display copy with factionName(slug) /
// factionDescription(slug) from utils/factions.
export type FactionOut = components['schemas']['FactionOut']

export type FactionStatusOut = components['schemas']['FactionStatusOut']

export type InvitationLetterOut = components['schemas']['InvitationLetterOut']

/**
 * `invitations` arrives WITH the status map (#1384). `GET /factions/invitations`
 * ran the same query the status map was already built from, and every caller
 * requested the pair, so there is no longer a second endpoint to call.
 */
export type FactionPageOut = components['schemas']['FactionPageOut']

export async function getFactions(): Promise<FactionOut[]> {
  const { data } = await apiGet('/factions')
  return data
}

export async function getFactionStatus(): Promise<FactionPageOut> {
  const { data } = await apiGet('/factions/status')
  return data
}

/**
 * Join or defect to a faction; answers the refreshed `CurrentUser` (#1383).
 *
 * Membership moves the faction slug, the level-jump allowance, the capability
 * flags and the sticky `albescent_revealed` reveal together, and all of those
 * ride on `/auth/me`. The POST now carries that whole object, so callers hand
 * it straight to `applyUser()` instead of chasing it with `refetch()`.
 *
 * IT ALSO MOVES THE BELL (#2288)
 * ------------------------------
 * The join answers one `invitation_letter` and destroys another, and both are
 * rows the bell counts: the TARGET faction's letter stops asking anything the
 * moment you stand in it (ADR-0070 reads "answered" off the character), and the
 * LEFT faction's letter is deleted outright because you cannot rejoin what you
 * walked out of (#2218). So `pending_requests_count` drops server-side on this
 * write — and `SidebarProvider`, which holds that number above the router and
 * otherwise refetches only when the CHARACTER ID moves (#1390), never notices.
 * Without the bus the bell reads 1 over an `/updates` page that says nothing is
 * waiting, until a hard reload.
 *
 * Fired HERE rather than at the call sites: four surfaces join a faction — the
 * feed card, the invitation popup, the Albescent invitation and the faction
 * page's own button — and three of them never fired it. One place they all
 * route through is one place to be right, the same posture `duel.ts`,
 * `praxis.ts` and `nudge.ts` already take.
 */
export async function chooseFaction(factionSlug: string): Promise<CurrentUser> {
  const { data } = await apiPost('/factions/choose', { body: { faction_slug: factionSlug } })
  // `GET /factions` is viewer-scoped: Albescent is omitted until the account has
  // been revealed to it (ADR-0027), and joining is what reveals it. The
  // directory is otherwise deploy-scoped and held for the whole session
  // (ADR-0072), so the reveal has to be answered as the mutation it is — a timer
  // short enough to catch it would defeat the class.
  dropAllCaches()
  notifyRequestsChanged()
  return data
}
