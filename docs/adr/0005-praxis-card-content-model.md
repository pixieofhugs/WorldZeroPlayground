# Praxis card adopts the register-row content model, with the vote-reframe as hero

**Status:** Accepted
**Date:** 2026-06-22

The praxis card "reads flat next to the task cards" (`SPEC-faction-ui-profile.md §1 #2`). The
cause is content, not frame: every faction already has an ornate frame, but the card renders
only title + task link + a 4pt byline score, ignoring the data that makes a *completed* praxis
interesting. The design canon (`ephemerists-praxis-read.jsx` PraxisIndex register row, plus the
SNIDE/Singularity Completed-Praxis kits) defines a much richer card.

Decisions:

- **Target = the canonical register-row slot model.** The praxis card surfaces: title /
  finding, the task it completes ("re:"), grade/level, **points earned**, **the vote/rating
  summary (hero)**, author, **sealed/completion date**, **solo-vs-collab mode**, and status.
  Slots are added through the shared `praxisCard/shared.tsx` slot system so every archetype
  gets richer at once (the content-slot invariant from ADR-0002 still holds).
- **The hero is the faction's vote *reframe*** — Ephemerists' Concordance, Singularity's
  NOISE→VERIFIED — not a bare number. Today's per-faction vote surface (`VoteUI` →
  `EphemeristsVote` …) is **caster-only**. It gains a **read-only summary mode**: the faction's
  ramp (labels + colors) is extracted to one shared per-faction constant, rendered either as
  the interactive *caster* (detail page) or a compact *summary* (card). The card composes the
  **existing** `VoteUI` dispatcher in summary mode — it never re-implements the ramp, so
  "corroborated" can't drift between caster and summary.
- **Scope: the list *card* only.** The **Praxis Read / detail page** (full account body,
  evidence specimens, the interactive voting control) is a separate branch.
- Full canon-grade completed-praxis designs exist for **SNIDE, Singularity, Ephemerists**;
  Everymen / Gestalt(wow) / UA are extrapolated from the same slot model.

## Data the card needs

`PraxisCardOut` gains three fields:

- **`task_level_required`** — the grade/level slot. Trivial: `praxis.task` is already joined in
  `build_praxis_card_out`.
- **`total_votes`** — the vote-count shown beside the hero tier. Free: the score builder already
  aggregates votes.
- **`submitted_at`** — the **sealed date**. Requires a real DB change, chosen deliberately over
  `created_at` (which is the *started* date — praxis lifecycle is `in_progress → submitted`, and
  `created_at` marks creation) and over `updated_at` (which drifts on any later edit/moderation).
  Add a `submitted_at` column to `Praxis`, set it on the `in_progress → submitted` transition,
  expose it on `PraxisCardOut`, and render it as "sealed [date]".

Evidence/media count is **not** on the card — it belongs to the deferred read/detail page.

Builds on ADR-0002 (a surface composes the fine-grained dispatchers; content slots invariant).

## Status / tracking

- **Interim shipped:** all six faction cards now share an enriched content body
  (`PlaceholderPraxisBody` + `PraxisSeal`/`PraxisStats` slots) with a placeholder score "seal"
  hero and a faction-voiced label (`sealed` / `case` / `concord` / `verified`). `ponytail:`
  tagged in `frontend/src/components/praxisCard/PraxisCard.tsx`.
- **Designs for the missing three** (Everymen, WoW, UA): `docs/design-briefs/praxis-card-missing.md`.
- **Backend data + the real vote-reframe hero:** GitHub #159
  (`task_level_required`, `average_stars`, `total_votes`, `submitted_at` column).
- **Slot-invariant guard test:** GitHub #151.
- **Demo data to test against:** `backend/scripts/seed_demo_praxes.py`.
