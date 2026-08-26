# ADR-0087 — Structural faction slugs are not era-owned; a dropped faction is retired, not deleted

**Status:** Accepted
**Date:** 2026-08-25

**Amends:** [ADR-0042](0042-era-as-ruleset-config-owns-rules-db-owns-history.md) — the
"era doc wins" clause, *as applied to two fields only*. `starting_faction_slug` and
`reset_faction_slug` stop being era-overridable. Every other rule stays era-owned;
the ADR's posture is otherwise untouched and is in fact reinforced below.
**Amends:** [ADR-0030](0030-default-faction-behaviour-ua-is-ordinary-grid-is-a-directory.md) —
the clause "hides only the non-destination sentinel slugs `na` and `aged_out`,
implemented as `HIDDEN_SLUGS = {na, aged_out}`". The directory now also omits
factions the live era does not list.

**Relates to:** [ADR-0019](0019-characters-start-unaffiliated-invite-gated-factions.md)
(born unaffiliated — reinforced, not changed), [ADR-0038](0038-faction-identity-is-config-canonical.md)
(the `Faction` row is slug + status only), [ADR-0080](0080-one-life-earns-albescent-its-siblings-take-it-and-the-earner-never-can.md)
and [ADR-0082](0082-albescent-is-redacted-not-hidden.md) (Albescent's eligibility and
redaction — untouched), #1559 (which opened the seam this closes), #1618 (Era 2 authored).

## Context

Era 1 was the only era the code had ever run. Pointing `CURRENT_ERA` at Era 2 for the
first time surfaced that "the roster is era-owned" had been applied too widely: the
era config was treated as the authority on *every* faction slug, including the two
that carry structural roles the game cannot function without.

Two specific things went wrong, and neither is a bug in Era 2's config:

1. **`na` and `albescent` were era-owned by omission.** Nothing required either to be
   present. `faction_slugs.py` asserted that only `na` is structurally required and said
   nothing about `albescent`; `EraConfig` checked neither. An era file could have dropped
   `na` — the FK target for the born-unaffiliated state and for cross-faction tasks — and
   the failure would have been a foreign-key violation at the first character creation.

2. **Dropping a faction from the config did nothing to its row.** `seed.upsert_era_factions`
   only ever added. `models.faction.FactionStatus` already documented the intended
   behaviour — "retiring a faction means dropping it from the era config, which leaves its
   row `hidden`" — but nothing implemented it, because until a second era went live no era
   had ever dropped one. Era 2 drops four (`ua`, `coven`, `ephemerists`, `singularity`), so
   `GET /factions` would have kept offering all four to join while `can_join_faction`, which
   reads the era config, refused every one of them.

The second is also where the existing two-value `FactionStatus` runs out. `hidden` was
minted for *system* rows — `na`, `aged_out` — that no player should ever act on, and the
one place that reads it (`services.task.list_tasks`, via `hidden_faction_slugs`) uses it to
drop those factions' tasks from every listing. That filter has never excluded a row in
production: `hidden_faction_slugs` subtracts `na` from its own result, leaving only
`aged_out`, which no task carries. Retiring four real factions through the same flag would
have activated a dormant filter and taken most of Era 1's task history out of the archive —
including the retired archive `level_to_see_retired_tasks` unlocks at level 2 — while the
praxes written against those tasks stayed visible, linking to tasks that appeared in no list.

## Decision

**Faction slugs fall into two populations, and only one of them is era-owned.**

### Structural — fixed in every era

- **`na` is the neutral faction in every era.** It must be present in `era.factions`. It is
  the FK target for the born-unaffiliated state and for cross-faction tasks, and those two
  meanings stay distinct (`UNAFFILIATED_FACTION_SLUG` / `CROSS_FACTION_SLUG` are not aliases).
- **`albescent` is the endgame faction in every era.** It must be present in `era.factions`.
  *Its gate is still era-tunable* — `albescent_level_required` and the coverage rule remain
  ordinary era fields. What is fixed is that it exists and that it is the endgame.
