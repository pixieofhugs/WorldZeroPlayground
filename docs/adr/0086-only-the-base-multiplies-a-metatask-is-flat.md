# ADR-0086 — Only the base multiplies; a metatask is flat

**Status:** Accepted
**Date:** 2026-08-24

**Supersedes:** the **scoring formula** as recorded in **ADR-0014**
(`(base + metatasks) × faction × duel + votes`) and restated as the payload
invariant in **ADR-0053**. Neither record's decision is otherwise disturbed.
**Relates to:** ADR-0051 (every praxis type earns metatask points), ADR-0052
(a duel side's multiplier is live and provisional), ADR-0015 (metatask is its
own model), #1617 (the habit bonus left the parentheses first), #1578 (the
`Decimal` arithmetic), #2633 (this ADR)

## Context

`services.scoring.compute_praxis_score` multiplied the metatask:

    (task_point_value + meta_task_points) × faction × duel + votes + habit

Era 1 gives S.N.I.D.E. `duel_win_modifier=2.0` and `duel_loss_modifier=0.0`.
So a +10 metatask paid **+20** on a duel win and **+0** on a duel loss. The
`×0.0` is the only multiplier in the game that can delete a term outright, and
it was deleting points a player had earned by doing a second, named thing — one
the duel never judged, and one the opponent had no part in.

The repo already contained the argument against this. #1617 pulled the habit
bonus *out* of the parentheses, and `scoreBreakdown.ts` records why:

> Multiplying it would make the same faction ability worth more under an era
> with a non-neutral modifier than under Era 1's 1.0.

Nothing distinguishes metatask points from habit points under that principle.
Both are flat bonuses a player earned by doing a specific thing beside the task.
The multipliers exist to price the *task* — how well it matches your faction
(`faction_multiplier`) and how the duel over it went (`duel_multiplier`). A
metatask is not the task.

The counter-argument was stated in `praxis_scoring.py` and is worth reading at
full strength before it is overturned: *"the metatask is part of what the duel
judged"*. It is true that a metatask is submitted with the praxis and voted on
with it. But a duel is decided on `points_from_votes` alone
(`services.duel_outcome.duel_winner`), and **votes were already outside the
parentheses** — so the thing the duel actually judges was never multiplied by the
outcome. The metatask was the one earned term that was.

## Decision

**Exactly one term multiplies: the base points of the task.**

    score = task_point_value × faction_multiplier × duel_multiplier
            + metatask_points + points_from_votes + habit_bonus_points

`meta_task_points` joins `total_stars` and `habit_bonus` as a flat term. A
S.N.I.D.E. duel loss now forfeits the base and keeps the metatask; a S.N.I.D.E.
duel win multiplies the base and does not pay a premium on the metatask either.
Both halves of the rule are the same rule.

The formula lives in `services/scoring.py` and nowhere else. Every modifier it
reads is an `EraConfig` value; no number in this record is a rule.

### The `Decimal` arithmetic is unchanged

Each term still goes through `exact()` before it is combined (#1578). Moving a
term across the `+` does not change why: a binary tail can decide an invitation
for a character sitting exactly on a threshold.

### Levels can go down

`compute_level` reads `score`, so a character whose duel win was inflating a
metatask loses those points and may drop a level. That is accepted. Invitation
letters already delivered are **not** revoked — they are idempotent on the
`(character, faction, era)` unique key, and taking back a letter for arithmetic
the player never saw would be a worse outcome than an off-by-one ladder.

### The persisted numbers need a backfill; the displayed ones do not

Per-praxis scores are derived at read time, so cards, detail pages and the
composer correct themselves the moment the formula lands. `CharacterStats.score`
is a per-era gather that is stale until something triggers a recalc, and
`CharacterStats.all_time_score` is a `+= delta` accumulator that never
self-corrects. `scripts/backfill_metatask_multiplier.py` counts the affected set
and, with `--apply`, re-banks it **as a delta** through
`recalculate_character_stats` — never as `SUM(score)`, which would undo the zero
baseline `EraConfig.reset_all_time_score` lets an era declare.

The affected set is narrow: a praxis moves only when it carries metatask points
*and* its resolved `faction_multiplier × duel_multiplier` is not 1.0. In Era 1
every non-duel modifier is 1.0 except Coven's `collab_own_modifier=1.1`, so that
is duel sides and one faction's own-faction collabs. On the dev database it is
zero rows.

## Consequences

- **A correct implementation and a broken one look identical** unless a metatask
  meets a non-1.0 multiplier. The dev seed now hangs the demo metatask on both
  duel sides (`scripts/seed_demo_praxes.py`), because `×0.0` on the base is the
  only arrangement in which the old formula and this one print different
  numbers. Without it the rule is unobservable outside a unit test.
- `test_praxis_card_breakdown.py::test_snide_duel_loss_zeroes_the_metatask`
  asserted the defect and is now
  `..._keeps_the_metatask`. Asserting it is what made the defect visible.
- No badge moves. Every `badges.ALL_BADGES` condition reads account-sibling
  facts or a duel winner, and a duel winner is decided on `points_from_votes`
  (`services/badge.py`), not on any total this ADR changes.
- No API shape changes. `PraxisCardOut` / `PraxisOut` already carried
  `metatask_points` and `display_multiplier` as separate fields; only the
  arithmetic relating them moves.
- **This record is the correction for every incidental restatement of the old
  formula in an earlier ADR** — ADR-0015 (Consequences), ADR-0017 (the read-page
  score note), ADR-0047 (superseded twice over already) and ADR-0060. Those
  records are history and are not rewritten; ADR-0014 and ADR-0053, whose
  *decisions* state the formula, carry an amendment pointing here. ADR-0076's
  worked example survives unchanged — it is a ×1.0 case, where the two formulas
  agree, which is exactly the reason this defect lived as long as it did.
