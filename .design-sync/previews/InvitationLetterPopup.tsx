// InvitationLetterPopup preview cells — the #243 faction "prospectus" pop-up.
// ONE adaptive letter skinned per faction via the --faction-<slug>-* tokens.
// Copy (kicker/headline/pitch/terms/perks/cta) lives in factions.json under
// <slug>.invitation.*, resolved through i18next (wired in the harness). Sweep a
// few factions to show the accent + border + light-slip retinting. cardMode:single
// + 460x600 keeps the position:fixed overlay inside its capture card.
import { InvitationLetterPopup } from 'worldzero-frontend'
import { noop } from './_fixtures'

/** Overlay containment. Both these popups render a `position: fixed` root, which
 *  escapes an element screenshot no matter how tall the viewport is — `cardMode:
 *  single` + `viewport` alone does NOT solve it. Re-scoping the fixed child to
 *  `absolute` inside a sized, positioned box is the standing recipe (see any
 *  `*DuelSealConfirm` preview). Without this the card captures only whatever the
 *  modal leaves in flow — for these two, a bare "Continue" strip. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 900, overflow: 'hidden' }}>
      <style>{`.popup-scope > div { position: absolute !important; inset: 0 !important; }`}</style>
      <div className="popup-scope" style={{ position: 'absolute', inset: 0 }}>
        {children}
      </div>
    </div>
  )
}


/** UA — the gilt salon's enrollment prospectus. */
export function UaProspectus() {
  return (
    <Stage>
      <InvitationLetterPopup factionSlug="ua" onClose={noop} />
    </Stage>
  )
}

/** SNIDE — the same frame retinted to the ransom-note faction accent. */
export function SnideProspectus() {
  return (
    <Stage>
      <InvitationLetterPopup factionSlug="snide" onClose={noop} />
    </Stage>
  )
}

/** Ephemerists — archival blue accent, terms slip + perks list populated. */
export function EphemeristsProspectus() {
  return (
    <Stage>
      <InvitationLetterPopup factionSlug="ephemerists" onClose={noop} />
    </Stage>
  )
}

/** Wow — the warmest accent, to check the border + shadow contrast. */
export function WowProspectus() {
  return (
    <Stage>
      <InvitationLetterPopup factionSlug="wow" onClose={noop} />
    </Stage>
  )
}
