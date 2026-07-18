import type { ReactNode } from 'react'

/**
 * Touch-native filter idiom shared by the mobile browse pages — a labelled,
 * horizontal-scroll row of pill chips. Lifted into components/ui on the third
 * copy (#644): DefaultTasks and DefaultPlayers each kept a private clone, and the
 * praxis feed made three. One home, token-only styling so the no-raw-style-values
 * ratchet stays green.
 */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="eyebrow" style={{ flex: 'none' }}>
        {label}
      </span>
      <div className="flex gap-2 pb-0.5" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

/**
 * A single pill chip. `on` is the selected state; `tint` renders a small square
 * swatch (used for the faction chips). Uppercase mono-ish body voice.
 */
export function Chip({
  on,
  onClick,
  tint,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-body uppercase"
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        fontSize: 'var(--text-md)',
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.05em',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
        border: `1px solid ${on ? 'transparent' : 'var(--color-border-strong)'}`,
        borderRadius: 999,
        padding: 'var(--space-sm) var(--space-md)',
        minHeight: 36,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {tint && (
        <i style={{ width: 8, height: 8, borderRadius: 2, flex: 'none', background: tint }} />
      )}
      {children}
    </button>
  )
}
