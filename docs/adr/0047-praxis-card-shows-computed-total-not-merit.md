# ADR-0047 — The praxis card shows the computed total, not Merit

**Status:** Accepted
**Date:** 2026-07-19
**Supersedes:** the "Merit (the card number)" decision in **ADR-0014**
**Relates to:** ADR-0014 (Contribution vs Merit), ADR-0011 (duel = two solo sides),
the Faction Praxis Cards redesign (the "score stamp") and its per-faction issues.

## Context

ADR-0014 split two numbers: **Contribution** (per-character, multiplied —
`(base + metatasks) × faction × duel + votes`) and **Merit** (`task base +
points_from_votes`, no multiplier, viewer-independent). It ruled that the
**praxis card** shows **Merit** — "it compares the *work*, not whose faction
multiplier was luckier" — and reserved the multiplier math for standings and the
**detail-page** Contribution breakdown.

The Faction Praxis Cards redesign reverses that presentation choice. Its whole
through-line is a corner **score stamp** that lays the math out on the card:
`base 12 · ×0.80 · +4 votes · = 13.6`. The owner wants the card to show the
points a praxis actually banked, and to show *why* via the stamp — surfacing the
faction multiplier where it applies.

ADR-0014's reason for hiding the multiplier still bites in exactly one place:
for a **collab**, members span factions, so "the praxis's multiplier" has no
single value (the conflated-concept problem ADR-0014 was built to avoid). The
redesign resolves this not by hiding the multiplier everywhere, but by making
the stamp **conditional** — it only surfaces a term when that term is
well-defined and non-identity.

## Decision

`PraxisCardOut.score` and the card's headline number become the **computed
total**, not Merit — but **only where the total is well-defined**. The card
renders a **conditional stamp** with these rules, per praxis type:

- **Solo** — full Contribution total: `(base + meta) × faction_mult + votes`.
  - The **multiplier** row shows only when `faction_mult ≠ 1.0`.
  - The **metatask** row shows only when `metatask_points > 0`.
  - The **votes** row always shows (`+0` is valid). **Re-affirmed 2026-07-20**
    against the design's `SCORE STAMP · CONDITIONAL STATES` section, which draws
    the votes row as *hidden* at `0`. We deviate deliberately: an absent row
    cannot say "nobody has voted yet", and that is information the card owes the
    viewer. Every other row rule here matches the design exactly.
- **Collab** — no single multiplier exists, so the stamp **collapses to Merit**:
  `base + votes = total`, **no multiplier row**. (This is the one case ADR-0014's
  reasoning still governs.)
- **Duel** — each side is its own praxis (ADR-0011). Its card shows **that
  side's own resolved total** with the **faction and duel multipliers combined
  into a single multiplier row** (shown when the combined value ≠ 1.0). The
  winner's card shows the boosted amount; the loser's the reduced one.

Consequence, accepted deliberately: in a mixed feed, a solo card and a collab
card can compute "total" differently (multiplied vs Merit). That is inherent to
the domain — the conditional rule embraces it rather than forcing one number to
mean two things.

### Backend

The `Contribution` breakdown ADR-0014 already computes
(`base_points · metatask_points · faction_multiplier · duel_multiplier ·
points_from_votes · total`) is **exposed on `PraxisCardOut`**, with a single
**display multiplier** field resolved server-side per the rules above (faction
for solo; combined faction×duel for duel; **null** for collab → card hides the
row and shows Merit). The card no longer derives vote-points by subtraction.

### Display

Total to **1 decimal** by default (`13.6`); a faction skin may format
stylistically (e.g. Singularity's terminal `13.60` / `×0.80` / `+04`) — the
underlying value is identical. Applies on both desktop (corner stamp) and mobile
(horizontal `BASE | MULT | VOTES | TOT` strip; the MULT cell collapses out when
not shown).

## Consequences

- ADR-0014's scoring model is **unchanged** — this ADR only changes what the
  **card** renders. Contribution/Merit as concepts both survive; Merit remains
  the collab-card number and the task-submission sort key.
- The multiplier is now visible on solo/duel cards, so off-faction penalties and
  duel outcomes read directly from the feed, not only the detail page.
- Mobile and desktop share the same conditional rules and the same API fields.
