// NotificationsSection preview cell — Notifications (#1047/#2971): nine events,
// two independent switches each.
//
// WHAT THIS CARD CAN AND CANNOT SHOW. The section's rows arrive from
// `GET /me/notification-prefs`, and the preview harness runs with no network
// (the provider supplies AuthContext directly and intercepts no requests), so
// `prefs` stays null and this renders the card's RESTING state: eyebrow, lead,
// the email-not-delivered line, and the status line. Offline the fetch REJECTS
// rather than hanging, so that line reads the card's own ERROR copy ("Unable to
// reach the server"), not "loading" — the component's real failure state, drawn
// in its real chrome. Honest, but not the substance.
//
// The nine rows are shown by the `NotificationRows` card instead. The component
// is split for precisely this reason and says so in its own docstring: an effect
// never runs under `renderToStaticMarkup`, so the section rendered whole would
// only ever prove the loading line. Read the two cards together.
//
// ONE CELL: with no prop to pin the fetch, this section has one reachable state.
import { NotificationsSection } from 'worldzero-frontend'

export function Notifications() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <NotificationsSection sectionId="sec-notifications" />
    </div>
  )
}
