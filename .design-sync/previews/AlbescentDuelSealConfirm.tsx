// AlbescentDuelSealConfirm preview cells (epic #2496) — the seal-a-duel dialog
// wearing Albescent's dress. A wrapper over the na dialog: same stakes copy,
// same two decisions, with the surface class carrying the prism ground.
//
// The dialog is a `position: fixed; inset: 0` overlay, so on its own it attaches
// to the viewport and an element screenshot clips it. The Stage below re-scopes
// it to `absolute` inside a fixed-size box (`!important` beats the component's
// own class), so each cell shows the whole dialog as a user meets it.
// Preview-only — the shipped app mounts it unchanged.
import { AlbescentDuelSealConfirm } from 'worldzero-frontend'
import { duelFor, noop } from './_fixtures'

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 620, overflow: 'hidden' }}>
      <style>{`.duel-scope > div { position: absolute !important; inset: 0 !important; }`}</style>
      <div className="duel-scope" style={{ position: 'absolute', inset: 0 }}>
        {children}
      </div>
    </div>
  )
}

/** Sealing a submission. Every stakes figure is derived from the task's base points. */
export function Submit() {
  return (
    <Stage>
      <AlbescentDuelSealConfirm
        duel={duelFor('albescent')}
        viewerCharacterId={7}
        taskPointValue={30}
        onConfirm={noop}
        onCancel={noop}
      />
    </Stage>
  )
}

/** The forfeit beat — the same dialog carrying the other decision. */
export function Forfeit() {
  return (
    <Stage>
      <AlbescentDuelSealConfirm
        duel={duelFor('albescent')}
        viewerCharacterId={7}
        taskPointValue={30}
        mode="forfeit"
        onConfirm={noop}
        onCancel={noop}
      />
    </Stage>
  )
}

/** Request in flight — the controls lock while it is out. */
export function Busy() {
  return (
    <Stage>
      <AlbescentDuelSealConfirm
        duel={duelFor('albescent')}
        viewerCharacterId={7}
        taskPointValue={30}
        busy
        onConfirm={noop}
        onCancel={noop}
      />
    </Stage>
  )
}
