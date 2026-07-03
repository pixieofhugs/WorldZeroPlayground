# ADR-0028 — The Task Crown replaces the Faction Distinction Laurel

**Status:** Accepted
**Date:** 2026-07-03
**Supersedes:** the cross-task "faction champion" semantics of the Faction Distinction Laurel (`FdlLaurel` / `topPraxisIndex`)
**Relates to:** #354 (this mark), #390 / Albescent secrecy ([ADR-0027](0027-albescent-is-a-secret-society.md) — the revealed Albescent faction page carries the Task Crown like the other six)

## Context

A single cross-faction mark shipped as the **Faction Distinction Laurel** (`FdlLaurel`, a rainbow
medallion + laurel glyph). It crowned *one* praxis per faction page — the faction's single
highest-scoring recent praxis, **across all its tasks**, first-max-wins, no ties, faction-page only.

Issue #354 ("fleur de lis on top scoring praxis for any task") asks for a mark with a **different
unit**: the top-scoring praxis **per task**, shown **everywhere a praxis card appears**, with
**co-champion ties all crowned**. Reusing the same glyph for both rules is a semantic collision — the
same emblem would mean "faction champion" on one surface and "task leader" on another.

## Decision

**One mark, one meaning: "top-scoring submitted praxis for its task."** The cross-task faction-champion
concept is retired. `FdlLaurel` / `topPraxisIndex` are removed; the six faction bodies stop computing a
single champion and instead render the per-task mark on each recent-praxis card that leads its own task.

- **Name:** the **Task Crown**. Component `TaskCrown`; backend field `is_top_for_task: bool`.
- **Glyph:** an actual **fleur-de-lis (⚜)** inside the existing rainbow ring (`--fdl-rainbow`), skin-aware
  inner disc + glyph recolor per faction — i.e. swap the laurel glyph in the current medallion, keep the ring.
- **Rule (fully permissive, live):**
  - Crown the highest-score *submitted* praxis for its task, recomputed each read (like `score` itself).
  - Only `submitted` praxes compete (`in_progress` aren't scored). Since a task's base points are equal
    across its praxes, "top score" reduces to most vote-points.
  - **Ties → all tied praxes crowned** (co-champions), including the zero-vote case: a fresh multi-entry
    task is one big tie until votes differentiate.
  - **A sole entrant is crowned by default.** No minimum-submissions and no minimum-vote threshold. This
    makes the crown common at "everywhere" scope; that ubiquity is accepted — the mark is honest ("leads
    its task"), scarcity emerges as votes accumulate, and a threshold would add config + a "why isn't mine
    crowned?" support surface for marginal noise reduction.

**Surfaces:** everywhere a praxis card appears (feed, profile, praxis detail, task detail) plus the
faction pages. The corner-stamp slot already exists on the shared `PraxisCard` (`praxisCard/shared.tsx`)
and on the praxis-detail hero.

**Backend:** stamp `is_top_for_task` on `PraxisCardOut` **and** `PraxisOut`, computed via a per-task max
over vote-points (window function / grouped subquery), **not** per-card in the build loop (avoid N+1).

## Consequences

- The faction page can show several crowns (co-champions) or, occasionally, none of the shown cards if
  none happens to lead its own task — busier than the old guaranteed single laurel, accepted.
- The revealed Albescent faction page (ADR-0027 / #232) carries the Task Crown like the other six.
- The `FdlLaurel` visual asset survives only as the base medallion for `TaskCrown` (glyph swapped); the
  old naming (`Fdl`, "laurel", `topPraxisIndex`) is retired to avoid the stale cross-task meaning.
