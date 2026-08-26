// ReturningCard preview — `/start/again`, the consent gate a returning deleted
// player meets (#2162).
//
// NOT A LOCKED DOOR AND NOT A SILENT NEW ACCOUNT. They signed in with the same
// Google or Discord identity they deleted, inside the ninety days the tombstone
// is kept (ADR-0081), so the backend recognises them and stops BEFORE minting
// anything. This card is the stop.
//
// ONE BUTTON, AND IT IS NOT AN OFFER OF THE OLD ACCOUNT (owner ruling
// 2026-08-17). There is nothing to offer: `delete_account` blanked the
// characters, the praxis and the comments, and unlinked the media in place. The
// sentence names what is gone and the control consents to starting over —
// naming a restore that cannot happen would be the one genuinely cruel version
// of this screen. Declining is the shell's escape: a returning player simply
// never presses the button, and no account is created.
//
// THE POPULATED CARD IS NOT REACHABLE OFFLINE. The body copy is dated from
// `GET /auth/returning`, which the card fetches on mount; the preview harness
// does not intercept requests, so this renders the loading line the offline app
// renders — the same honest offline state CommentThread's preview shows. The
// dated body, the confirm wiring and its failure line are covered instead by
// `runStartFresh`, which is extracted to module scope precisely because
// `renderToStaticMarkup` runs no effects and dispatches no events.
import { ReturningCard } from 'worldzero-frontend'

export function ConsentGate() {
  return (
    <div style={{ padding: 24, maxWidth: 560, background: 'var(--color-bg-page)' }}>
      <ReturningCard />
    </div>
  )
}
