# ADR-0099 — Votes credit the era they are cast in; a closed era is frozen

**Status:** Accepted
**Date:** 2026-11-19

**Amends:** ADR-0014 (who a vote's points belong to), ADR-0042 (history is immutable)
**Relates to:** ADR-0028 (Task Crown), ADR-0098 (one tally), #1345, #3484

## Decision

- A vote stores `era_id`, the era live when it was cast (stamped on insert, backfilled
  from `created_at`). It never follows a re-rate.
- A praxis's base points stay with the era that sealed it. Its vote points go to the
  era each vote was cast in, so a vote on an old praxis raises its members' **current**
  era total.
- A closed era is frozen: `recalculate_character_stats` is a no-op for it. Moderation
  after the roll (failing a praxis, banning a voter) no longer changes a closed era.
- A praxis's displayed score counts only votes from its sealing era
  (`tally_votes(..., cast_in="sealed")`). The Task Crown ranks by that same number, so
  a closed era's crown cannot move and the live era's score and crown agree.
- Re-rating a vote cast in an earlier era is refused (409): it would move points out
  of a closed era. The vote can still be voided on joining the praxis (the budget
  refunds the era it was cast in).

## Why

A rehearsal showed an Era 2 vote raising an Era 1 score and level after the roll.
This replaces the sealing-era rule of #1345, which lived only in docstrings.
