# Duels resolve at era close

**Status:** Accepted
**Date:** 2026-07-20

## Context

ADR-0011 established that a duel's winner **floats with the votes** — there is no
per-duel voting window and no discrete "X won" moment — and closed with:
"a definitive winner only exists at era close."

Nothing implemented that close. `Duel` had no winner column, `apply_era_reset`
only built new `CharacterStats` rows, and votes are never reset, so a duel's
tally floated forever and a duel never actually ended. This ADR records the
missing half of ADR-0011; it does **not** reverse it.

## Decision

**Era close is the moment a duel acquires a definitive winner.** At every era
reset, `apply_era_reset` (`services/era.py`) freezes the outcome of every
unresolved duel.

- **New terminal state `DuelStatus.resolved`.** Lifecycle is now
  `pending → active → settled → resolved`, or `pending → declined`.
- **New columns on `duel`:** `winner_character_id` (FK `character.id`, NULL =
  tie or no-contest), `resolved_at`, and the frozen vote snapshot
  `challenger_final_points` / `opponent_final_points`.
- **Winner determination reuses the scoring rule.** The forfeit-then-tally
  comparison that already drove the live duel multiplier in
  `services/praxis_scoring.py` is extracted to one pure function,
  `duel_winner()` in **`services/duel_outcome.py`**: forfeit → the
  non-`forfeited_by_character_id` side; else strictly greater
  `VoteTally.points_from_votes`; equal → NULL. Read-time scoring and era-close
  freezing therefore cannot disagree. (It lives in its own module because
  `services/duel` already imports `services/era` — putting the rule in
  `services/duel` would make a cycle.)
- **The snapshot exists so resolved surfaces stop moving.** Votes are never
  reset, so without a frozen copy a "past duel" screen would keep re-reading a
  live tally that can still change. Once `status = resolved`, scoring reads
  `winner_character_id` rather than recomputing from the tally.
- **Incomplete duels are a no-contest.** An `active` duel (accepted, but never
  both-submitted) never became votable, so it resolves with a NULL winner and
  zero snapshots. `pending` duels — never accepted, never a contest — and
  `declined` duels are left untouched.
- **Resolution is announced once, by the era.** No new activity-feed source and
  no per-duel card. Every duel resolves at the same instant, so per-duel events
  would flood the feed with N identical-timestamp entries. The existing
  `era_announcement` source (`services/activity_feed.py`, a read-time projection
  over the `Era` table by `started_at`, ADR-0023) already fires exactly one
  global announcement when the reset inserts the new `Era` row. That is the
  notification. A player learns their own result from the resolved duel itself.
- **Per-duel voting windows remain rejected** (ADR-0011). Nothing here adds a
  freeze that is local to one duel; the only freeze is global and era-scoped.

## Consequences

- Duel resolution is coupled to the admin-triggered era reset. There is no other
  path to a resolved duel, and no background job.
- `Duel` still carries no `era_id`; "which era resolved it" is `resolved_at`.
  A duel that spans an era boundary resolves in the era that was closing.
- Any query that means "this praxis is part of a duel" must now decide whether it
  includes `resolved`. Scoring and the praxis-card duel link do (a past duel must
  keep its win/loss modifier and its identity); the live-duel gates in
  `services/duel.get_duel_for_praxis` *[2026-11-18, #3425: now `services/praxis_duel.py`]* — challenge dedupe, forfeit-on-withdraw,
  anti-participant voting — do not, because a resolved duel is over.
- The resolved-duel **screen** is design work (#719); this ADR only guarantees
  the frozen data it will read.

## Amendment (2026-11-18, #3419, #3427): ties and `resolved_era_id`

**A tie can have a winner.** "Equal -> NULL" is no longer the whole rule. On equal
`points_from_votes`, `sole_tie_taker_slug` (`services/scoring.py`) gives the win to the **sole**
faction holding the era's `takes_duel_ties` perk (`game_config.py`, #748, #2664).
Two holders cancel and the tie stays NULL. The perk is **per-era faction data**,
not a permanent advantage: Era 1 gives it to S.N.I.D.E., and another era may give
it to a different faction or none. It is not inherited
(`_NON_INHERITED_PERK_FIELDS`). Read `era.factions` for who holds it.

**`Duel` now carries `resolved_era_id`** (FK `era.id`, `backend/models/duel.py`,
#823), set by `apply_era_reset` beside `resolved_at`. "Which era resolved it" is no
longer inferred from `resolved_at`, which lands after the new era's `started_at`
and would name the wrong era. A duel still has no `era_id` for the era it began in.
