# Feed types are a registry; badge counts derive from the same query

**Status:** Accepted
**Date:** 2026-07-14

## Context

ADR-0023 fixed the activity feed as a read-time projection: each type has a
`_fetch_*` over its natural source row. But the *shape* of that projection is
shallow. Adding or changing one feed type means editing six places — a
`FEED_ITEM_TYPE_*` constant, its membership in `FILTER_QUERIES`, the `_fetch_*`
query, an `if … in allowed_types:` branch in `get_activity_feed`, a nested
`count_*` closure in `_compute_counts`, and the `if` wiring that count.

The sixth of those is the dangerous one. `_compute_counts` re-writes every
fetcher's `WHERE` clause a **second time** as a hand-authored parallel `COUNT`.
This duplication has already drifted into three live bugs:

- `duel_challenge` has no `count_*` closure at all — the `your_stuff` badge
  silently undercounts.
- the `requests` count queries only pending `PraxisInvite`, omitting the pending
  duels that the `requests` filter and fan-out both include.
- every count ignores the `before` cursor and the 50-row `SUB_QUERY_LIMIT`, so
  badges are whole-table totals while the feed itself is windowed.

Issue #489 proposed collapsing the fan-out behind a single `FeedSource` seam.

## Decision

Model each feed type as one **`FeedSource`**, held in a module-level
`FEED_SOURCES` registry, and derive counts from the **same** query object.

- `FeedSource` is a **frozen dataclass** — `item_type`, its `filters`
  membership, the `needs` context it requires (friend_ids / foe_ids /
  my_task_ids), and one `query: Callable[[FeedContext], Select]`. This matches
  the repo's dataclass-over-class convention; no per-type subclass.
- `get_activity_feed` iterates `FEED_SOURCES` filtered by `allowed_types`, runs
  each source's `query`, maps rows → items. Adding a type is one registry entry,
  not six edits.
- **Counts are never re-written.** A badge count is `COUNT` *of the source's own
  `query`*, so the filter is authored once. The three drift bugs above are
  deleted as a consequence, not patched separately.
- **`session_factory` stays** in `get_activity_feed`'s signature. It reads like a
  leak (the router only passes it back down), but it is a deliberate test seam:
  tests inject a factory that reuses the test transaction. Dissolving it would
  buy a cleaner signature at the cost of the test seam — not worth it.

  > Amended 2026-08-02 (#1532): this decision originally justified the factory as
  > *"each concurrent sub-query needs its own session under `asyncio.gather`"*.
  > That reason is gone — the gather is gone. Fanning out a session per source
  > asked for ~26 connections against a pool of 15, which is what made Updates
  > slow; the fifteen badge COUNTs are now one `UNION ALL` and the row fetches run
  > sequentially on the request's own session. `AsyncSession` is not
  > concurrency-safe, so the gather was never buying real parallelism anyway.
  > The factory survives for a narrower reason: the badge UNION runs on its own
  > connection. **Nothing above this note changes** — counts still derive from
  > each source's own windowed query, which is what this ADR is actually about.

  > Amended 2026-09-02 (#2866): an architecture review read the bullet without
  > the note above it and reached the opposite conclusion — that the factory is
  > a production *fan-out* requirement and the test seam is vestigial. It is
  > neither. Nothing in the feed is gathered, and both halves of the bullet are
  > load-bearing at once. **Production:** `_count_sources` runs the badge
  > `UNION ALL` on a session of its own, which is what holds a page to two
  > connections. **Tests:** the injected factory hands back the request's own
  > session — that is how an integration test sees uncommitted fixture data,
  > and it is *why* the two passes may never be gathered, one `AsyncSession`
  > not being safe under concurrent use. The seam is exercised, not merely
  > declared: `test_activity_feed_query_count.py` swaps the factory for a
  > counting one to assert that connection budget.

## Consequences

- Pure refactor: the `/activity-feed` payload and pagination are byte-identical
  (ADR-0023 still holds — this is projection shape, not a stored log). The feed
  integration tests are the safety net and pass untouched.
- Counts change **numbers** only where they were already wrong (duels now
  counted; counts respect the window). Add a feed-count regression test that
  asserts each badge equals the length of its windowed fetch.
- Future feed types cannot re-introduce count drift — there is no second `WHERE`
  to forget.
