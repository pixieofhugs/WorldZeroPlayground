import type { CSSProperties } from 'react'

/**
 * Singularity full-page backdrop — the page as the terminal itself: a
 * terminal-black field with a faint blue circuit-trace grid, a centered
 * phosphor-green glow, signal blue bleeding from the corners, and fine
 * green scanlines. Fixed behind page content at z-index 0.
 *
 * IT SPEAKS THE CARD'S PALETTE, `--faction-singularity-term-*` (#2039). It used
 * to paint in `--faction-singularity-card-*` plus `-border-hard`, on the reading
 * that "Singularity is always dark, so its tokens are identical in both themes
 * and this never flips." That was true of the family it named and is NOT true of
 * the faction: `-term-*` restates seventeen of its nineteen members under
 * `[data-theme="dark"]` (WORLD_ZERO_STYLE §3, "A faction that goes dark in light
 * mode goes dark all at once"). Task cards v3 grounds the chassis on that
 * family, so the page had frozen while the card kept moving — the light page was
 * painted in the DARK chassis's own colour, and the dark page in the dark
 * chassis's, ΔE 0.0 from the card standing on it.
 *
 * Both mounts stack a `<TaskCard>` on this ground (the faction page and a
 * Singularity player's profile are the only two routes `useFactionBackdrop`
 * reaches), so page and card are genuinely side by side here.
 *
 * QUIET ON PURPOSE, the same ceiling `UaBackdrop` and `WowBackdrop` state: a
 * page is a composition of independently-themed surfaces (ADR-0002), another
 * faction's card can sit on this ground, and `.sidebar-card`'s dark fill is 4%
 * white — so the ground bleeds essentially undimmed through anything mounted on
 * it. Every alpha below is therefore held at the value it already shipped at,
 * and each repoint says how:
 *
 *   • the two blue corner bleeds and the phosphor glow keep 9% / 6% / 5% and
 *     simply move onto the inks the card sets, so they now flip with it;
 *   • the circuit grid mixes `-term-border` (a: .4 light, .3 dark) at 55%, which
 *     lands alpha .22 in light — byte-identical to the `-border-hard` 22% it
 *     replaces — and .165 in dark, where the card's own rule is dimmer too;
 *   • the scanlines stop restating a 4% mix of the accent and read
 *     `-term-scan`, whose declaration IS this role ("standing raster", .05/.045).
 *
 * `--faction-singularity-term-page` is the desk: one rung below the chassis on
 * the terminal's black ramp, in both themes. Its declaration carries the
 * measurement and the reason the lift is deliberately small.
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
    // scanlines (the card's own standing raster, over the desk)
    'repeating-linear-gradient(to bottom, transparent 0 2px, var(--faction-singularity-term-scan) 2px 4px)',
  ].join(', '),
}

export default function SingularityBackdrop() {
  return <div style={backdropStyle} aria-hidden="true" />
}
