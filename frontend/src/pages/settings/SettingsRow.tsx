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

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-xl)',
  paddingTop: 'var(--space-lg)',
}

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
      <div className="font-body min-w-0 flex-1">
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
