# ADR-0014: Praxis scoring is per-character Contribution; the card shows Merit

**Status:** Amended by ADR-0053
**Date:** 2026-06-24

> **Superseded in part — the *Merit (the card number)* section only.** The half
> of this ADR the title's second clause names is retired;
> [ADR-0047](0047-praxis-card-shows-computed-total-not-merit.md) moved the card
> to the computed total, and
> [ADR-0053](0053-a-praxis-has-one-number-merit-is-retired.md) then retired
> **Merit** as a live concept entirely: a praxis has one number, `score`, the
> computed total resolved for its author, for every praxis type. `PraxisOut.score`
> / `PraxisCardOut.score` are no longer Merit, and Merit is no longer the
> collab-card number or the task-submission sort key.
>
> **Everything else here stands.** The Contribution model — scoring is
> per-`(character, praxis)`, `(base + metatasks) × faction × duel + votes`,
> computed by the `compute_contributions` batch primitive over a frozen breakdown
> dataclass — the vote-tally read-model, and the `stars` → `value` vocabulary are
> all live. ADR-0053 removed the *second* number, not the per-character one.
>
> The argument below is preserved as written, including the Merit section that
> ADR-0047 and ADR-0053 had to answer.


## Context

A praxis's score is computed in **two independent places that re-derive the same
formula and can silently disagree**:

- **Read path** — `compute_praxis_score_from_db` (`services/praxis.py`), called by
  `build_praxis_out` / `build_praxis_card_out` to fill `PraxisOut.score`. It returns
  **one number for the whole praxis**. For a collab it uses the **first member's**
  faction multiplier (the docstring admits "caller should use per-member"); for a duel
  it returns multiplier `1.0` with **combined** stars and **no** duel-outcome
  multiplier.
- **Recalc path** — `recalculate_character_stats` (`services/character_stats.py`), the
  authoritative standings computation. It sums **per-member** contributions: each
  collab member scored through their *own* faction modifier, each duelist through their
  *own* faction modifier **and** their duel-outcome multiplier on their *own* stars.

So for collab and duel the number on a praxis card and the number that actually counts
toward standings are produced by different formulas. The read-path number is not dead:
the frontend renders it on praxis cards (`praxis.score.toFixed(1)`), on collab cards,
and **sorts/averages task submissions by it** (`useTaskDetail.ts`).

The root cause is a **conflated concept**. A single `score` field is asked to be two
things at once: *"how good is this submission"* (comparable across praxes) and *"how
many points did a person bank"* (per-character, with their multiplier). The moment two
factions touch one collab, "the score of a praxis" has no single answer.

Two secondary problems ride along:

- **Vote aggregation is scattered.** `func.sum(Vote.stars)` is re-queried in the read
  path, in three `_score_*` helpers, and the per-member duel tally lives in an *output
  builder* (`_build_duel_vote_summary`). No module owns "who voted and how much."
- **Vocabulary.** The DB calls a rating `stars`. The old site (and the desired UX)
  speaks of **votes**: a count of voters, each casting a 1–5 value, summed into points
  ("15 + 73 points"), with a per-voter breakdown of who voted and how much.

## Decision

### Scoring

- The atomic unit of scoring is the **Contribution**: the points **one character**
  earns from **one praxis** —
  `(base + metatasks) × faction_multiplier × duel_multiplier + points_from_votes`.
  Scoring is per-`(character, praxis)`. "The score of a praxis" is **not** a primitive.
- Contributions are computed by a **batch** primitive
  `compute_contributions(praxes, character, era, session) -> dict[praxis_id, Contribution]`
  in a new `services/praxis_scoring.py`. The single-praxis read path is the **n=1**
  case of the batch — one formula, one gather, no N+1 in recalc.
- A `Contribution` is a **frozen breakdown dataclass**
  (`base_points · metatask_points · faction_multiplier · duel_multiplier ·
  points_from_votes · total`), so the praxis detail page can render the math
  ("50 × 0.8 because it's off-faction") without re-deriving it. Recalc sums `.total`.
- The pure arithmetic stays in `services/scoring.py` (`compute_praxis_score`, the
  multiplier helpers). `praxis_scoring` is the async gather-and-assemble around it.

### Merit (the card number)

