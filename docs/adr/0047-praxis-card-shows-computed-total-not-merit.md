# ADR-0047 — The praxis card shows the computed total, not Merit

**Status:** Superseded by ADR-0053, ADR-0076
**Date:** 2026-07-19

> **Superseded by [ADR-0053](0053-a-praxis-has-one-number-merit-is-retired.md)**
> — a praxis has exactly one number, `score`, the computed total resolved for its
> author, for every praxis type with no carve-out.
>
> This ADR moved the *card* to the computed total while leaving
> `PraxisCardOut.score` as Merit, shipping the same number twice under two names.
> ADR-0053 collapsed the two: Merit is retired as a live concept, the collab
> carve-out below is gone (`display_multiplier` is a plain float, never `None`),
> and the detail page's `(score − votePoints) / base` derivation — which that
> interim state silently pinned at ×1.0 — is deleted.
>
> **The row policy below outlived the number it was written for.** ADR-0053 kept
> the conditional stamp and made `scoreBreakdown()` its only resolver, so the
> rules in *Decision* still describe live behaviour — read them through ADR-0049
> and ADR-0053 for where they now live. One clause has since gone:
> [ADR-0076](0076-a-base-only-score-reads-as-a-bare-total.md) overturned the
> **votes row always shows** exception (re-affirmed below on 2026-07-20), so a
> base-only praxis now reads as a bare total instead of a total plus `+0 from
> votes`.
>
> The argument below is preserved as written. It is the record of what was
> decided in July 2026 and of what ADR-0053 and ADR-0076 had to answer; it is not
> the live decision.

**Supersedes:** the "Merit (the card number)" decision in **ADR-0014**
**Relates to:** ADR-0014 (Contribution vs Merit), ADR-0011 (duel = two solo sides),
the Faction Praxis Cards redesign (the "score stamp") and its per-faction issues.

## Amendment

Superseded by [ADR-0053](0053-a-praxis-has-one-number-merit-is-retired.md) (2026-07-21); the
votes-row clause separately superseded by
[ADR-0076](0076-a-base-only-score-reads-as-a-bare-total.md) (2026-08-15). Accepted 2026-07-19.

**2026-08-24 (#2536), unresolved:** this record declares itself superseded, but
[ADR-0049](0049-the-score-stamp-is-a-manifest-surface.md) states that "ADR-0047 is **not**
superseded" and treats its conditional row-selection rules as the shared half every skin
still uses, and ADR-0076 supersedes one further clause of it a month later. The status above
follows this record's own declaration. If the row-selection rules are in fact still live,
this wants re-cutting as an amendment rather than a supersession.

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

The rows are one policy, not four accidents: **a row exists when it tells the
viewer something the total mark does not already say** — with the votes row as
the single declared exception below.

- **Solo** — full Contribution total: `(base + meta) × faction_mult + votes`.
  - The **base** row shows only when some other term has moved the figure.
    **Added 2026-07-29 (#1131).** With no multiplier, no metatask and no vote
    points, the stamp printed `10.0 POINTS` and then restated it as `BASE 10` —
    the same number twice. So the base row is hidden when it would only repeat
    the total. The total **mark** stays: under ADR-0049 it is the faction's
    signature device (UA's ensō, Everymen's roundel, the Ephemerists' rubric),
    and dropping it would cost identity, not redundancy. The owner was offered
    "hide base *and* `+0 from votes`" and declined the second half, so the empty
    state is the mark plus the tally.
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

### Where the rules live

All of them live in `scoreBreakdown(praxis)` and nowhere else — ADR-0049 made
that function the single row-selection authority for all nine stamps, and
ADR-0053 made it the only place the breakdown is resolved. A hidden row is a
`null` term (`base`, `mult`, `meta`); each skin decides only what a row *looks*
like. `base` is null exactly when no other term is in play, so a skin that hangs
its multiplier chip off the base row can drop the whole row as one unit without
orphaning the chip. A row rule added to a component instead of the resolver is a
bug in nine places.

## Consequences

- ADR-0014's scoring model is **unchanged** — this ADR only changes what the
  **card** renders. Contribution/Merit as concepts both survive; Merit remains
  the collab-card number and the task-submission sort key.
- The multiplier is now visible on solo/duel cards, so off-faction penalties and
  duel outcomes read directly from the feed, not only the detail page.
- Mobile and desktop share the same conditional rules and the same API fields.
