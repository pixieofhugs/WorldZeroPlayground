# ADR-0062 — Praxis detail is a published-only reading surface

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1085 (epic), #1086 (ADR-0061, the sibling behaviour change)
**Depends on:** ADR-0059 (submitting a collab or duel part holds the
composer) — this ADR's argument only holds once every open multi-party state
has a composer home
**Widens:** ADR-0024 (an in-progress praxis is private) — the member-only
guard grows a second status

## Context

`PraxisDetail.tsx` (`frontend/src/pages/PraxisDetail.tsx`) redirects
`in_progress` to the composer (ADR-0024: an in-progress praxis is
member-only). It does **not** redirect `PraxisStatus.pending` — a collab
mid-consensus renders the detail page today behind a "PENDING PUBLISH —
waiting on co-authors to submit" banner (`detail.banners.pendingPublishLabel`
/ `pendingPublishBody`, `frontend/src/pages/praxisDetail/shared.tsx:278`).

Meanwhile #1071 (ADR-0059) made the composer hold after you submit, giving
every open multi-party state a home there. Leaving `pending` on detail gives
one state two owners that describe it differently.

## Decision

**Praxis detail is a published-only reading surface. Every open state
belongs to the composer.**

- The guard widens to `in_progress || pending`.
- `detail.banners.pendingPublish*` and `detail.banners.inEditing*` are
  deleted — the first becomes unreachable, the second already was.
- Detail then covers exactly three axes: `status` published-only,
  `moderation_status` (`visible` / `flagged` / `failed`, the last carrying
  `admin_note`), and `is_top_for_task` — crossed with visitor / owner /
  steward.

## The naming trap this ADR exists to prevent

`pending` reads as "waiting on the other party". **It is collab-only — solo
and duel never enter it** (`backend/models/praxis.py`, the `PraxisStatus`
enum comment on `pending`; the status is assigned only in
`backend/services/collab_consensus.py`). A duel side that has cast is
`submitted` with the duel still `active`, which is why #999 needs
`_duel_side_hidden_condition` (`backend/services/praxis.py`) to hide it
rather than relying on status.

So state the rule by intent, not by enum: *drafting, mid-consensus, or
waiting on a rival — all composer.*

## Why the redirect is safe

`praxis_visibility_condition` (`backend/services/praxis.py`) exposes
`submitted` praxes publicly plus the viewer's own member praxes. A `pending`
praxis is not `submitted`, so only members reach it, and every member has a
destination in the composer — the waiting surface if they have cast, the
ordinary composer if they are the holdout. The redirect cannot strand a
viewer.

## Consequences

- One state, one owner: `pending` is read only by the composer's waiting
  surface, never by detail.
- `detail.banners.pendingPublish*` and `detail.banners.inEditing*` are
  deleted from `praxis.json` rather than left dormant — both are
  unreachable once the guard widens.
- Detail's remaining state space is exactly `moderation_status ×
  is_top_for_task`, crossed with visitor / owner / steward — no `status`
  branching left to reason about beyond the redirect itself.
