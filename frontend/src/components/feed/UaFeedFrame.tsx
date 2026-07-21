import type { ReactNode } from 'react'

import { UaSigil } from '../cards/UaSigil'

/**
 * UA feed frame (per-faction surface #12, kit §12, #851).
 *
 * A thin presentational WRAPPER: it dresses the neutral feed card (`children`)
 * as a UA row and reimplements none of the card's internals, which arrive as
 * children and keep their slot order (ADR-0016).
 *
 * The dress is two things: a 3px orange rule down the left edge and one small
 * ensō as the faction mark. No mandala — a feed is a dense, text-heavy surface
 * and the pattern is ABSENT there (brief §5). No gilt sandwich, no gold liner,
 * no engraved masthead: the salon is dead, and a feed row was the worst place
 * it lived.
 *
 * Both themes come from the `[data-theme="dark"]` cascade.
 */
export default function UaFeedFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-ua-card-bg)',
        color: 'var(--faction-ua-card-text)',
        border: '1px solid var(--faction-ua-rule)',
        borderLeft: '3px solid var(--faction-ua)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg) var(--space-xl)',
      }}
    >
      {/* the faction mark — one of the ensō's two sanctioned uses (brief §4) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <UaSigil width={18} height={18} />
      </span>
      {children}
    </div>
  )
}
