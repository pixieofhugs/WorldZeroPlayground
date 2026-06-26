# The activity feed stays a read-time projection, not a stored event log

/ status: accepted

## Context

The activity feed (`backend/services/activity_feed.py`) is derived at read time:
each of ~12 feed types has a `_fetch_*` projection over its natural source row
(votes, praxes, taunts, duels, defections, mentions…), merged and sorted per
request. Issue #181 asked whether to keep this or move to a generic stored
`activity_event` table that every service writes to — motivated partly by the
worry that "settled/derived" events (e.g. a duel outcome) have no natural home row.

## Decision

Keep the read-time projection. Do **not** introduce a stored event log.

- **Every event has a source.** Across the current and planned set (duel
  lifecycle, level-up, faction graduation), no event lacks both a source row and
  a derivable timestamp. The event log's one unique advantage — events with no
  source row — is never exercised.
- **The "hardest" case still projects.** Per ADR-0011 a duel has no discrete win
  moment, but the "live for voting" event sorts by
  `max(challenger.submitted_at, opponent.submitted_at)` — the moment the second
  side submitted. Derived from reality, so it can't drift; no `settled_at` column
  needed.
- **Extensibility is a wash, and localization favors projection.** A new type is
  the same mapping work either way; projection keeps all feed knowledge in one
  file instead of smearing emission across every writer.
- **Read cost is a tuning problem, not an architecture one.** The ~22 sequential
  round trips per load are addressed by parallelizing the existing fan-out and
  caching the badge COUNTs — not by taking on an app-wide dual-write and a
  backfill.

## Reopen condition

Revisit only if an event type appears that has **neither a source row nor a
derivable timestamp** — a moment the system must announce that nothing in the
schema records. Then add a *narrow* stored log for that event class, not a
general dual-write.

## Consequences

- Feed perf is handled by two follow-ups, not this decision: parallelize the
  projection fan-out (near-term), and cache/approximate badge counts (separate
  optimization issue).
