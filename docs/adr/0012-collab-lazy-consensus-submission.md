# Collaborations publish by lazy consensus, not unanimous submission

**Status:** Accepted
**Date:** 2026-06-25

## Context

A collaboration is one shared praxis with many members. The original rule required
**every** member's `has_submitted` to be true before the praxis flipped to `submitted`.
That stalls on a single absent or unresponsive member: the work is done, but it can
never go live because one collaborator drifted away.

## Decision

A collab publishes by **lazy consensus with a silence-is-consent timeout**, co-owned
by all members (see ADR on collab co-ownership).

State machine:

- **Drafting** (`in_progress`, no pending publish) — any member edits freely.
- A member **Submits** → **Pending publish**: a countdown of
  `era.collab_auto_submit_days` (= 10) starts; that member's `has_submitted = true`.
- While pending:
  - Another member **Submits** → if *all current members* have submitted → **Live** now.
  - Any member **edits the document** → **hard reset**: countdown cancelled, *everyone's*
    `has_submitted` cleared → back to Drafting. An edit means "we're not done."
  - A member **leaves** (removes their own membership) → if all *remaining* members have
    submitted → **Live**.
  - The window **elapses with no edit** → **auto-publish** to Live, regardless of who
    actually clicked Submit. Silence = consent.
- **Live** (`submitted`) — votes count. Any member edits → editing mode → back to
  Drafting (votes preserved but not counting, per ADR-0007); re-submit or re-timeout
  returns it to Live.

Scope: **collab only.** Solo publishes immediately; a duel is two `type=solo` praxes
(ADR-0011) that each submit independently. Neither uses the timeout.

Naming: a member removing *their own* membership is **leave**; removing *someone else* is
**kick**; taking the *whole praxis* out of scoring is **withdraw** (`is_withdrawn`). Three
distinct removals, kept named apart.

## Consequences

- `collab_auto_submit_days` is a new `EraConfig` field (value lives in `eras/era_1.py`),
  never hardcoded.
- The pending-publish window stores `submit_proposed_at` on the praxis (set on entering
  pending, cleared on edit / back-to-drafting).
- **The timeout fires lazy-on-access, not on a schedule.** There is no scheduler in this
  app (single uvicorn process; era reset is admin-triggered), and we are not adding one.
  The two read paths — `get_praxis` and `list_praxes` — call one helper that, on load,
  flips+persists any pending collab whose window has lapsed and recalcs its members
  (the same work `submit_praxis` does). Centralizing it there means no other caller needs
  to know the timeout rule.
  - Accepted gap: a collab **nobody ever views** stays `in_progress` (members' leaderboard
    scores understated) until first touch — but it self-heals on the next read of any kind,
    and if nobody is looking, nobody is affected.
  - Upgrade path (`ponytail`): if deterministic timing is ever needed, add an in-process
    periodic sweep; the `submit_proposed_at` field and flip helper are identical either way,
    so this choice costs nothing later.
- "What counts as an edit that resets" must be pinned (body/title/media yes; membership
  changes are their own thing) at implementation time.
