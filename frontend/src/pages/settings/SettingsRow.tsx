import type { CSSProperties, ReactNode } from 'react'

/**
 * One labelled setting inside a `SettingsCard` (#2154). Help text sits at the
 * content floor (#627), not the design's 12px, so hierarchy comes from ink.
 */
interface SettingsRowProps {
  readonly title: string
  readonly help?: string
  /** Quieter line explaining why the control is not movable. */
  readonly note?: string
  /** For the control's `aria-describedby`. */
  readonly noteId?: string
  /** Drops the bottom rule. */
  readonly last?: boolean
  readonly children: ReactNode
}

/**
 * Wraps, with a floor on the text column (#2829), so a string-valued control
 * (an email) drops to its own line instead of crushing the label. Per-row, not
 * per-breakpoint: the pane narrows with the sidebar, so not `useFormFactor`.
 */
const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  // Row gap applies only once the value wraps.
  gap: 'var(--space-sm) var(--space-xl)',
  paddingTop: 'var(--space-lg)',
}

/**
 * 22ch fits beside a 48px switch on a 375px phone, so only text rows wrap.
 * ponytail: one measure for every row; make it a prop if a row needs another.
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
        {help && (
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
        )}
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
