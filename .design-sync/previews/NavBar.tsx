// NavBar preview cell — the sticky top nav. Auth is mocked to a logged-in UA user,
// so it renders the authed state: the rainbow-underlined wordmark, the primary
// nav links, the theme toggle, the current character link, and the log-out button
// (admin-only controls stay hidden for a non-admin). It takes no props. It spans
// the full content width, so it wants a wide cell (see B10-ui-top.md).
import { NavBar } from 'worldzero-frontend'

/** The authenticated top nav in a wide frame. */
export function Authenticated() {
  return (
    <div style={{ width: '100%', minWidth: 900 }}>
      <NavBar />
    </div>
  )
}
