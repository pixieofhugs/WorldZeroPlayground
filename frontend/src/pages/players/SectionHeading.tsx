import type { ReactNode } from 'react'

/** Decorative disclosure caret. An expression, so it is not user-facing copy. */
const CARET_GLYPH = '▾'

interface SectionHeadingProps {
  title: string
  /** The "{{count}} players" chip the roster heading carries. */
  meta?: ReactNode
  open: boolean
  onToggle: () => void
  /** `--text-*` token. Desktop and mobile set the section head at their own size. */
  fontSize: string
  /** Accessible name for the toggle — the section's own title reads it. */
  toggleLabel: string
}

/**
 * A collapsible section head: italic display title, a hairline running to the
 * right, optional meta, and a caret that rotates when the section is shut.
 *
 * Shared by both form factors and by both sections, because it is one ornament
 * drawn four times — the sizes differ, and nothing else does. Open by default
 * and NOT persisted: a section a player shut is shut for that visit only.
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
