import type { ReactNode } from 'react'

import { EphMark, Foxing } from '../cards/ephemeristsAtoms'

/**
 * Ephemerists feed-card FRAME (surface #12, SPEC-faction-ui-profile.md).
 *
 * A thin presentational wrapper that dresses the neutral feed card (`children`)
 * as a leaf torn from the faction's ephemeris: foxed-vellum stock, an iron-gall
 * ink hairline, a gold-ruled running edge, and a rubric marginal sigil. The card
 * internals (avatar / actor / badge / time) are untouched — they arrive via
 * `{children}` and render in the content area.
 *
 * Theme-aware through the --eph-* cascade; no document-theme mutation, no hex.
 */
export default function EphemeristsFeedFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 14,
        padding: '10px 12px 12px 16px',
        background:
          'linear-gradient(170deg, var(--eph-vellum), var(--eph-vellum-deep))',
        border: '1px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)',
        boxShadow:
          'inset 3px 0 0 -1px color-mix(in srgb, var(--eph-gold) 70%, transparent), 0 8px 20px -16px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
      }}
    >
      {/* age-foxing stains over the vellum stock */}
      <Foxing opacity={0.35} />

      {/* rubric marginal ornament — the watching-wanderer sigil in the gutter */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 3,
          top: 9,
          zIndex: 1,
          opacity: 0.5,
          color: 'var(--eph-rubric)',
          pointerEvents: 'none',
        }}
      >
        <EphMark size={12} color="var(--eph-rubric)" stroke={1.2} />
      </div>

      {/* the neutral feed card, rendered in the content area */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  )
}
