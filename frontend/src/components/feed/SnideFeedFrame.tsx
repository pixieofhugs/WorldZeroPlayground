import type { ReactNode } from 'react'

/**
 * S.N.I.D.E. activity-feed FRAME (surface #12, SPEC-faction-ui-profile.md).
 *
 * A thin presentational WRAPPER — not a card. It dresses the neutral feed card
 * (`children`) in SNIDE's outer chrome: an "intercepted ransom-note slip" cut
 * from warm xerox paper, bound in a photocopier-ink border, taped down at the
 * top, tilted on the wall, dusted with halftone, with an acid-green margin
 * stripe running its left edge. The card body itself stays exactly as passed in
 * — this only adds the skin around `{children}`.
 *
 * Always-dark by intent: SNIDE is the ransom/xerox dossier. We scope the
 * theme-stable --faction-snide-card-* / -paper / -ink / -acid tokens to this
 * frame's own container only; we never mutate the document theme, and we avoid
 * the --faction-snide-*-wall-text tokens that flip between light/dark.
 */
export default function SnideFeedFrame({ children }: { children: ReactNode }) {
  const ink = 'var(--faction-snide-ink)'
  const paper = 'var(--faction-snide-paper)'
  const acid = 'var(--faction-snide-acid)'

  return (
    <div
      style={{
        position: 'relative',
        background: paper,
        border: `1.5px solid ${ink}`,
        // halftone dust over the xerox slab — ink at low opacity, theme-stable.
        backgroundImage:
          'radial-gradient(color-mix(in srgb, var(--faction-snide-ink) 6%, transparent) 1px, transparent 1px),' +
          'radial-gradient(color-mix(in srgb, var(--faction-snide-ink) 4%, transparent) 1px, transparent 1px)',
        backgroundSize: '3px 3px, 4px 4px',
        backgroundPosition: '0 0, 2px 1px',
        boxShadow: '3px 4px 0 rgba(0,0,0,0.22)',
        transform: 'rotate(-0.6deg)',
        padding: '16px 18px 18px 22px',
        marginBottom: 18,
        overflow: 'hidden',
      }}
    >
      {/* acid margin stripe — sprocket-ruled, hugging the left edge */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: acid,
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 13px, rgba(0,0,0,0.25) 13px 14px)',
        }}
      />
      {/* a strip of tape pinning the slip to the wall */}
      <div
        className="snide-tape"
        aria-hidden="true"
        style={{ top: -9, right: 40, width: 64, height: 20, transform: 'rotate(5deg)' }}
      />
      {/* the slip body — the neutral feed card, untouched */}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}
