import type { ReactNode } from 'react'

/**
 * Touch-native filter idiom shared by the mobile browse pages — a labelled,
 * horizontal-scroll row of pill chips. Lifted into components/ui on the third
 * copy (#644): DefaultTasks and DefaultPlayers each kept a private clone, and the
 * praxis feed made three. One home, token-only styling so the no-raw-style-values
 * ratchet stays green.
 */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="eyebrow" style={{ flex: 'none' }}>
        {label}
      </span>
      <div className="flex gap-2 pb-0.5" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

/**
 * A single pill chip. `on` is the selected state; `tint` renders a small square
 * swatch (used for the faction chips). Uppercase mono-ish body voice.
 *
 * `iconOnly` (#731) switches to the glyph variant used by the mobile faction
 * filter: the children are an icon, so the chip goes square-ish, `tint` becomes
 * a selected-state *ring* instead of a swatch, and `ariaLabel` carries the name
 * the visible text no longer does. The dark-inverted selected fill of the text
 * variant is deliberately not reused — it would fight a faction sigil's own
 * colours — so selection reads as the ring plus full opacity, matching the
 * desktop faction pennants (STYLE §7: inactive 0.85, active 1, no desaturate).
 */
export function Chip({
  on,
  onClick,
  tint,
  ariaLabel,
  iconOnly,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  ariaLabel?: string
  iconOnly?: boolean
  children: ReactNode
}) {
  // ponytail: one style object with a handful of ternaries rather than two chip
  // components — the two variants share every box property but the fill.
  const ring = tint ?? 'var(--color-text-primary)'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={iconOnly ? on : undefined}
      className="font-body uppercase"
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: iconOnly ? 'center' : undefined,
        gap: 'var(--space-xs)',
        fontSize: 'var(--text-md)',
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.05em',
        color: on && !iconOnly ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on && !iconOnly ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
        border: `1px solid ${
          iconOnly ? (on ? ring : 'var(--color-border-strong)') : on ? 'transparent' : 'var(--color-border-strong)'
        }`,
        // Ring is a box-shadow, not a thicker border, so selecting a chip does
        // not reflow the row by a pixel.
        boxShadow: iconOnly && on ? `0 0 0 2px ${ring}, 0 0 8px ${ring}` : undefined,
        opacity: iconOnly && !on ? 0.85 : undefined,
        borderRadius: 999,
        padding: iconOnly ? 'var(--space-xs)' : 'var(--space-sm) var(--space-md)',
        minHeight: 36,
        minWidth: iconOnly ? 36 : undefined,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {tint && !iconOnly && (
        <i style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: tint }} />
      )}
      {children}
    </button>
  )
}
