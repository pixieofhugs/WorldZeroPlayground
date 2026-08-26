# ADR-0042 — Era-as-ruleset: `game_config` owns the rules, the DB owns only history

**Status:** Amended by ADR-0087
**Date:** 2026-07-17

**Relates to:** CLAUDE.md "Config architecture", `backend/game_config.py`, `backend/eras/`

> Harvested from the retired `SPEC-architecture.md §4` during the 2026-07-17 docs
> consolidation.

## Amendment

**Partly amended 2026-08-25 by [ADR-0087](0087-structural-faction-slugs-are-not-era-owned.md)** — the "era doc wins" posture below
still governs every game rule, with **two named exceptions**. `EraConfig.starting_faction_slug`
and `reset_faction_slug` are no longer era-overridable: both are pinned to `na`, validated in
`EraConfig.__post_init__`. An era also may no longer omit `na` or `albescent` from its roster —
those two slugs carry structural roles (neutral, and endgame) that are fixed across eras.

Nothing else here moves. "Config owns the rules, the DB owns history" is reinforced by
ADR-0087, not weakened: the reason the two fields are pinned is that they were never really
*rules*, they were the names of structural slugs.

## Context

An era is not just a periodic reset — it is a **ruleset**. Vote budgets, task
caps, level thresholds, faction multipliers, and reset semantics all belong to
the era. Where those rules *live* is a decision a reader would otherwise have to
reverse-engineer, and getting it wrong (putting rules in the DB) quietly couples
game design to migrations.

## Decision

- `game_config.py` (dataclass *shape*) + `eras/era_N.py` (the *values*) are the
  **single source of truth** for every game rule. `CURRENT_ERA` resolves the
  active one.
- The `Era` **DB table stores history only** — `config_key`, `started_at`,
  `started_by` — recording *which* ruleset was live, never *what* the rules were.
- Services take `era: EraConfig = CURRENT_ERA` as a parameter; they never import
  `CURRENT_ERA` in the body. Flipping `CURRENT_ERA = ERA_2` is the one lever that
  switches the live game.
- Because rules are plain Python, logic tests import an `EraConfig` directly and
  need **no database**.

## Considered and rejected

**Rules in the database** (per-era rows for budgets/caps/thresholds) — would make
every balance change a migration, make logic un-unit-testable without a DB, and
blur the line between rules (design) and history (audit). The config *is* the
game-design tool; the DB is the logbook.
