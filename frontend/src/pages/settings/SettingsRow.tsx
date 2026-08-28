import type { CSSProperties, ReactNode } from 'react'

/**
 * One labelled setting inside a `SettingsCard` (#2154): a title, its help
 * sentence, an optional note, and whatever control sits to the right.
 *
 * Shared so the five sibling sections (#1047, #2155, #2156, #2157, #2158) get
 * the design's row rhythm — the 1px rule between rows, none under the last —
 * without each restating it and drifting.
 *
 * TYPE SIZES ARE THE REPO'S, NOT THE DESIGN'S. The canvas draws 14px titles
 * over 12px help; the content floor (index.css, #627) puts anything that can
 * run to a paragraph at `--text-content`, and a help sentence is exactly that.
 * Hierarchy therefore comes from ink rather than size — primary over secondary
 * — which is the same split the canvas uses on top of the size step.
 */
export interface SettingsRowProps {
  readonly title: string
  readonly help: string
  /**
   * A second, quieter line under the help — the place a row explains why its
   * control is not movable. Rendered as the control's description.
   */
  readonly note?: string
  /** Id for the note, so a control can point `aria-describedby` at it. */
  readonly noteId?: string
  /** Drops the bottom rule. The last row in a card sets this. */
  readonly last?: boolean
  /** The control. */
  readonly children: ReactNode
}

/**
 * THE ROW WRAPS, AND THE TEXT COLUMN HAS A FLOOR (#2829). Without both, a row
 * whose control is a STRING — the Account section's email and sign-in provider,
 * not a fixed 48px switch — crushed its label instead of its value: the text
 * column was `flex-1 min-w-0`, a 0% basis with no minimum, so flexbox took every
 * pixel of the compression out of it and none out of the value. At 375px with a
 * real `@gmail.com` address the label column measured 32px and the row 638px
 * tall.
 *
 * `flex-wrap` plus a basis is the whole fix, and it is per-row rather than per
 * breakpoint: the value drops to its own line exactly when the label cannot keep
 * `LABEL_MEASURE`, which is a fact about this row's control and this card's
 * width — the pane narrows when the sidebar expands, without the viewport
 * moving, so `useFormFactor` would be the wrong question here.
 */
const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  // Column gap is the design's; the row gap only exists once the value wraps,
  // and it keeps the value attached to the label it belongs to.
  gap: 'var(--space-sm) var(--space-xl)',
  paddingTop: 'var(--space-lg)',
}

/**
 * The narrowest the help sentence may be squeezed before the control gives up
 * the line. 22ch sits under the 237px a 375px phone leaves beside a 48px
 * switch, so switch rows keep their two-column shape and only the text-valued
 * rows wrap. ponytail: one measure for every row; a row that wants a different
 * floor would need this as a prop.
 */
const LABEL_MEASURE = '1 1 22ch'

export default function SettingsRow({
  title,
  help,
  note,
  noteId,
  last = false,
  children,
}: SettingsRowProps) {
  return (
    <div
      style={{
        ...row,
        paddingBottom: last ? 0 : 'var(--space-lg)',
        borderBottom: last ? undefined : '1px solid var(--color-border)',
      }}
    >
      <div className="font-body" style={{ flex: LABEL_MEASURE }}>
        <div style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 'var(--space-xs)',
            fontSize: 'var(--text-content)',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
          }}
        >
          {help}
        </div>
        {note && (
          <div
            id={noteId}
            style={{
              marginTop: 'var(--space-xs)',
              fontSize: 'var(--text-content)',
              lineHeight: 1.6,
              color: 'var(--color-text-tertiary)',
            }}
          >
            {note}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
