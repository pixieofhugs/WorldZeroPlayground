# ADR-0024 — An in-progress praxis is private (member-only)

**Status:** Accepted
**Date:** 2026-06-30
**Relates to:** ADR-0007 (praxis editing is status-only), ADR-0013 (collaborations are co-owned), ADR-0011 (duel is two linked praxes)

## Context

ADR-0007 collapsed the praxis lifecycle to a single `status` dimension:
`in_progress` ("being edited", votes preserved but paused) and `submitted`
("sealed", votes count). It fixed *scoring* — recalculation counts only
`submitted` praxes — but said nothing about **visibility**.

As a result, an `in_progress` praxis leaks:

- `GET /praxes/{id}` only 404s on `moderation_status == hidden`; it returns an
  `in_progress` praxis to anyone with the id.
- `list_praxes` has no viewer scoping, so `GET /praxes?status=in_progress`
  returns every character's drafts, and a character profile fetch
  (`listPraxes({ character_id })`) exposes another player's drafts and
  withdrawn work.
- `GET /praxes/{id}/comments` returns the discussion on a draft to anyone.

This contradicts the intent behind "unsubmit" (issue #303): a withdrawn praxis
should behave "as if it was never submitted" — invisible to everyone but its
collaborators, and only reachable in edit mode. The same reasoning applies to a
never-submitted draft: work-in-progress is nobody else's business.

The frontend's *public* surfaces already request `status: 'submitted'`, so the
leak is purely unenforced authorization at the API layer — the client asks
nicely, but the server never checks.

## Decision

**Only `submitted` praxes are public. An `in_progress` praxis (whether a
never-submitted draft or a withdrawn one) is visible only to its members.**

Enforced at the API layer, so every caller routes through one guard:

- **Detail** (`GET /praxes/{id}`): if `status == in_progress` and the viewer is
  not a member → **404** (not 403 — do not reveal existence, mirroring the
  `hidden` rule).
- **List** (`list_praxes`): return an `in_progress` praxis only when the viewer
  is one of its members. `submitted` praxes remain public. This makes
  `?status=in_progress` return the viewer's own drafts and nothing else.
- **Comments** (`GET /praxes/{id}/comments`): same member-or-404 guard as
  detail.
- **Frontend read page** (`/praxes/:id`): a member landing on the read view of
  an `in_progress` praxis is redirected to `/praxes/:id/edit`. The public read
  view never renders a draft; the edit page is the only surface for in-progress
  work (it already owns the submit control). Non-members get the 404 from the
  API. This is the "only in edit praxis mode" clause.

**Draft and withdrawn are treated identically.** Both are `in_progress`; we do
not track "was previously submitted". One rule, no extra state.

**Withdrawing a settled duel side is blocked** (422). A settled duel has live
voting and an outcome multiplier the opponent's score depends on; un-settling
it correctly (revert to active, close voting, recalc both duelists) is out of
scope here. Blocking keeps behavior correct until the full semantics land.

## Consequences

- Unsubmitting removes a praxis from every public surface — list, detail,
  comments, profile — and the derived activity feed already filters to
  `submitted` (ADR-0023), so it disappears there too. "As if never submitted"
  holds.
- `list_praxes` and the detail/comments routes gain an optional viewer
  dependency; `withdraw_praxis` recalculates **every** member (previously only
  the actor — a collab bug where co-authors kept inflated scores).
- Existing tests that assumed drafts are public (`test_get_praxis` fetching an
  `in_progress` praxis unauthenticated, `test_list_praxes_filter_by_task_id`)
  must be updated to submit first or assert exclusion.
- Votes on a withdrawn praxis are still **preserved, not refunded** (ADR-0007):
  they re-count on resubmit. Voter budget is unchanged. Out of scope for #303.
- Deferred to follow-up issues: full duel un-settle-on-unsubmit semantics; any
  demotion notification.
