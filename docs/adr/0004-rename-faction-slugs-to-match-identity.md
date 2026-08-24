# Rename faction slugs to match identity (retire the legacy-slug reuse)

**Status:** Accepted
**Date:** 2026-06-22

Earlier work rebranded factions but kept the old slugs to avoid DB/plumbing churn:
`analog` displayed as "Everymen", `gestalt` as "Warriors of Whimsy" (still shown as
"Gestalt" in code), `journeymen` as "The Ephemerists". The slug↔name mismatch became the
single largest source of drift between the vault design canon and the code, and forced
every doc and dispatcher to carry a translation table.

Decision: **rename the slugs to match faction identity** —
`analog → everymen`, `journeymen → ephemerists`, `gestalt → wow`. The site is in testing,
so breaking existing rows/links is acceptable. After the rename there are no legacy slugs;
slug == identity. Display names settle as: "Everymen", "The Ephemerists", "Warriors of
Whimsy" (scrub "Gestalt" from all player-visible UI). `snide`, `singularity`, `ua`,
`albescent` keep their slugs.

The rename is applied via a **forward Alembic migration** on top of the current head
(renames the `slug` PKs and cascades the FK columns), so it is **independent of #145** (the
0002–0008 squash, which is BLOCKED for ~30 days). It does **not** edit the squashed baseline.
When #145 is eventually unblocked, the new baseline bakes in the final slugs.

The `SLUG_ALIASES` rule (`albescent`/`aged_out` → `ua`) is unaffected — that is
alias-by-design, not a rebrand.

Related Era-1 roster reconciliation to apply in the same pass (vault is canon, code
lagged): **cut `ua_masters` from Era 1** (deferred to Era 2 per the vault) and **reassign
its L4–L7 tasks to `ua`** rather than delete them. Display-name corrections: pink =
"Warriors of Whimsy" (no "Gestalt" in player-visible UI), red = "Everymen", teal = "The
Ephemerists".