- The number a **praxis card** shows and that task submissions sort by is the
  **Merit**: `task base + points_from_votes` — **no** faction/duel multiplier,
  **viewer-independent**. It compares the *work*, not whose faction multiplier was
  luckier, and is well-defined for any praxis regardless of who is on it.
- `PraxisOut.score` / `PraxisCardOut.score` become Merit. The per-character,
  multiplied number lives only in standings and the detail-page Contribution breakdown.

### Vote tally and vocabulary

- A **Vote tally** read-model (`services/vote_tally.py`) is the single source for a
  praxis's vote aggregates: `points_from_votes` (sum of values), `voter_count`, and the
  **per-voter breakdown** (who voted + their value). One batched query, consumed by
  scoring (the sum), the card (the count), and the detail page (the breakdown). The
  backend owns "who voted and how much" even where the UI does not yet surface it.
- Vocabulary: a **vote** is one character's 1–5 value (`Vote.stars` is renamed
  `Vote.value`; "stars" is retired). **Votes** is the count; the summed value is
  **points from votes**, displayed as part of *points*.

### Duels — deferred to ADR-0011

- Duel scoring is built against the **ADR-0011** model (each side is its own
  `type=solo` praxis joined by a duel marker), so this work is **blocked by the duel
  implementation** and is not built against the retired per-member model.
- Under ADR-0011 a duel side flows through `compute_contributions` as an ordinary solo
  praxis plus one input — the `duel_multiplier`:
  1. `points_from_votes` = the side's own praxis vote sum (votes attach to the praxis;
     `Vote.praxis_member_id` becomes irrelevant and the per-member duel tally is
     deleted).
  2. Resolve the duel marker → opponent praxis → opponent `points_from_votes` + faction.
  3. `duel_multiplier = compute_duel_multiplier(own, opponent, is_winner, is_tied, era)`
     (unchanged, incl. the Snide tie-break). Floats with votes; never frozen.
  4. A `pending`/`declined` marker scores the side as a **plain solo**
     (`duel_multiplier = 1.0`), per convert-to-solo.
- The duel-lifecycle question "if one side withdraws, does the other win by default or
  revert to solo?" belongs to ADR-0011, not here; scoring consumes whatever outcome it
  defines.

### Deletions

`compute_praxis_score_from_db`, `_build_duel_vote_summary`, and the
`_score_solo_praxes` / `_score_collab_praxes` / `_score_duel_praxes` /
`_fetch_duel_context` / `_fetch_membership_context` helpers collapse into
`compute_contributions` + `vote_tally`. The scattered `func.sum(Vote.stars)` queries
die.

## Consequences

- One scoring interface, one vote-aggregation interface — the card and standings can no
  longer use divergent formulas. The drift bug is closed by construction.
- `PraxisOut.score` changes meaning (author's multiplied score → faction-neutral Merit).
  The frontend detail page gains a Contribution breakdown; cards/sort are unaffected in
  shape (still one number) but now comparable and viewer-independent.
- A `Vote.stars` → `Vote.value` migration and a frontend "stars"→"votes" copy sweep are
  in scope.
- Tests hit one interface: `compute_contributions` over a mixed set (solo, collab across
  two factions, duel win/loss/tie) asserts the breakdowns; a regression test pins
  Merit ≠ Contribution-formula drift; `vote_tally` gets a unit test.
- **Blocked by #185** (Build: duels are two linked praxes, ADR-0011).

## Alternatives considered

- **Keep "whole-praxis score" as the primitive and just dedupe the query.** Rejected:
  it cements the conflation that causes the divergence — collab still has no single
  honest answer.
- **Single-praxis primitive `contribution(praxis, character)`.** Rejected: recalc calls
  it in a loop and reintroduces the N+1 the bulk code exists to avoid, or keeps its own
  bulk path — the duplication we are deleting.
- **Fold vote aggregation into the scoring module.** Rejected: scoring needs only the
  sum; the count and per-voter breakdown are display concerns with a different consumer.
  Two adapters (scoring uses the sum; UI uses count + breakdown) justify the seam.
- **Quarantine the retired per-member duel logic behind a swappable resolver and ship
  the unification now, ahead of ADR-0011.** Rejected: building duel scoring against a
  model that is about to be replaced is throwaway work; dependency-ordering on #185
  lets us build duel scoring once, correctly.
