import type { CSSProperties } from "react";
import { CAPTION, QUIET, seededRandom } from "./ephemeristsPlate";

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
 * bracket. `EphemeristsFieldDesk` and the faction page do paint the plate CTA
 * (both wear `.eph-cta` since #2146) but neither brackets it; that is #2067's
 * ruling about where the MOTIF lives and is a separate question from the paint.
 *
 * ── HALF THE MARKS, DRAWN, NOT WRITTEN (#2146) ──
 *
 * The row was thirty-two marks in a fixed order, identical on every surface.
 * Owner, on a screenshot of the CTA: *"There are at least twice as many symbols
 * as there should be. They should be randomly seeded and randomly changing."*
 * Three consequences, and the third is the one worth reading twice:
 *
 *  1. **Sixteen slots.** Half of thirty-two, which is also what #2143 did to
 *     the notation band's density in the same pass, so the masthead and the CTA
 *     are marked at one pitch.
 *  2. **Seeded per surface AND per side.** {@link seededRandom} — the kit's
 *     one generator, which the notation band draws from too. The seed is the
 *     surface's own (`task:${id}`, `praxis:${id}`) with the side folded in, so
 *     the two strips bracketing one button are different rows rather than the
 *     same row printed twice, and both are the same rows tomorrow.
 *  3. **CHANGING WITHOUT RE-RANDOMISING.** Each slot holds TWO seeded marks
 *     stacked in one cell, and the stylesheet cross-cuts between them on the
 *     slot's own phase. So the row turns over time and no render can change it:
 *     a vote landing, a filter moving or a hover firing re-renders this
 *     component and it comes back byte-identical. That is the same shape the
 *     card's `Turning` label uses (a CSS clock, not a JS timer) minus its
 *     render-time `Math.random()`, which this row has 16 of and it does not.
 *
 * WHAT LIVES WHERE, and the split is deliberate:
 *
 *  • `index.css` owns the strip's BOX (`[data-eph-runes]`), the slot's flex
 *    cell and size cycle (`.eph-rune` + three `nth-child` rungs), and the
 *    RESTING form of the two frames — first mark shown, second hidden. That
 *    resting form is what a reduced-motion reader sees and what a viewer who
 *    never receives the deferred sheet sees: a static row of sixteen marks at
 *    its own peak opacity, which is what the row is at any single frame anyway.
 *  • `motion.ornament.css` owns the two animations — the opacity shimmer and
 *    the mark turn — behind `prefers-reduced-motion: no-preference`, off the
 *    critical path (#2073). There is never an inline `animation:`.
 *  • THIS FILE owns the pool, the draw, the two inks and the two per-slot custom
 *    properties. `--epg-op` and `--epg-delay` are numbers per slot, not colours,
 *    so a stylesheet has nowhere to put them; the same two names already carry
 *    the register's peak and phase on `.epg-glyph`, and reusing them keeps one
 *    vocabulary for one motif (the two never nest, so nothing inherits across).
 *
 * IT IS DECORATION AND MUST STAY SO. Sixteen mathematical symbols read aloud
 * between the brief and the sign-up button would be worse than useless, so the
 * row is `aria-hidden` and holds no text node any assistive technology reaches.
 */

/**
 * The pool, in the design's own order.
 *
 * It was the SEQUENCE until #2146 — thirty-two marks read out left to right,
 * the same on every card in the feed. Seeded now, so what survives is the
 * VOCABULARY: which marks an ephemerist's working may contain, with the
 * design's own repeats (`∂`, `·`, `ψ`) left in as weighting. The alternative
 * the design proposes — seven planetary metals plus eight alchemical element
 * signs — is rejected: the alchemical block is U+1F700 and is in no common
 * system font, so it would buy a fourth webfont subset for eight glyphs that
 * render as boxes wherever the subset fails.
 *
 * Deliberately NOT the notation band's 34-mark pool, and that is #1654's rule
 * rather than an oversight: two designs drawing one ornament from two tables is
 * not drift when neither was ever derived from the other. This one reads as a
 * formula (`⟨ψ‖Θ‖ψ⟩`, `∂Φ∕∂τ`); the band's is a specimen of operators.
 */
const MARKS =
  "∇ × Ψ ≡ ∂ Φ ∕ ∂ τ · ∮ ⟨ ψ ‖ Θ ‖ ψ ⟩ ∝ Σ μ ν · ⊗ Δ λ ≥ ϖ · ∫ ρ ∂".split(" ");

/** Half of the thirty-two the row marched before #2146. */
const SLOTS = 16;

/**
 * Marks stacked per slot. Two, because two is what it takes for a slot to
 * change at all and every extra frame is sixteen more spans per strip and two
 * strips per card — a feed pays for this ornament once per card on screen.
 */
const FRAMES = 2;

/** One slot: the marks it turns between, and its own phase through both animations. */
interface Slot {
  marks: string[];
  /** Peak opacity, 0.34–0.79 — the design's range, drawn rather than strided. */
  peak: number;
  /** Phase, 0–11.5s, shared by the shimmer and the turn. */
  delay: number;
}

/**
 * The draw. Exported for its test: this is the only arithmetic here, and a row
 * that has quietly stopped varying still renders perfectly.
 */
export function drawRunes(seed: string): Slot[] {
  const next = seededRandom(seed);
  return Array.from({ length: SLOTS }, () => ({
    marks: Array.from({ length: FRAMES }, () => MARKS[Math.floor(next() * MARKS.length)]),
    peak: Number((0.34 + next() * 0.45).toFixed(2)),
    delay: Number((next() * 11.5).toFixed(1)),
  }));
}

/**
 * WHERE THE STRIP SITS, which is a VERTICAL-OFFSET knob and a seed ingredient
 * and nothing else. Each value has its own margin rule in index.css; none of
 * them touches the width, because the strip has one width everywhere (#2312).
 *
 * `top` / `bottom` bracket a plate CTA. `divider` is the third: the praxis
 * card's byline rule, where there is no button to bracket. It has to be a
 * distinct value rather than a reused `top` — the seed folds `side` in, and the
 * composer already draws `praxis:${id}` at `top`, so the two would otherwise be
 * the same row on two surfaces showing the same praxis.
 */
export type RuneStripSide = "top" | "bottom" | "divider";

export default function EphemeristsRuneStrip({ side, seed }: {
  side: RuneStripSide;
  /**
   * Stable per SURFACE — `task:${id}` on the card and the task page,
   * `praxis:${id}` in the composer and on the praxis card's byline, the same
   * strings the notation band takes. The side is folded in here rather than at
   * the call site so no mount can forget it and print one row twice.
   */
  seed: string;
}) {
  const slots = drawRunes(`${seed}:${side}`);
  return (
    <div aria-hidden="true" data-eph-runes={side}>
      {slots.map((slot, index) => (
        <span
          key={index}
          className="eph-rune"
          style={
            {
              /* Every third mark takes the caption gold and the rest the quiet
                 ink — both tokens, so the row has no colour of its own to go
                 stale. `-brass` is absent on purpose: it is a rule colour and
                 the module forbids painting it as a mark. The cycle is over the
                 SLOT and not the draw, so the gold stays evenly spread however
                 the marks fall. */
              color: index % 3 === 0 ? CAPTION : QUIET,
              "--epg-op": slot.peak,
              "--epg-delay": `${slot.delay}s`,
            } as CSSProperties
          }
        >
          {slot.marks.map((mark, frame) => (
            <span key={frame}>{mark}</span>
          ))}
        </span>
      ))}
    </div>
  );
}
