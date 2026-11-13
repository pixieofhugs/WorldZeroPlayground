import type { CSSProperties, ReactNode } from 'react'
import { useFormFactor } from '../../hooks/useFormFactor'

/**
 * The settings section card (#2154) and the drop-in contract: a section returns
 * one of these and registers in `SETTINGS_SECTIONS` (`pages/Settings.tsx`). The
 * anchor and sticky-NavBar scroll offset live here. `sectionId` (`sec-<key>`) is
 * derived from the nav key, so the rail cannot point at a missing anchor.
 */
interface SettingsCardProps {
  readonly sectionId: string
  readonly title: string
  readonly lead?: string
  readonly children: ReactNode
  /** Danger dressing for #2161's delete-account card. */
  readonly tone?: 'default' | 'danger'
}

const card: CSSProperties = {
  position: 'relative',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  background: 'var(--color-bg-surface)',
  backdropFilter: 'blur(var(--card-blur))',
  // Clears the sticky NavBar.
  scrollMarginTop: 'calc(var(--navbar-h, 56px) + var(--space-sm))',
}

export default function SettingsCard({
  sectionId,
  title,
  lead,
  children,
  tone = 'default',
}: SettingsCardProps) {
  const isMobile = useFormFactor() === 'mobile'
  const danger = tone === 'danger'

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
      style={{
        ...card,
        background: danger ? 'var(--color-danger-veil)' : card.background,
        border: `1px solid ${danger ? 'var(--color-danger-edge)' : 'var(--color-border)'}`,
      }}
    >
      {/* No spectrum rule on the danger card: its edge carries the warning. */}
      {!danger && <div aria-hidden style={{ height: 3, background: 'var(--faction-default-rainbow)' }} />}
      <div style={{ padding: isMobile ? 'var(--space-lg)' : 'var(--space-xl)' }}>
        <h2
          id={`${sectionId}-title`}
          className="font-display"
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 'var(--text-title)',
            lineHeight: 1.2,
            color: 'var(--color-text-primary)',
          }}
        >
          {title}
        </h2>
        {lead && (
          <p
            className="font-body"
            style={{
              margin: 'var(--space-sm) 0 0',
              fontSize: 'var(--text-content)',
              lineHeight: 1.65,
              color: 'var(--color-text-secondary)',
              maxWidth: '62ch',
            }}
          >
            {lead}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
