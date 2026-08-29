import type { CSSProperties } from 'react'

/**
 * The Settings two-state switch (#2154). Presentational — no state, no context.
 *
 * WHY THE TRACK IS A TWO-LAYER BACKGROUND AND NOT A BORDER COLOUR
 * ---------------------------------------------------------------
 * The lit track carries the spectrum on its EDGE. A `border: Npx solid` cannot
 * hold a gradient (ADR-0039) and `border-image` does not clip to
 * `border-radius`, so the sanctioned technique is a transparent border with two
 * background layers: the opaque well on `padding-box`, the ramp on
 * `border-box`. `.filter-rail` in `index.css` paints its ring the same way and
 * documents the same constraint. The off state swaps only the `border-box`
 * layer, for a flat `--color-border-strong` edge.
 *
 * The well and thumb read the `--switch-*` control-chrome family rather than a
 * private set: `--switch-well` and `--switch-thumb-edge` are byte-identical to
 * what this control needs, and minting twins for them is the duplication this
 * repo keeps collapsing. See the note beside `--switch-thumb-off` in
 * `index.css` about the family's name.
 *
 * THE RING NEEDS A SECOND, COMPLIANT EDGE (#2845). The rainbow is the only
 * perceivable state signal on this control — the thumb alone is 1.22:1 /
 * 1.30:1 against the well — and two of its seven stops read under 1.4.11's
 * 3:1 there in light. The stops are the faction hue wheel and may not move
 * for a switch, and no `--switch-well` density clears both without going
 * effectively black (see `--switch-ring-hairline` in `index.css`), so
 * `TRACK_RING_HAIRLINE` draws a solid, always-opaque line just inside the
 * rainbow border on the ON state, which alone carries the 3:1 the ring itself
 * cannot at every stop. The rainbow is emphasis once that edge exists.
 *
 * DISABLED IS A REAL STATE HERE, AND IT IS DELIBERATE. The house rule is to
 * hide a control a reader cannot use rather than render it dead — this is the
 * ruled exception (#2154). When the OS asks for reduced motion the Animations
 * switch cannot be moved, and hiding it would leave a reader wondering where
 * the setting went; showing it lit would be a control that does nothing, which
 * is the false-affordance class of #1263. So it renders OFF, unmovable, and
 * says why — in the visible helper line AND in the accessible name, which is
 * why `label` is a whole sentence in that case rather than "Animations".
 *
 * `aria-disabled` rather than the `disabled` attribute, on purpose: a
 * `disabled` button leaves the tab order, so the one reader most likely to need
 * the explanation is the one who can never reach it.
 */
interface SettingsSwitchProps {
  readonly checked: boolean
  /** The accessible name. Carries the REASON when the switch is not movable. */
  readonly label: string
  readonly onToggle: () => void
  /** True when the setting is not the reader's to change. See the note above. */
  readonly disabled?: boolean
  /** Id of the row note explaining the state, for `aria-describedby`. */
  readonly describedById?: string
  readonly testId?: string
}

const TRACK_WELL = 'linear-gradient(var(--switch-well), var(--switch-well)) padding-box'
const TRACK_EDGE_ON = 'var(--faction-default-rainbow) border-box'
const TRACK_EDGE_OFF =
  'linear-gradient(var(--color-border-strong), var(--color-border-strong)) border-box'

/**
 * The rainbow edge's compliant boundary (#2845). Two of the ring's seven
 * stops (yellow, green) read under 1.4.11's 3:1 against `--switch-well` in
 * light, and the stops may not move to fix a switch — see
 * `--switch-ring-hairline` in `index.css` for the measurement that ruled out
 * darkening the well instead. This hairline is a second, always-opaque edge
 * drawn just inside the rainbow border; it alone clears the floor (6.89:1
 * light / 7.34:1 dark, asserted in `factionContrast.test.ts`), so once it is
 * there the rainbow is emphasis on a boundary that is already perceivable,
 * and the stops themselves stay unmeasured. ON only: the OFF edge is already
 * a flat, non-hue line and was never the pairing this issue found.
 */
const TRACK_RING_HAIRLINE = 'inset 0 0 0 1px var(--switch-ring-hairline)'

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
  display: 'block',
  boxShadow: 'inset 0 0 0 1px var(--switch-thumb-edge)',
  transition: 'left 180ms ease',
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
      />
    </button>
  )
}
