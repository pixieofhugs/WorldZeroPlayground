# ADR-0043 — Vote budget is recomputed on read; only `votes_spent_this_era` is stored

**Status:** Accepted
**Date:** 2026-07-17

**Relates to:** ADR-0044 (CharacterStats star-schema), `services/scoring.py::compute_votes_available`

> Harvested from the retired `SPEC-game-rules.md` during the 2026-07-17 docs
> consolidation. The mechanics live in the `CharacterStats` model docstring and
> `compute_votes_available`; this ADR records only the decision and the rejected
> alternative, which code can't carry.

## Decision

`votes_available` is **never stored**. It is computed fresh on every read from
`vote_budget_base + floor(vote_budget_multiplier × score) − votes_spent_this_era`
(`services/scoring.py::compute_votes_available`). The only persisted quantity is
`CharacterStats.votes_spent_this_era` — monotonic within an era: +1 on a first
cast against a praxis, 0 for updating an existing vote, reset to 0 on era reset.

## Considered and rejected

**A stored `votes_available` running counter.** Rejected because the budget grows
with score (2 votes per point in Era 1), so a stored counter drifts the instant a
character earns points and would need write-time bookkeeping on every scoring
event to stay correct. Recomputing on read makes the budget a pure function of
current score and spend — no reconciliation, no drift. Do not reintroduce a
stored budget column.
