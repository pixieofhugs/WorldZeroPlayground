import type { CSSProperties } from 'react'

/**
 * Singularity page backdrop: the page as the terminal. Fixed at z-index 0.
 *
 * Paints only `--faction-singularity-term-*`, the family the card grounds on,
 * which flips per theme (#2039; WORLD_ZERO_STYLE §3) — so page and card move
 * together. `singularityBackdropGround.test.ts` holds it.
 *
 * Quiet on purpose, like `UaBackdrop`/`WowBackdrop`: other factions' cards sit
 * on it (ADR-0002) and the sidebar's 4% fill lets it bleed through. The alphas
 * are the shipped values; the grid's 55% mix of `-term-border` lands .22 in
 * light. `-term-page` sits one rung below the chassis; its declaration says why.
 */
const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: 'var(--faction-singularity-term-page)',
  backgroundImage: [
    // phosphor center glow (green)
    'radial-gradient(55% 45% at 50% 50%, color-mix(in srgb, var(--faction-singularity-term-bright) 5%, transparent) 0%, transparent 68%)',
    // signal blue — top-left origin
    'radial-gradient(44% 38% at 0% 0%, color-mix(in srgb, var(--faction-singularity-term-blue) 9%, transparent), transparent 72%)',
    // signal blue — bottom-right echo
    'radial-gradient(36% 30% at 100% 100%, color-mix(in srgb, var(--faction-singularity-term-blue) 6%, transparent), transparent 72%)',
    // circuit grid — horizontal (blue)
    'repeating-linear-gradient(0deg, color-mix(in srgb, var(--faction-singularity-term-border) 55%, transparent) 0 1px, transparent 1px 32px)',
    // circuit grid — vertical (blue)
    'repeating-linear-gradient(90deg, color-mix(in srgb, var(--faction-singularity-term-border) 55%, transparent) 0 1px, transparent 1px 32px)',
    // scanlines (`-term-scan`, the card's standing raster)
    'repeating-linear-gradient(to bottom, transparent 0 2px, var(--faction-singularity-term-scan) 2px 4px)',
  ].join(', '),
}

export default function SingularityBackdrop() {
  return <div style={backdropStyle} aria-hidden="true" />
}
