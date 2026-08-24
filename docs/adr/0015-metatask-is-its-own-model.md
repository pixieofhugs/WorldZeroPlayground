# ADR-0015: A metatask is its own model, not a Task subtype

**Status:** Accepted
**Date:** 2026-06-24

> **⚠ Status (2026-07-17 audit): NOT BUILT.** The standalone-model split never
> landed. A metatask is still a `Task` row (`task_type=metatask`,
> `metatask_faction_slug`); `models/meta_task.py` records that migration 0006
> *removed* the standalone `MetaTask`/`BonusType` classes. The **access-predicate**
> parts below (`can_access_metatask`, propose/apply level split) ARE in force; only
> the model split is aspirational. See CONTEXT.md "Metatask".


## Context

A metatask is a **flat-points add-on to a praxis** — apply it to a completion and its
`point_value` stacks onto the score. It is *not* a doable task: no praxis, no votes, no
sign-up. Yet migration 0006 modeled it **as** a `Task` (`task_type=metatask`), reusing
the Task table.

That shallow reuse leaked. A metatask ignores most Task fields (`primary_faction_slug`,
the praxis relationship, and — after this ADR — `level_required`), and the mismatch
surfaced as `if task.task_type == metatask` forks scattered through scoring and apply.
Worse, **metatask access was spelled three different ways** that disagreed:

| Reading | Level source | Faction | Albescent |
|---|---|---|---|
| apply-time (`_check_metatask_eligibility`) | `era.metatask_apply_level` | yes | yes |
| scoring (`get_meta_task_points`) | `task.level_required` | no | no |
| UI flag (`is_task_eligible_for_character`) | `task.level_required` | yes | no |

The spec (SPEC-game-rules §metatask access) describes **one** access rule — propose at
level 6, apply at level 7 from your own faction, Albescent applies any faction's — plus a
flat, additive bonus. The per-metatask `task.level_required` gate is generic Task baggage
the spec never asked for. (SPEC-data-models is also stale here: it still documents a
removed `MetaTask` entity and a `percentage` `BonusType` that no longer exists.)

## Decision

### Metatask becomes its own model

```python
class MetaTask(TimestampMixin, Base):      # standalone table, not a Task
    id, title, description
    point_value          # the flat bonus
    faction_slug         # owning faction (was Task.metatask_faction_slug)
    status               # MetaTaskStatus: proposed → approved → retired
    created_by           # the proposer
```

- `PraxisMetaTask` joins `praxis_id ↔ meta_task_id` (was `task_id`).
- `Task` **sheds** `task_type` and `metatask_faction_slug`; the `TaskType` enum collapses
  to a single value and is removed (all tasks are standard).
- Migration **reverses 0006**: create `meta_task`, copy `task_type=metatask` rows over,
  repoint `praxis_meta_task`, delete the metatask `Task` rows, drop the columns/enum.
- The **propose → approve → retire** lifecycle is kept, as `MetaTaskStatus` — the genuine
  machinery a metatask shares with a task, now an honest small enum rather than borrowed
  `TaskStatus`.

### Access is one predicate, enforced once

```python
can_access_metatask(character, metatask, era) -> bool
    = is_albescent(character) or (
        character_level >= era.metatask_apply_level
        and character.faction_slug == metatask.faction_slug
      )
```

- Two callers, one definition: the **apply gate** (wrapped for 403 reason strings) and the
  **"can apply" UI flag**. The drifted `task.level_required` checks are deleted.
- **Propose** (level 6) stays a *separate* gate — proposing and applying are different
  actions.

### Access is praxis-wide; scoring does no re-check

- Once a metatask is validly applied, **every member of that praxis banks the bonus**,
  regardless of their own level/faction. Scoring performs **no** per-member access check —
  `get_meta_task_points` becomes a dumb sum of attached `point_value`s.

### Scoring formula is unchanged

- Metatask points stay **inside** the multipliers:
  `(base + metatask_points) × faction_multiplier × duel_multiplier + votes`. A shared
  metatask therefore amplifies under a winner's duel multiplier — this is intended (a
  faction's duel-win modifier is *meant* to be a perk). **No change to ADR-0014.**

### Duel symmetry

- A metatask applies to **both** linked duel praxes (ADR-0011), so neither duelist gains a
  base-point head start; the multiplier asymmetry remains the earned outcome. Today's
  single-praxis duel already gets this for free via praxis-wide; the two-linked-praxes
  model needs both-sides attachment, which **coordinates with #185**.

## Consequences

- One access predicate; the three-way gate drift is closed by construction.
- `Task` loses metatask baggage; `if task_type == metatask` forks disappear.
- A `stars`-free, percentage-free `MetaTask` — flat bonus only.
- The propose-metatask UX (today an `isMetaTask` toggle on the propose-task page) is
  **rewired** to a `/metatasks` endpoint and drops the now-dead `level_required` field — a
  rewire, not a new page.
- SPEC-data-models and SPEC-game-rules metatask sections are corrected (no `MetaTask`-as-
  separate-then-merged confusion, no `percentage` bonus, access = one predicate).
- A data migration reverses 0006; existing applied metatasks are preserved via the
  `praxis_meta_task` repoint.

## Alternatives considered

- **Keep metatask as a sharpened `Task` subtype** (document which fields it uses, leave the
  table). Rejected by the owner: the "task" framing keeps misleading, and the shared
  machinery (propose/approve) is thin enough to rebuild on a dedicated model.
- **Per-member metatask access at scoring time.** Rejected: in a duel a higher-level player
  could metatask only their own side for a base-point advantage; praxis-wide (and
  both-sides for duels) keeps the field even.
- **Flat (un-multiplied) metatask points** to make duels perfectly even. Rejected: the duel
  multiplier is a deliberate faction perk (e.g. SNIDE's duel-win modifier) and should keep
  applying to metatask points.
