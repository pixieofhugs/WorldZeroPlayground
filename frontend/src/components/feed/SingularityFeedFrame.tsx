import type { ReactNode } from 'react'

/**
 * Singularity per-faction feed frame (surface #12, SPEC-faction-ui-profile.md).
 *
 * A thin presentational WRAPPER: it skins the neutral feed card (`children`) as a
 * terminal dispatch/printout. The frame supplies only the OUTER chrome — a
 * terminal-black slab with a signal-blue inset border, scanline overlay, and a
 * `>` boot/prompt strip header — and renders the unchanged card as the printout
 * body. It must NOT reimplement the card internals; those arrive via `children`.
 *
 * Singularity is ALWAYS DARK: its --faction-singularity-* tokens are identical in
 * both themes, so the container styles itself with them and reads as a terminal
 * regardless of the global theme — it never mutates data-theme.
 */

// Token shorthands — every color resolves to a --faction-singularity-* var.
const VOID = 'var(--faction-singularity-card-bg)' // terminal black
const PHOSPHOR = 'var(--faction-singularity-card-accent)' // green
const SIGNAL = 'var(--faction-singularity-card-muted)' // blue chrome
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)'

// color-mix helper for the blue chrome at reduced opacity.
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

export default function SingularityFeedFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${BORDER_HARD}`,
        background: VOID,
        color: PHOSPHOR,
        fontFamily: FONT,
      }}
    >
      {/* inset signal border */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 4,
          border: `1px solid ${signal(18)}`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      {/* scanline overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 3,
          background:
            'repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(255,255,255,0.018) 2px,rgba(255,255,255,0.018) 4px)',
        }}
      />

      {/* boot/prompt strip header */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderBottom: `1px solid ${signal(20)}`,
          fontSize: 7,
          letterSpacing: '0.18em',
          color: signal(55),
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: PHOSPHOR }}>{'>'}</span>
        <span>DISPATCH · SIGNAL ONLINE</span>
      </div>

      {/* printout body — the neutral card, unchanged */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  )
}
