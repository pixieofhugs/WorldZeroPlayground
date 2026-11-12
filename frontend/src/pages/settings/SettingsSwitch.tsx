import type { CSSProperties } from 'react'

/**
 * The Settings two-state switch (#2154). Presentational.
 *
 * The spectrum edge is a transparent border over two background layers (well on
 * `padding-box`, ramp on `border-box`): borders cannot hold a gradient (ADR-0039)
 * and `border-image` ignores `border-radius`. Same technique as `.filter-rail`.
 *
 * Disabled is the ruled exception to "hide, don't disable" (#2154): with reduced
 * motion the Animations switch renders OFF and says why in its helper line and
 * `label`. `aria-disabled`, not `disabled`, so it stays in the tab order.
 *
 * The lock glyph is for locked-ON only (#2844): locked-off already differs by its
 * flat edge, but locked-on was pixel-identical to a live switch. The canvas's
 * `.45` dim is not ported: it drops every ring stop under 3:1.
 */
interface SettingsSwitchProps {
  readonly checked: boolean
  /** Carries the REASON when the switch is not movable. */
  readonly label: string
  readonly onToggle: () => void
  /** Not the reader's to change; see above. */
  readonly disabled?: boolean
  readonly describedById?: string
  readonly testId?: string
}

const TRACK_WELL = 'linear-gradient(var(--switch-well), var(--switch-well)) padding-box'
const TRACK_EDGE_ON = 'var(--faction-default-rainbow) border-box'
const TRACK_EDGE_OFF =
  'linear-gradient(var(--color-border-strong), var(--color-border-strong)) border-box'

/**
 * The ring's compliant edge (#2845), ON only. The rainbow is the only state
 * signal and its yellow/green stops miss 1.4.11's 3:1 on the well; the stops may
 * not move and no well density fixes both. This hairline alone clears it (6.89 /
 * 7.34:1, in `factionContrast.test.ts`).
 */
const TRACK_RING_HAIRLINE = 'inset 0 0 0 1px var(--color-text-tertiary)'

const track: CSSProperties = {
  position: 'relative',
  flexShrink: 0,
  width: 48,
  height: 28,
  borderRadius: 999,
  border: '1.5px solid transparent',
  boxSizing: 'border-box',
  padding: 0,
  transition: 'background 180ms ease',
}

const knob: CSSProperties = {
  position: 'absolute',
  top: 3,
  width: 20,
  height: 20,
  borderRadius: 999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'inset 0 0 0 1px var(--switch-thumb-edge)',
  transition: 'left 180ms ease',
}

/**
 * Locked-on glyph (#2844), decorative. Ink is `--color-text-tertiary`, not
 * `--switch-thumb-edge`: on the thumb's fill the latter is 1.44 / 1.65:1,
 * tertiary 5.66 / 6.04:1 (row in `factionContrast.test.ts`).
 */
function LockGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10">
      <path
        d="M3.5 5V3.6a2.5 2.5 0 0 1 5 0V5"
        fill="none"
        stroke="var(--color-text-tertiary)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <rect x="2.5" y="5" width="7" height="5.5" rx="1.1" fill="var(--color-text-tertiary)" />
    </svg>
  )
}

export default function SettingsSwitch({
  checked,
  label,
  onToggle,
  disabled = false,
  describedById,
  testId,
}: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-describedby={describedById}
      data-testid={testId}
      onClick={disabled ? undefined : onToggle}
      style={{
        ...track,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: `${TRACK_WELL}, ${checked ? TRACK_EDGE_ON : TRACK_EDGE_OFF}`,
        boxShadow: checked ? TRACK_RING_HAIRLINE : undefined,
      }}
    >
      <span
        aria-hidden
        style={{
          ...knob,
          left: checked ? 22 : 3,
          background: checked ? 'var(--switch-thumb)' : 'var(--switch-thumb-off)',
        }}
      >
        {checked && disabled && <LockGlyph />}
      </span>
    </button>
  )
}
