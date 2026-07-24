import type { ReactNode } from 'react'
import { factionFill } from '../../utils/factions'

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
 *
 * `unaffiliated` (#794) is set by the caller for the na/Unaffiliated glyph chip,
 * where `tint` would resolve to neutral grey. Its identity is the spectrum
 * (ADR-0039), which has no single scalar, so a selected na chip trades the
 * grey ring+glow for a rainbow `frame` border; the glow is dropped because a
 * single-colour box-shadow cannot carry the spectrum, so the frame alone
 * carries selection. The caller passes `!isKnownFaction(slug)` (a VALUE test,
 * not key presence, #749) — so every non-na chip stays pixel-identical.
 */
export function Chip({
  on,
  onClick,
  tint,
  ariaLabel,
  iconOnly,
  unaffiliated,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  ariaLabel?: string
  iconOnly?: boolean
  unaffiliated?: boolean
  children: ReactNode
}) {
  // ponytail: one style object with a handful of ternaries rather than two chip
  // components — the two variants share every box property but the fill.
  const ring = tint ?? 'var(--color-text-primary)'
  // Selected na glyph chip: the spectrum arrives as a border ring, replacing
  // the grey ring/glow. `frameStyle` overrides background/border/boxSizing.
  const useFrame = Boolean(iconOnly && on && unaffiliated)
  const frameStyle = useFrame ? factionFill(null, 'frame') : undefined

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
        // not reflow the row by a pixel. na's frame carries its own selection,
        // so the coloured glow is dropped there (a solid glow can't be spectral).
        boxShadow: iconOnly && on && !useFrame ? `0 0 0 2px ${ring}, 0 0 8px ${ring}` : undefined,
        opacity: iconOnly && !on ? 0.85 : undefined,
        borderRadius: 999,
        padding: iconOnly ? 'var(--space-xs)' : 'var(--space-sm) var(--space-md)',
        minHeight: 36,
        minWidth: iconOnly ? 36 : undefined,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        // Spread last so the rainbow frame's background/border/boxSizing win
        // over the scalar ring above. Empty for every non-na chip.
        ...frameStyle,
      }}
    >
      {tint && !iconOnly && (
        <i style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: tint }} />
      )}
      {children}
    </button>
  )
}
