// NotificationRows — the nine rows behind NotificationsSection (#1047/#2971),
// and the only way to see them in a card. The section fetches its prefs, and
// the harness has no network, so the section's own card can only ever show its
// loading line; the component is split out for exactly that reason and its
// docstring says so.
//
// THE PREFS ARE THE REPO'S OWN FIXTURE, ported verbatim from
// `pages/settings/__tests__/notificationPrefs.test.tsx`'s `DEFAULTS` — so the
// card shows the real shipped defaults rather than an invented set, and it
// exercises BOTH lock kinds the card explains:
//
//   • the three request rows (duel_challenge, collab_invite, invitation_letter)
//     are locked ON — the Requests queue is their only home (ADR-0070);
//   • `level_up` is locked OFF — it has no feed row at all.
//
// Email is free on every row including the locked three, which is the whole
// point of the two-switch design, and the mixed by_email column here shows it.
//
// TWO CELLS, and the axis is the master row: `Default` is the state above;
// `AllOff` drops every unlocked page switch, so the locked rows visibly do not
// move — the one behaviour a reader most needs to believe.
import { NotificationRows } from 'worldzero-frontend'
import { noop } from './_fixtures'
import type { NotificationPrefs } from '../../frontend/src/pages/settings/notificationPrefs'

const DEFAULTS: NotificationPrefs = {
  duel_challenge: { on_updates: true, by_email: true, locked: true },
  collab_invite: { on_updates: true, by_email: true, locked: true },
  invitation_letter: { on_updates: true, by_email: true, locked: true },
  comment_on_mine: { on_updates: true, by_email: true, locked: false },
  comment_mention: { on_updates: true, by_email: true, locked: false },
  vote_on_mine: { on_updates: true, by_email: false, locked: false },
  level_up: { on_updates: false, by_email: false, locked: true },
  era_announcement: { on_updates: true, by_email: false, locked: false },
  global_task: { on_updates: true, by_email: false, locked: false },
}

const ALL_OFF: NotificationPrefs = Object.fromEntries(
  Object.entries(DEFAULTS).map(([key, pref]) => [
    key,
    pref.locked ? pref : { ...pref, on_updates: false },
  ]),
)

function Card({ prefs }: { prefs: NotificationPrefs }) {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <NotificationRows prefs={prefs} onToggle={noop} onToggleAll={noop} />
    </div>
  )
}

export function Default() {
  return <Card prefs={DEFAULTS} />
}

export function AllOff() {
  return <Card prefs={ALL_OFF} />
}
