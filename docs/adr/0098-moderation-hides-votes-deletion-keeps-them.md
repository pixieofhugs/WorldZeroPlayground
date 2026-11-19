# ADR-0098 — Moderation hides votes; deletion keeps them

**Status:** Accepted
**Date:** 2026-11-19

**Relates to:** ADR-0081 (deletion keeps votes), ADR-0014 (one tally), #3508, #3543

## Decision

A vote does not count while its voter is moderated: the voter's account is
suspended, or the voter's character is mod-banned (`banned` and `departed_at`
null). The rule lives in `tally_votes`, the one tally every score path reads.
Vote rows are never deleted, so lifting the ban or suspension brings the points
back. Each ban, un-ban, suspend and un-suspend re-scores the praxes the account
voted on, so stored scores follow in the same request.

A player-deleted account or character keeps its votes (ADR-0081). Spent vote
budgets are not refunded either way.

## Why

Banned vote-ring members kept their 21 points per post. Deleting rows would
punish a wrong ban forever; hiding them is undone by un-banning.
