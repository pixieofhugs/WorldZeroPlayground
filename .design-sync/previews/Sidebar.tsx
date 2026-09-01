// Sidebar — the desktop rail (#1191/#2361/#2659). Unauthored until now, which is
// why its card read pale-on-light: the rail paints its own THEME-INVARIANT paper
// from `--rail-paper`, and nothing was giving it a width or a ground to sit on.
//
// It takes NO props — every faction fact it draws comes from `useAuth()`, so the
// preview provider's mock authed UA character is what dresses it: `railFaceVars`
// returns the ua chrome roles, the panels take the member's own `--rail-line`
// hairline instead of the na rainbow ring, and `data-rail-face` repoints the
// display face. An unaffiliated viewer would get `{}` and the spectrum frame —
// that is the OTHER rail, and it is not reachable from here without a second
// auth context.
//
// THE 320 IS NOT DECORATION. `ShellContent` gives the rail a FIXED 320px grid
// column (#1562, `lg:grid-cols-[320px_minmax(0,1fr)]`), and the rail is
// `w-full` — rendered into a card-wide box it stretches and every panel's
// measure goes wrong. The wrapper reproduces the column it actually lives in.
//
// The panel bodies (tasks, activity, level track) come from hooks that fetch, so
// offline they render their empty states; the character card, the frame and the
// dress — the things the rail IS — are all auth-derived and render whole.
//
// ONE CELL: the rail has no prop to vary.
import { Sidebar } from 'worldzero-frontend'

export function Rail() {
  return (
    <div style={{ padding: 24, background: 'var(--color-bg-page)' }}>
      <div style={{ width: 320 }}>
        <Sidebar />
      </div>
    </div>
  )
}
