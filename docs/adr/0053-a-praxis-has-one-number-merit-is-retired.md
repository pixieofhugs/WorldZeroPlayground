# ADR-0053 — A praxis has one number; Merit is retired

**Status:** Amended by ADR-0086
**Date:** 2026-07-21

**Supersedes:** **ADR-0047** (the praxis card shows the computed total, not Merit)
**Relates to:** ADR-0014 (Contribution vs Merit), ADR-0011 (duel = two solo sides),
ADR-0052 (duels resolve at era close), ADR-0049 (the score stamp is a manifest surface)

## Context

ADR-0014 split two numbers: **Contribution** (per-character, multiplied —
`(base + metatasks) × faction × duel + votes`) and **Merit** (`task base +
points_from_votes`, no multiplier). ADR-0047 then moved the *card* to the
computed total but kept `PraxisCardOut.score` as Merit "until the redesign reads
`total`", shipping the total alongside it under a second name.

That interim state has now been live long enough to show what it cost.

### The detail page's multiplier was dead arithmetic

`praxisBreakdownParts` derived the multiplier the only way it could without a
payload field:

    multiplier = (score − votePoints) / base

With `score` = Merit = `base + votes`, that reduces to `base / base` — **1.0,
unconditionally**. The `{base} × {mult} + {votes}` branch was unreachable, and
the comment above it asserted "today every praxis scores at ×1.0", which was
never true: `era_1.py` ships `duel_win 1.5`, `duel_loss 0.5`, and Snide's
`2.0` / **`0.0`**. **A Snide praxis losing a duel forfeits its entire base and
the page rendered it as ×1.0.** That is a user-facing correctness bug, not a
tidiness complaint — and it was invisible, because the wrong number is
indistinguishable from the right one at ×1.0.

Two names for one concept is what made it possible. A surface that reads the
wrong one is not obviously wrong.

### ADR-0047's collab carve-out contradicted its own principle

ADR-0047 gave collab a `null` multiplier and collapsed its stamp to Merit,
reasoning that "members span factions, so the praxis's multiplier has no single
value". That inherits ADR-0014's genuine insight — *a praxis has no score; a
`(character, praxis)` pair does* — but applies it to a question that had already
been answered two paragraphs earlier in the same ADR: the stamp is
**author-scoped**, "the points the praxis banked for whoever made it".

Once the scoring subject is fixed to the author, the ambiguity evaporates. A
collab praxis has exactly one author. One author has exactly one faction, and
therefore exactly one multiplier. The carve-out was not protecting against a
real ambiguity — it was protecting against an ambiguity that the ADR's own
author-scoping rule had already dissolved. Worse, it discarded `metatask_points`
that the same payload was emitting, so the collab card could not satisfy its own
stated formula.

The lesson is narrow and worth naming: **"a praxis has no single score" is true
of the praxis; it is not true once you name the character you are scoring for.**
ADR-0047 named the character and then reasoned as if it had not.

## Decision

**A praxis has exactly one number: `score`, the computed total, resolved for its
AUTHOR — for every praxis type, with no carve-out.** "Merit" is retired as a
live concept.

The payload also carries the terms behind that number, so any surface can show
the working without re-deriving it:

    score = (task_point_value + metatask_points) × display_multiplier
            + points_from_votes

This invariant holds for solo, collab, and both sides of a duel. It is asserted
directly in `backend/tests/integration/test_praxis_card_breakdown.py`.

### Schema

- `PraxisCardOut.total` is **deleted** — it was a second name for `score`.
- `PraxisCardOut.base_points` is **deleted** — `Contribution.base_points` is
  only ever assigned `task.point_value`, which both schemas already carry as
  `task_point_value`.
- `display_multiplier` is a plain **`float`, never `None`**; `1.0` when nothing
  applies. Dropping the collab carve-out removed the only inexpressible case.
- `PraxisOut` gains `metatask_points`, `display_multiplier`, and
  `points_from_votes`, and sources its `score` from the same
  `author_contributions_for` resolver the card uses — so detail and card cannot
  disagree.

### A duel side's score is live and provisional