- **`starting_faction_slug` and `reset_faction_slug` are pinned to `na`.** Both stay as
  `EraConfig` fields, validated in `__post_init__` rather than deleted, so a future era
  author gets an instructive failure instead of a missing word. This closes the pre-sort
  seam #1559 opened.
- Enforcement is in `EraConfig.__post_init__`, so a malformed era file fails at import
  rather than at the first request.

### Roster — era-owned, as before

Every other faction is the era's to choose, and so is every perk. A perk may vanish between
eras or move to a different faction; nothing may assume Era 1's assignment. `ua` held the
habit bonus, `coven` the collab bonus, `ephemerists` Task Vision — all three are absent from
Era 2, and that is a design choice, not a regression.

### A faction the live era does not list is *retired*

`FactionStatus` gains a third value. The three now mean:

| Status | Meaning |
|---|---|
| `visible` | In the live era. Listed in the registry, joinable subject to the ordinary gates |
| `retired` | Was in some past era, not in the live one. Out of the registry and out of the join options; **its task history stays in the archive** |
| `hidden` | A system row (`na`, `aged_out`) no player should ever act on. Never listed anywhere |

`seed.upsert_era_factions` becomes a two-way mirror: it adds a row for every slug the live
era lists, and marks `retired` every row the live era does not. **Rows are never deleted** —
`character.faction_slug` and `task.primary_faction_slug` are FKs onto this table, and a
closed era's characters and tasks are the history those columns point at.

`hidden_faction_slugs` keeps returning `hidden` only. That is the whole point of the third
value: retirement removes a faction from the *registry*, not from the *record*.

## Consequences

- **`FactionStatus` regains a third value that #1398 deliberately removed.** That deletion's
  stated reason was "nothing else ever writes this column... no writer could produce it".
  Retirement is exactly the writer that was missing, so the reason is void — but this ADR
  exists partly so the next reader does not re-delete it on the old argument.
- **The Factions grid loses four tiles at the Era 2 rollover** and gains them back only if a
  later era lists those slugs again. Their kits (#1632 and others) stay in
  `frontend/src/utils/factions.ts` and degrade to `default`; the work is dormant, not lost.
- **Era 1's task archive survives the rollover**, which it would not have under a single
  `hidden` flag.
- **A character can hold a retired slug.** Between a deploy and the rollover, and in any era
  that sets `reset_faction=False`, a character sits in a faction the live era has no config
  for. `scoring.compute_faction_multiplier` already answers `1.0` for an unknown slug, and
  the name still resolves from the copy catalog, so this degrades rather than breaks.
- **Tests may not name a faction to get one.** A fixture may know only that it got *some*
  faction; a test that asserts a score reads the modifier off the slug the fixture actually
  used. A test whose subject is a specific perk finds the holder by the perk, or lives in
  that era's own rules module.

## Considered and rejected

**Delete `starting_faction_slug` and `reset_faction_slug`.** With both pinned to `na` they
are config for a value that never changes, and four call sites would inline
`UNAFFILIATED_FACTION_SLUG` instead. Rejected because the fields are the vocabulary an era
author would need to *express* the intent; a validated field explains the rule at the point
someone tries to break it, a missing field explains nothing. Reopening the seam is deleting
one validation line.

**Require every era to declare a perk-free "baseline" faction** so fixtures have a neutral
vehicle. Rejected: it makes game design serve the test suite. Era 2 gives all five of its
factions something on purpose, and an era should stay free to do that.

**One flag: retire through `hidden`.** Simplest, and it is what the `FactionStatus` docstring
literally said. Rejected because it conflates "a system row nobody may act on" with "a real
faction people were in", and the observable cost is Era 1's task archive disappearing.

**Stop filtering tasks by faction status at all**, deleting the dormant filter instead of
teaching it a third state. Genuinely the smaller change, and it would also have preserved the
archive. Rejected because the filter is a live seam for a rule we may want (hiding a faction
mid-era *should* be able to pull its tasks), and losing it to solve a different problem is a
trade we would have to undo.
