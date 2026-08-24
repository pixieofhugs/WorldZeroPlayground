# ADR-0044 — `CharacterStats` is a per-era star-schema split off `Character`

**Status:** Accepted
**Date:** 2026-07-17

**Relates to:** ADR-0042 (era-as-ruleset), ADR-0043 (vote budget on read), `models/character_stats.py`

> Harvested from the retired `SPEC-data-models.md` during the 2026-07-17 docs
> consolidation. The shape is documented on the `CharacterStats` model docstring;
> this ADR records why the split exists and the alternative it rejects.

## Decision

All **volatile** game state — `score`, `all_time_score`, `level`,
`votes_spent_this_era` — lives in `CharacterStats`, **one row per
`(character, era)`**. `Character` is a **pure dimension**: stable identity only
(username, display name, faction, avatar). An era reset **inserts a new stats
row** rather than mutating; old rows are preserved for historical standings.

## Considered and rejected

**Mutable `score`/`level`/`votes_spent` columns directly on `Character`.**
Rejected because an era reset would then have to *overwrite* them, destroying
every prior era's standings — the game has no memory of who won Era 1. The
star-schema split makes per-era history a natural consequence of the row-per-era
shape instead of something reset logic has to preserve by hand.
