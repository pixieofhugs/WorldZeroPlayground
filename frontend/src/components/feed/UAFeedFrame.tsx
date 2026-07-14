import type { ReactNode } from 'react'

import i18n from '../../i18n'

/**
 * University of Asthmatics per-faction feed frame (surface #12,
 * SPEC-faction-ui-profile.md).
 *
 * A thin presentational WRAPPER: it skins the neutral feed card (`children`) as a
 * gilt-salon submission. The frame supplies only the OUTER chrome — a gilt border
 * holding a gold-gradient liner around a parchment body, topped by an engraved
 * masthead strip — and renders the unchanged card as the salon-mounted body. It
 * must NOT reimplement the card internals; those arrive via `children`.
 *
 * UA is ALWAYS LIGHT: its --ua-* / --faction-ua-* tokens are identical in both
 * themes, so the container styles itself with them and reads as a lit salon
 * regardless of the global theme — it never mutates data-theme. (Mirror of
 * SingularityFeedFrame, which is always-dark.)
 */

// Token shorthands — every color resolves to a --ua-* var.
const GILT = 'var(--ua-gilt)' // gold frame gradient
const GOLD = 'var(--ua-gold)' // old gold liner
const GOLD_PALE = 'var(--ua-gold-pale)'
const PAPER = 'var(--ua-paper)' // parchment body
const INK = 'var(--ua-ink)' // brown ink — borders & shadow
const ORANGE = 'var(--ua-orange)' // burnt amber — masthead eyebrow
const FONT_ENGRAVED = 'var(--font-faction-engraved)' // Cinzel

// color-mix helper for brown ink derivatives (border, shadow, dot texture).
const ink = (pct: number): string =>
  `color-mix(in srgb, ${INK} ${pct}%, transparent)`

export default function UAFeedFrame({ children }: { children: ReactNode }) {
  return (
    // Outer gilt border + soft brown drop-shadow & inset white hairline.
    <div
      style={{
        padding: 6,
        background: GILT,
        boxShadow: `0 10px 24px ${ink(26)}, inset 0 0 0 1px rgba(255,255,255,0.45)`,
      }}
    >
      {/* gold-gradient liner */}
      <div
        style={{
          padding: 3,
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})`,
        }}
      >
        {/* parchment body — brown hairline + faint radial-dot texture */}
        <div
          style={{
            border: `1px solid ${ink(45)}`,
            background: PAPER,
            backgroundImage: `radial-gradient(${ink(3)} 1px, transparent 1px)`,
            backgroundSize: '5px 5px',
            padding: '13px 17px',
          }}
        >
          {/* engraved masthead strip + gold hairline divider */}
          <div
            aria-hidden="true"
            style={{
              fontFamily: FONT_ENGRAVED,
              fontSize: 8.5,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: ORANGE,
            }}
          >
            {i18n.t('feed:identity.ua.fullName')}
          </div>
          <div
            aria-hidden="true"
            style={{
              height: 1,
              margin: '9px 0 11px',
              background: `linear-gradient(90deg, ${GOLD}, transparent)`,
            }}
          />

          {/* salon-mounted body — the neutral card, unchanged */}
          {children}
        </div>
      </div>
    </div>
  )
}
