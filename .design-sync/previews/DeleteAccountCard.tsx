// DeleteAccountCard preview cell — the danger zone (#2161), confirmed by the
// email and naming every life it ends.
//
// It reads `useAuth()` for the account and fetches the character list to name
// what the deletion would take; with no network in the harness that list stays
// empty, so this is the card's resting state — the warning, the email field, and
// the control that stays shut until the address matches.
//
// ONE CELL: the confirm dialog opens from internal state (`open`), so the opened
// state cannot be pinned from a prop.
import { DeleteAccountCard } from 'worldzero-frontend'

export function DangerZone() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <DeleteAccountCard sectionId="sec-delete" />
    </div>
  )
}
