// SidebarColumn — the rail plus its fold-away handle (#1191). The column is what
// ShellContent actually mounts; `Sidebar` is the panel stack inside it.
//
// MIND THE BREAKPOINT. The wrapper is `hidden lg:block`: below Tailwind's `lg`
// (1024px) this component renders NOTHING at all. The card is wide enough, which
// is why `cardMode: column` stays — narrow it and the card goes blank, and
// nothing in the render check would call that a failure.
//
// TWO CELLS, and the axis is the only prop that changes what is drawn:
// `Expanded` shows handle + rail; `Collapsed` hides the rail body and leaves the
// handle, which in the real shell is the only way back — the reason the rail is
// hidden rather than unmounted (state would not survive the round trip).
//
// The pending-requests count on the handle comes from a fetch, so offline it
// reads its empty value; the fold behaviour is entirely prop-driven and true.
import { SidebarColumn } from 'worldzero-frontend'
import { noop } from './_fixtures'

function Shell({ collapsed }: { collapsed: boolean }) {
  return (
    <div style={{ padding: 24, background: 'var(--color-bg-page)' }}>
      <SidebarColumn collapsed={collapsed} onToggle={noop} />
    </div>
  )
}

export function Expanded() {
  return <Shell collapsed={false} />
}

export function Collapsed() {
  return <Shell collapsed />
}
