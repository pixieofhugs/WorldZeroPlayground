import type { CSSProperties } from 'react'

/**
 * UA full-page backdrop — the gilt salon: a parchment wall (`--ua-wall`) lit by
 * a low gilt glow from the corners and overlaid with a faint ledger dot-grid.
 * UA is always-light: its `--ua-*` / `--faction-ua-*` tokens are identical in
 * both themes, so this never flips with data-theme. Fixed behind page content
 * at z-index 0.
 */
const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: 'var(--ua-wall)',
  backgroundImage: [
    // low gilt glow — top-left origin (old gold, light)
    'radial-gradient(70% 50% at 8% 0%, color-mix(in srgb, var(--ua-gold-lt) 7%, transparent), transparent 70%)',
    // burnt-amber echo — top-right
    'radial-gradient(60% 50% at 100% 8%, color-mix(in srgb, var(--ua-orange) 6%, transparent), transparent 70%)',
    // faint ledger dot-grid (gilt ink)
    'radial-gradient(color-mix(in srgb, var(--ua-gold) 5%, transparent) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: 'auto, auto, 6px 6px',
}

export default function UABackdrop() {
  return <div style={backdropStyle} aria-hidden="true" />
}