`duel_multiplier` is computed from current tallies for `active` *and* `settled`
duels, and duels do not settle until era close (ADR-0052). A side's score can
therefore change when the **opponent** receives a vote, and a Snide side that is
currently behind shows ×0.0. This is intended, and it matches the #748 winner
badge already on the same screen. Do not freeze it.

### Presentation is not consolidated

`scoreBreakdown()` is now the single resolver for cards and detail alike. The 14
praxis-detail archetypes are **not** retargeted at the card's score stamp: they
keep their inline `{base} × {mult} + {votes}` form and their per-faction
accent/muted/font theming. The duplication worth killing was the arithmetic;
#821 gave each faction its own detail voice on purpose.

### Banking rounds

`character_stats` summed contributions with `int()`, which truncates toward
zero — a true total of `49.9` banked as `49`, and `compute_level` sits directly
downstream. It now uses `round()`.

## Consequences

- The praxis-detail page can display a real multiplier for the first time.
- A collab praxis's card number now reflects its author's faction multiplier and
  its metatask points, which it previously discarded.
- ADR-0014's underlying scoring model is **unchanged**. What changes is which
  number the payload reports and how many names it has.
- **Merit survives only as history.** Nothing computes it. The Task Crown
  (ADR-0028) ranks by vote points directly, in SQL — it never read a Merit
  field.
- Scores may move by 1 where the rounding change applies.

### Known gap, deliberately out of scope

`character_stats` rounds the **sum**, not the terms, so three praxes displaying
`16.5` each show `49.5` while the profile banks `49`. Which praxis "lost" the
half point is unanswerable, and answering it is a scoring-semantics decision
deserving its own ADR. Not decided here.

## Amendment (2026-07-24, #882): every praxis type earns metatask points

This ADR's Consequences claimed a collab card "now reflects... its metatask
points", but the scoring service did not yet deliver that. `praxis_scoring.py`
fed only *solo, non-duel* praxis ids to `get_meta_task_points_bulk` — a leftover
filter, not a ruling — so a sealed collab or duel side scored `metatask_points:
0` regardless of what the payload was told to report. #882 deletes the filter:
**all praxis ids** now flow through the metatask pass.

There is **no arithmetic change** to the formula. The metatask already sits
inside the parenthesis of `score = (base + meta) × faction × duel + votes`, so:

- A **collab** now banks its metatask like any solo praxis.
- A **duel side's** metatask is multiplied by the duel outcome. A **Snide loss
  at ×0.0 zeroes the metatask along with the base** — intended: the metatask is
  part of the submission the duel judged (consistent with ADR-0015's "the duel
  multiplier is a deliberate faction perk and should keep applying to metatask
  points"). The reported `metatask_points` still shows the level-met bonus; the
  ×0.0 multiplier zeroes it inside `score`.

The scored set and the **seal set** (`applied_metatasks_for`, #932) now read the
same `PraxisMetaTask` rows for every praxis type, so they cannot desync. The
author-level gate still zeroes points for an under-level author while the seal
stays attached — `metatask_points: 0` beside a non-null seal is a legitimate
`+0` state, unchanged here.

## Amendment (2026-08-24, #2633): the metatask leaves the parentheses

[ADR-0086](0086-only-the-base-multiplies-a-metatask-is-flat.md) rules that only
the base multiplies. The payload invariant stated in *Decision* becomes:

    score = task_point_value × display_multiplier
            + metatask_points + points_from_votes + habit_bonus_points

Everything this ADR actually decided stands: a praxis has exactly one number,
resolved for its author, for every praxis type, and the payload carries the terms
behind it so no surface re-derives the arithmetic. What changes is which side of
the `+` `metatask_points` sits on.

The #882 amendment above is the clause that moves. Its second bullet reads "a
Snide loss at ×0.0 zeroes the metatask along with the base — intended: the
metatask is part of the submission the duel judged." **That is reversed.** A duel
is decided on `points_from_votes`, which was always outside the parentheses, so
the multiplier never priced the thing the duel judged; it priced the task. The
first bullet — a collab banks its metatask like any solo praxis — is unaffected,
and so is the scored-set / seal-set agreement the paragraph above establishes.
