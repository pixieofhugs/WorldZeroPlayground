// SettingsRow preview cells — one labelled setting inside a SettingsCard
// (#2154): title, help sentence, an optional quieter note, and whatever control
// sits to the right. Shared so the sibling sections get the design's row rhythm
// — a 1px rule between rows, none under the last — without each restating it.
//
// TYPE SIZES ARE THE REPO'S, NOT THE CANVAS'S: the design draws 14px titles
// over 12px help, but the content floor (#627) puts anything that can run to a
// paragraph at --text-content, so hierarchy comes from INK, not size. Both
// title and help are the same step; primary over secondary is the split.
import { SettingsRow, SettingsSwitch } from 'worldzero-frontend'
import { noop } from './_fixtures'

const ground: React.CSSProperties = { background: 'var(--color-bg-page)', padding: 24 }

// The rows live inside a SettingsCard in the real page; this stands in for that
// card so the row rhythm reads against the surface it actually sits on.
const pane: React.CSSProperties = {
  padding: 28,
  maxWidth: 720,
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
}

/** The row rhythm: three rows, rules between them, none under the last. This is
 *  the whole reason the primitive is shared rather than restated per section. */
export function RowRhythm() {
  return (
    <div style={ground}>
      <div style={pane}>
      <SettingsRow title="Animations" help="Ornament and motion across the site.">
        <SettingsSwitch checked label="Animations" onToggle={noop} />
      </SettingsRow>
      <SettingsRow title="Reduced motion" help="Keep transitions to a minimum.">
        <SettingsSwitch checked={false} label="Reduced motion" onToggle={noop} />
      </SettingsRow>
      <SettingsRow title="Analytics cookies" help="Anonymous counts of which pages get read." last>
        <SettingsSwitch checked={false} label="Analytics cookies" onToggle={noop} />
      </SettingsRow>
      </div>
    </div>
  )
}

/** The note line — the quieter third line where a row explains why its control
 *  is not movable. Rendered as the control's description, so `noteId` is what
 *  the switch points `aria-describedby` at. */
export function WithNote() {
  return (
    <div style={ground}>
      <div style={pane}>
      <SettingsRow
        title="Animations"
        help="Ornament and motion across the site."
        note="Your system asks for reduced motion, so this is off and cannot be turned on here."
        noteId="animations-note"
        last
      >
        <SettingsSwitch
          checked={false}
          label="Animations are off because your system asks for reduced motion"
          onToggle={noop}
          disabled
          describedById="animations-note"
        />
      </SettingsRow>
      </div>
    </div>
  )
}

/** A row whose help runs long — the help sentence wraps at the content floor
 *  and the control stays pinned top-right, which is why the row aligns to
 *  flex-start rather than centre. */
export function LongHelp() {
  return (
    <div style={ground}>
      <div style={pane}>
      <SettingsRow
        title="Essential cookies"
        help="These keep you signed in and remember which character you are playing. They are how the site works at all, so they cannot be switched off — there is nothing to consent to."
        last
      >
        <SettingsSwitch checked label="Essential cookies" onToggle={noop} disabled />
      </SettingsRow>
      </div>
    </div>
  )
}
