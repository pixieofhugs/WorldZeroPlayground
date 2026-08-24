/**
 * The duel seal CHASSIS (#1313) — the positioning shell every seal sheet hangs
 * in, and the ONE place the seal reads `useFormFactor()`.
 *
 * Each faction used to ship two files whose difference was almost entirely this
 * shell: a centred bounded card over a scrim on a laptop, a full-bleed sheet on
 * a phone. Fourteen files carried one branch. Now the branch lives here once and
 * every skin is one responsive component, the shape ADR-0056 / ADR-0067 landed
 * for task cards and praxis cards.
 *
 * WHAT THIS OWNS, AND WHERE THE LINE IS
 * -------------------------------------
 * It owns the SHELL: the fixed overlay, the dialog contract (`role="dialog"` +
 * `aria-modal` + the accessible name), the desktop scrim, the desktop width
 * bound, and the phone's full-bleed stacking. It owns no faction chrome at all.
 *
 * A skin passes its frame as two parts, and the split is the whole design:
 *
 *  - `ground` — the faction's paper: background, ink, face, and any edge that
 *    survives full-bleed (the opponent's coloured spine, for instance). Applied
 *    at BOTH widths, so a Singularity terminal is a terminal on a phone and
 *    Snide's halftone is still photocopier black.
 *  - `card` — the FLOATING-card chrome: border, radius, the clip that goes with
 *    the radius, the drop shadow. Desktop only, because on a phone the sheet is
 *    the screen: there is nothing for it to float above, no scrim behind it, and
 *    a hard offset shadow or a rounded corner at the viewport edge is a card
 *    pretending it is still one. That is what "no card" means below, and it is
 *    the only thing this file drops on a phone.
 *
 * The phone shell keeps `--color-bg-page` UNDER `ground`, so a skin whose paper
 * lives on its inner regions rather than on its frame (Coven's slip band over
 * its candlelit page) still gets an opaque sheet instead of the composer showing
 * through. A skin that paints its own ground simply overrides it.
 *
 * Skins stack their regions as flex children at both widths — which is why the
 * desktop card is a flex column too. A sheet that wants a pinned action band on
 * a phone gives its middle `flex: 1` and its bands `flexShrink: 0`; on a laptop
 * the card is auto-height, so the same three regions lay out exactly as they did
 * before. No skin needs a second opinion about the form factor.
 */
import type { CSSProperties, ReactNode } from 'react'
import { drawAtRoot } from '../ui/drawAtRoot'
import { useFormFactor } from '../../hooks/useFormFactor'

/**
 * The desktop scrim, near-black and radial. Five of the eight sheets took this
 * exact value; the three that dim harder or tint their own (Snide, Singularity,
 * WOW) pass `scrim` instead.
 */
export const SEAL_SCRIM = 'radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))'

export interface DuelSealSheetProps {
  /** The dialog's accessible name — every skin passes `copy.heading`. */
  label: string
  /** The desktop scrim behind the card. Defaults to {@link SEAL_SCRIM}. */
  scrim?: string
  /** The faction's paper, ink and face. Applied at BOTH form factors. */
  ground: CSSProperties
  /** Floating-card chrome — border, radius, clip, shadow. DESKTOP ONLY. */
  card?: CSSProperties
  /**
   * A class applied to the PHONE shell only, for a rule that must not reach the
   * laptop. One consumer: WOW's `.wow-seal-actions--mobile`, which stretches the
   * seal buttons and holds them at the kit's 46px touch targets (#895 asks that
   * those be kept, and inline styles cannot express "only under 768px").
   *
   * ponytail: this exists because colours and rules live in `index.css` and a
   * component cannot add a media query. The upgrade path is to wrap that rule in
   * `@media (max-width: 767px)` there, after which the skin can carry the class
   * itself at both widths and this prop can go.
   */
  phoneClassName?: string
  children: ReactNode
}

export default function DuelSealSheet({
  label,
  scrim = SEAL_SCRIM,
  ground,
  card,
  phoneClassName,
  children,
}: DuelSealSheetProps) {
  const isMobile = useFormFactor() === 'mobile'

  // BOTH branches draw at the root (#2244). Raised from `EditPraxis`, the sheet
  // composited inside `ShellContent`'s `z-index: 5` band, so the phone's header
  // and tab bar painted over it — and `justify-end` puts the seal's action band
  // exactly where the tab bar is. See `drawAtRoot`.
  if (isMobile) {
    return drawAtRoot(
      <div
        data-testid="duel-seal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`fixed inset-0 z-50 flex flex-col justify-end overflow-y-auto${
          phoneClassName ? ` ${phoneClassName}` : ''
        }`}
        style={{ background: 'var(--color-bg-page)', ...ground }}
      >
        {children}
      </div>,
    )
  }

  return drawAtRoot(
    <div
      // The seal/forfeit sheet, found by slot rather than by its heading: that
      // heading moved from "Seal the duel?" to "Lock the duel?" in #1928 and
      // took the nightly duel spec with it (#2453).
      data-testid="duel-seal-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ padding: 'var(--space-lg)', background: scrim }}
    >
      <div className="w-full max-w-[460px] flex flex-col" style={{ ...ground, ...card }}>
        {children}
      </div>
    </div>,
  )
}
