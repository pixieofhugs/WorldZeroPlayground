import type { FactionSelectCardProps } from "./FactionSelectCard";
import DefaultSelectCard from "./DefaultSelectCard";
import { ALBESCENT_FACTION_SLUG, isFactionRedacted } from "../../utils/factions";

/**
 * Albescent's directory tile — a RE-CUTTING wrapper (#2632).
 *
 * PRISM, NOT A FLAT SHEET, and it arrives with the reveal. `DefaultSelectCard`
 * reads the `--faction-default-card-sheet` triple since #2632, so `.alb-prism`
 * grounds it the same way it grounds the task and praxis cards — one ground for
 * the whole kit (#2550). `.alb-moves` walks the na hairline the tile already
 * draws, which is this re-cut's second delta and the reason the wrapper is not a
 * pass-through: strip the two classes and na is byte-identical.
 *
 * ── WHAT THIS FILE STOPPED BEING ────────────────────────────────────────────
 *
 * It was 140 lines of bespoke markup — a pure-white vellum sheet, a Cormorant
 * italic name at 40px, a 44px hairline, an inner rule 12px inside the frame, a
 * ghosted letter-framing — all of it painted from `--albescent-reveal-*`, the
 * last hand-authored register in the repo. In light that made the tile a white
 * island on a cream page, and it was the one part of the Albescent kit the
 * prism could never reach: the ground was written `background:
 * var(--albescent-reveal-surface)` INLINE, and no wrapper class can outrank a
 * style attribute. It was not missing a class; it was drinking from another tap.
 *
 * Owner ruling (#2632): the white aesthetic is purged and Albescent commits
 * entirely to the prism. **This deletes #1891 ruling 1** — *"the tile keeps its
 * face throughout"* — deliberately. The face it keeps is na's.
 *
 * ── THE TWO BEHAVIOURS THE COLLAPSE MAY NOT DROP ────────────────────────────
 *
 * **The words and the door move together (#2409, ADR-0082), on ONE predicate.**
 * Both now live in `DefaultSelectCard`: it reads its copy through
 * `redactableText` — which redacts Albescent-scoped keys and nothing else — and
 * takes the CTA's `disabled` from the same `isFactionRedacted` answer, so the
 * root's `.redacted` / `data-redacted` and the shut door cannot drift apart.
 * That component names no faction to do it. The call below is a second READ of
 * the one predicate, never a second answer.
 *
 * **The prism arrives WITH the reveal (epic #2496 ruling 8).** A redacted tile
 * keeps a FLAT ground, because `[REDACTED]` is painted in its own ground's
 * colour and a bloomed ground makes that 1:1 pairing only approximately true.
 * So the class is gated, exactly as `AlbescentTaskCard` gates the same class on
 * `groundIsBusy` — the precedent for a conditional prism, and the reason there
 * is no second ground here to keep in sync.
 *
 * `alb-moves` is unconditional: it is motion, not a ground texture, and a
 * travelling hairline reveals nothing a redacted tile is hiding.
 *
 * The mark is untouched and is not this wrapper's: `DefaultSelectCard` resolves
 * it through `FactionSigil`, which the manifest points at the labyrinth (#2529).
 * A wrapper never re-draws a mark inline (ADR-0083 §1).
 */
export default function AlbescentSelectCard(
  props: Omit<FactionSelectCardProps, "faction">,
) {
  const redacted = isFactionRedacted(ALBESCENT_FACTION_SLUG);
  return (
    <div
      className={redacted ? "alb-moves" : "alb-moves alb-prism"}
      /* The wrapper takes the box the tile used to be, so it is the flex item
         both directories already lay out: `width: 100%` up to a 360 max is the
         contract every tile honours (#732), and the mobile column centres on a
         declared cross size (#2579). Geometry only — no paint here. */
      style={{ width: "100%", maxWidth: 360 }}
    >
      <DefaultSelectCard {...props} slug={ALBESCENT_FACTION_SLUG} />
    </div>
  );
}
