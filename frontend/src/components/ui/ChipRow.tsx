import type { ReactNode } from 'react'
import { factionFill } from '../../utils/factions'

/** Mobile browse pages' labelled, horizontal-scroll row of pill chips (#644). */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="label-heading" style={{ flex: 'none' }}>
        {label}
      </span>
      <div className="flex gap-2 pb-0.5" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

/**
 * A pill chip. `tint` draws a small swatch.
 *
 * - `iconOnly` (#731): glyph chip; `tint` becomes a selected ring and
 *   `ariaLabel` names it. No inverted fill (it would fight the sigil);
 *   STYLE §7 opacity 0.85 inactive.
 * - `unaffiliated` (#794): na chip; its spectrum (ADR-0039) has no scalar, so
 *   selection is a rainbow `frame` border, no glow.
 * - `sigilText` (#1824): sigil + name, propose-task geometry, `role="radio"`.
 *   Gated on the flag so the other variants stay pixel-identical
 *   (`chipVariants.test.tsx`).
 */
export function Chip({
  on,
  onClick,
  tint,
  ariaLabel,
  iconOnly,
  unaffiliated,
  sigilText,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  ariaLabel?: string
  iconOnly?: boolean
  unaffiliated?: boolean
  sigilText?: boolean
  children: ReactNode
}) {
  // ponytail: one style object of ternaries, not separate chip components.
  const ring = tint ?? 'var(--color-text-primary)'
  const useFrame = Boolean((iconOnly || sigilText) && on && unaffiliated)
  const frameStyle = useFrame ? factionFill(null, 'frame') : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      role={sigilText ? 'radio' : undefined}
      aria-checked={sigilText ? on : undefined}
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
        lineHeight: sigilText ? 1 : undefined,
        color: sigilText
          ? on
            ? 'var(--color-text-primary)'
            : 'var(--color-text-secondary)'
          : on && !iconOnly
            ? 'var(--color-text-on-accent)'
            : 'var(--color-text-secondary)',
        background: sigilText
          ? on && !useFrame
            ? `color-mix(in srgb, ${ring} 14%, var(--color-bg-surface))`
            : 'var(--color-bg-surface)'
          : on && !iconOnly
            ? 'var(--color-text-primary)'
            : 'var(--color-bg-surface)',
        // Selection changes colour, never width, so wrapped chips can't reflow.
        border: sigilText
          ? `2px solid ${on ? ring : 'var(--color-border-strong)'}`
          : `1px solid ${
              iconOnly ? (on ? ring : 'var(--color-border-strong)') : on ? 'transparent' : 'var(--color-border-strong)'
            }`,
        // A box-shadow ring so selection doesn't reflow.
        boxShadow: sigilText
          ? on && !useFrame
            ? `0 0 8px color-mix(in srgb, ${ring} 45%, transparent)`
            : undefined
          : iconOnly && on && !useFrame
            ? `0 0 0 2px ${ring}, 0 0 8px ${ring}`
            : undefined,
        opacity: sigilText ? (on ? undefined : 0.88) : iconOnly && !on ? 0.85 : undefined,
        borderRadius: 999,
        padding: sigilText
          ? '0 var(--space-md)'
          : iconOnly
            ? 'var(--space-xs)'
            : 'var(--space-sm) var(--space-md)',
        minHeight: sigilText ? 40 : 36,
        minWidth: iconOnly ? 36 : undefined,
        boxSizing: sigilText ? 'border-box' : undefined,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: sigilText
          ? 'box-shadow 120ms, color 120ms, border-color 120ms, background 120ms'
          : undefined,
        // Last, so na's frame wins.
        ...frameStyle,
      }}
    >
      {tint && !iconOnly && !sigilText && (
        <i style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: tint }} />
      )}
      {children}
    </button>
  )
}
