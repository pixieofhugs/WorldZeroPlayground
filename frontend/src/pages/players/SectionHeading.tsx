import type { ReactNode } from 'react'

/** Decorative caret (a constant, not copy). */
const CARET_GLYPH = '▾'

interface SectionHeadingProps {
  title: string
  meta?: ReactNode
  open: boolean
  onToggle: () => void
  /** `--text-*` token. */
  fontSize: string
  toggleLabel: string
}

/**
 * Collapsible section head shared by both form factors. Open by default and
 * not persisted.
 */
export default function SectionHeading({
  title,
  meta,
  open,
  onToggle,
  fontSize,
  toggleLabel,
}: SectionHeadingProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={toggleLabel}
      className="flex items-center w-full"
      style={{
        gap: 'var(--space-md)',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'var(--color-text-primary)',
        textAlign: 'left',
      }}
    >
      <span className="font-display italic" style={{ fontSize }}>
        {title}
      </span>
      <span
        aria-hidden
        style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }}
      />
      {meta}
      <span
        aria-hidden
        style={{
          fontSize: 'var(--text-lg)',
          color: 'var(--color-text-tertiary)',
          display: 'inline-block',
          transition: 'transform .2s ease',
          transform: open ? undefined : 'rotate(-90deg)',
        }}
      >
        {CARET_GLYPH}
      </span>
    </button>
  )
}
