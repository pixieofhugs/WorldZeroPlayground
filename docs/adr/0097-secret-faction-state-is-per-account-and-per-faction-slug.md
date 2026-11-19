# ADR-0097 — Secret-faction state is per account and per faction slug

**Status:** Accepted
**Date:** 2026-11-19

**Amends:** [ADR-0027](0027-albescent-is-a-secret-society.md) — its *storage* only: the
sticky reveal is no longer a column on `account`.
**Amends:** [ADR-0087](0087-structural-faction-slugs-are-not-era-owned.md) — `albescent` is
no longer a slug every era must list. `na` still is.
**Relates to:** [ADR-0042](0042-era-as-ruleset-config-owns-rules-db-owns-history.md),
[ADR-0080](0080-one-life-earns-albescent-its-siblings-take-it-and-the-earner-never-can.md),
[ADR-0082](0082-albescent-is-redacted-not-hidden.md), #3435.

## Context

Three booleans named for one faction (`albescent_revealed`, `albescent_unlocked`,
`albescent_glimpsed`) sat on `account`. Owner ruling, 2026-11-18: Albescent is *this era's*
secret faction, not a permanent fixture; a later era may name another or none.

## Decision

- `EraConfig.secret_faction_slug` names the era's secret faction or is `None`, with
  `secret_faction_glimpse_level` and `secret_faction_join_level`. A non-`None` slug must be a
  key of `factions`. Era 1 and 2 set `albescent`.
- `account_secret_faction` holds one row per `(account_id, faction_slug)` with the sticky
  `revealed`, `unlocked` and `glimpsed` stamps. The migration copies the old columns into
  `albescent` rows and drops them.
- **Keyed by slug, not era.** That is the carry-forward rule: an era naming the same secret
  faction finds every stamp, one naming a different faction or none finds no row and
  everyone starts fresh. No era-reset code touches the table.
- Semantics are unchanged: stamps are monotonic, `revealed` implies `glimpsed`, `unlocked`
  also reveals, and the admin reveal (#2400) is read-only and not sticky. An era with no
  secret faction reveals nothing, admins included.
- The `/auth/me` field names (`albescent_revealed`, `albescent_glimpsed`,
  `albescent_level_required`) are unchanged; they now mean "the era's secret faction".

## Consequences

- `ALBESCENT_FACTION_SLUG` still names the filter bucket in `faction_slugs.py` and the
  sentinel set in `character_stats`; those are Albescent-shaped and move when an era first
  names another secret faction.
- Reading stamps costs one extra `selectin` query per loaded `Account`.
- The `no secret faction` path is covered by tests, not by a shipped era.
