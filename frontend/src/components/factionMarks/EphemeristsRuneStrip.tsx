import type { CSSProperties } from "react";
import { CAPTION, QUIET } from "./ephemeristsPlate";

/**
 * THE RUNE STRIP — the Ephemerists' glyph motif, moved off the masthead and onto
 * the call to action (#2067).
 *
 * The task card used to march two twelve-sign registers across a 110px night
 * band. The re-pulled design strips that band back to the kit's plain
 * `CardMasthead` and returns the motif here: a shimmering row of mathematical
 * marks immediately before the plate's primary button and another immediately
 * after, so the ornament brackets the one thing on the sheet you can act on.
 *
 * IT IS A COMPONENT BECAUSE THREE SURFACES MOUNT IT (owner ruling, #2067). The
 * strips bracket the CTA on every Ephemerists surface that paints a button
 * through `--faction-ephemerists-plate-cta-bg` — the task card, the task detail
 * and the composer — and §6's rule is that a device is drawn once and consumed
 * everywhere. Three skins each transcribing this row is the failure mode that
 * `ephemeristsPlate.tsx` was extracted to end: a strip redrawn in one file and
 * left standing in the others drifts silently, invisibly to the import graph.
 *
 * `EphemeristsPraxisDetail` gets none — it has no button, so there is nothing to
 * bracket. `EphemeristsFieldDesk` has one button but does not paint it with the
 * plate CTA, so it is not one of the three.
 *
 * WHAT LIVES WHERE, and the split is deliberate:
 *
 *  • `index.css` owns the strip's BOX (`[data-eph-runes]`), the per-rune flex
 *    cell and the size cycle (`.eph-rune` + three `nth-child` rungs), and the
 *    opacity animation. The animation is behind
 *    `@media (prefers-reduced-motion: no-preference)` — the repo's inverted form
 *    of the design's always-on rule, the same shape `.cvn-wheel` and
 *    `.epg-glyph` use. There is never an inline `animation:`, and stilled the
 *    strip is a static row of marks at its own peak opacity, which is what it is
 *    at any single frame of the cycle.
 *  • THIS FILE owns the sequence, the two inks and the two per-instance custom
 *    properties. `--epg-op` and `--epg-delay` are numbers per rune, not colours,
 *    so a stylesheet has nowhere to put them; the same two names already carry
 *    the register's peak and phase on `.epg-glyph`, and reusing them keeps one
 *    vocabulary for one motif (the two never nest, so nothing inherits across).
 *
 * IT IS DECORATION AND MUST STAY SO. Thirty-two mathematical symbols read aloud
 * between the brief and the sign-up button would be worse than useless, so the
 * row is `aria-hidden` and holds no text node any assistive technology reaches.
 */

/**
 * The sequence, in the design's own order.
 *
 * The issue calls this "31 spans" and then lists thirty-two marks. The SEQUENCE
 * is the drawing and the count is a number someone wrote down beside it, so the
 * sequence wins; nothing here reads the length, and the per-rune cycles below
 * are indexed rather than distributed, so a mark either way changes only where
 * the shimmer falls.
 */
const RUNES =
  "∇ × Ψ ≡ ∂ Φ ∕ ∂ τ · ∮ ⟨ ψ ‖ Θ ‖ ψ ⟩ ∝ Σ μ ν · ⊗ Δ λ ≥ ϖ · ∫ ρ ∂".split(" ");

/** Which side of the button this strip sits on. The only thing that differs. */
export type RuneStripSide = "top" | "bottom";

export default function EphemeristsRuneStrip({ side }: { side: RuneStripSide }) {
  return (
    <div aria-hidden="true" data-eph-runes={side}>
      {RUNES.map((rune, index) => (
        <span
          key={`${side}-${index}`}
          className="eph-rune"
          style={
            {
              /* Every third mark takes the caption gold and the rest the quiet
                 ink — both tokens, so the row has no colour of its own to go
                 stale. `-brass` is absent on purpose: it is a rule colour and
                 the module forbids painting it as a mark. */
              color: index % 3 === 0 ? CAPTION : QUIET,
              /* Peak opacity, 0.34–0.79, and phase, 0–11.5s. Coprime strides
                 over the index so no two neighbours breathe together. */
              "--epg-op": 0.34 + ((index * 7) % 10) / 20,
              "--epg-delay": `${((index * 13) % 47) / 4}s`,
            } as CSSProperties
          }
        >
          {rune}
        </span>
      ))}
    </div>
  );
}
