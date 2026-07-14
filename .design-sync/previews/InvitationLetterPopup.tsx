// InvitationLetterPopup preview cells — the #243 faction "prospectus" pop-up.
// ONE adaptive letter skinned per faction via the --faction-<slug>-* tokens.
// Copy (kicker/headline/pitch/terms/perks/cta) lives in factions.json under
// <slug>.invitation.*, resolved through i18next (wired in the harness). Sweep a
// few factions to show the accent + border + light-slip retinting. cardMode:single
// + 460x600 keeps the position:fixed overlay inside its capture card.
import { InvitationLetterPopup } from 'worldzero-frontend'
import { noop } from './_fixtures'

/** UA — the gilt salon's enrollment prospectus. */
export function UaProspectus() {
  return <InvitationLetterPopup factionSlug="ua" onClose={noop} />
}

/** SNIDE — the same frame retinted to the ransom-note faction accent. */
export function SnideProspectus() {
  return <InvitationLetterPopup factionSlug="snide" onClose={noop} />
}

/** Ephemerists — archival blue accent, terms slip + perks list populated. */
export function EphemeristsProspectus() {
  return <InvitationLetterPopup factionSlug="ephemerists" onClose={noop} />
}

/** Wow — the warmest accent, to check the border + shadow contrast. */
export function WowProspectus() {
  return <InvitationLetterPopup factionSlug="wow" onClose={noop} />
}
