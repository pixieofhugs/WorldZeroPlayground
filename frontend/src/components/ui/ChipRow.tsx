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
 *
 * `sigilText` (#1824) is the third variant: a sigil AND its faction's name, at
 * the propose-task form's own geometry (40px tall, 2px border in EVERY state so
 * selection cannot reflow the row, a 14% tint wash and a soft glow instead of a
 * ring). It keeps `iconOnly`'s selection semantics — the dark-inverted fill
 * would fight the sigil the same way — including the na frame, so it reads
 * `unaffiliated` too. It suppresses the swatch (the sigil is the mark) and
 * announces as `role="radio"`, because its chips are a radiogroup rather than
 * eight independent toggles. Every value it introduces is gated on the flag:
 * the mobile leaderboard and the praxis feed mount the other two variants and
 * must stay pixel-identical (`__tests__/chipVariants.test.tsx` is that guard).
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
  // ponytail: one style object with a handful of ternaries rather than two chip
  // components — the two variants share every box property but the fill.
  const ring = tint ?? 'var(--color-text-primary)'
  // Selected na chip (glyph or sigil+text): the spectrum arrives as a border
  // ring, replacing the grey ring/glow. `frameStyle` overrides
  // background/border/boxSizing.
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
        // 2px in both states for the sigil+text variant: selection changes the
        // border's COLOUR, never its width, so eight wrapped chips cannot
        // reflow under the pointer.
        border: sigilText
          ? `2px solid ${on ? ring : 'var(--color-border-strong)'}`
          : `1px solid ${
              iconOnly ? (on ? ring : 'var(--color-border-strong)') : on ? 'transparent' : 'var(--color-border-strong)'
            }`,
        // Ring is a box-shadow, not a thicker border, so selecting a chip does
        // not reflow the row by a pixel. na's frame carries its own selection,
        // so the coloured glow is dropped there (a solid glow can't be spectral).
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
        // Spread last so the rainbow frame's background/border/boxSizing win
        // over the scalar ring above. Empty for every non-na chip.
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
