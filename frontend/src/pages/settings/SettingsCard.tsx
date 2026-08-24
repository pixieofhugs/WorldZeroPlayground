import type { CSSProperties, ReactNode } from 'react'
import { useFormFactor } from '../../hooks/useFormFactor'

/**
 * The chassis' section card (#2154) — a spectrum rule across the top, a
 * heading, an optional lead, and rows.
 *
 * THIS IS THE DROP-IN CONTRACT. A sibling section (#1047, #2155, #2156, #2157,
 * #2158) is a file that returns one of these; it adds itself to
 * `SETTINGS_SECTIONS` in `pages/Settings.tsx` and touches nothing else. Both
 * the anchor the nav scrolls to and the scroll offset that clears the sticky
 * NavBar live here, so no section can forget either.
 *
 * `sectionId` is the design's `sec-<key>` and is derived by the shell from the
 * same key that names the nav item — one string, so the rail cannot point at an
 * anchor that does not exist.
 */
export interface SettingsCardProps {
  readonly sectionId: string
  readonly title: string
  readonly lead?: string
  readonly children: ReactNode
  /** Danger dressing for #2161's delete-account card. Default is the plain card. */
  readonly tone?: 'default' | 'danger'
}

const card: CSSProperties = {
  position: 'relative',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  background: 'var(--color-bg-surface)',
  backdropFilter: 'blur(var(--card-blur))',
  // `top-14` is NavBar's height; a section scrolled to without this lands under
  // the sticky bar. Same number `SidebarColumn`'s `lg:top-14` reads.
  scrollMarginTop: 'var(--space-5xl)',
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
      {/* The card's spectrum rule. Absent on the danger card, whose edge is
          already carrying the warning. */}
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
