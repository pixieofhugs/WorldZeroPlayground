// JoinControl preview cells (#2651) — the join trio, written ONCE for all nine
// faction bodies: [Join] → the switch sentence, the error slot, and
// [Cancel] … [Confirm].
//
// It was longhand in eight of them and seven put the affirmative on the LEFT —
// a shipped global ruling (#646) broken in seven places, which is why the
// extraction takes the whole pair rather than the primary button alone.
//
// THE CONTROL OWNS BEHAVIOUR; THE KIT OWNS EVERY PIXEL. The paint arrives as a
// TYPED SKIN, not a `style` prop — a kit that forgets a button gets a compile
// error rather than an unpainted control. So the axis worth sweeping here is
// the skin, and these cells paint one control two ways.
//
// THE CONFIRM PAIR IS NOT REACHABLE FROM A STATIC CAPTURE. `confirming` is
// internal state opened by a click, so every cell below shows the OPEN state;
// varying `joining` or `joinError` out here would render four identical cards.
// The pair, its #646 order, and the error slot are covered by the DOM-less
// `joinControlOrder` guard, and `JoinConfirm` is exported stateless for exactly
// that reason.
import { JoinControl } from 'worldzero-frontend'
import type { JoinControlSkin, JoinTarget } from '../../frontend/src/components/JoinControl'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)', padding: 24, maxWidth: 420 }

const membership: JoinTarget = {
  currentFactionSlug: null,
  join: async () => {},
  joining: false,
  joinError: null,
}

/** The neutral kit's paint, built from the app's own tokens. */
const NA_SKIN: JoinControlSkin = {
  openStyle: {
    width: '100%',
    padding: 'var(--space-md)',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    background: 'var(--faction-default-rainbow)',
    color: 'var(--color-text-on-accent)',
    fontSize: 'var(--text-lg)',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  confirmStyle: {
    padding: 'var(--space-md)',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    background: 'var(--faction-default-rainbow)',
    color: 'var(--color-text-on-accent)',
    fontWeight: 700,
  },
  cancelStyle: {
    padding: 'var(--space-md)',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
}

/** A quieter, outlined kit — same control, different paint. */
const OUTLINE_SKIN: JoinControlSkin = {
  ...NA_SKIN,
  openStyle: {
    ...NA_SKIN.openStyle,
    background: 'transparent',
    color: 'var(--color-text-primary)',
    border: '1.5px solid var(--color-border-strong)',
  },
}

/** The open state as a faction body draws it: the kit's pitch above the kit's
 *  verb. `intro` is drawn in this state only — the confirm step replaces the
 *  pitch with the question. */
export function WithPitch() {
  return (
    <div style={wrap}>
      <JoinControl
        membership={membership}
        name="Unaffiliated"
        skin={NA_SKIN}
        openLabel="Join"
        joiningLabel="Joining…"
        intro={
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
            <div style={{ fontSize: 'var(--text-title)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Throw in with them
            </div>
            <p style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', margin: 'var(--space-sm) 0 0' }}>
              You can change your mind later, but not for free.
            </p>
          </div>
        }
      />
    </div>
  )
}

/** No pitch — the bare verb, which is what a modal host mounts. */
export function VerbAlone() {
  return (
    <div style={wrap}>
      <JoinControl
        membership={membership}
        name="Unaffiliated"
        skin={NA_SKIN}
        openLabel="Join"
        joiningLabel="Joining…"
      />
    </div>
  )
}

/** The skin contract: one control, two kits' paint. The box these sit in is
 *  still the kit's own — a plate, a slip, marginalia — and is not this
 *  component's business. */
export function TwoKitsOneControl() {
  return (
    <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <JoinControl
        membership={membership}
        name="Unaffiliated"
        skin={NA_SKIN}
        openLabel="Join"
        joiningLabel="Joining…"
      />
      <JoinControl
        membership={membership}
        name="Unaffiliated"
        skin={OUTLINE_SKIN}
        openLabel="Take the oath"
        joiningLabel="Swearing…"
      />
    </div>
  )
}
