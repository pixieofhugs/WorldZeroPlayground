# World Zero — Backend Architecture

Read this before touching anything under `backend/`. It describes **how** the
backend is assembled — the conventions agents should follow, the patterns that
already work, and the traps to avoid. For the *project overview* and identity
model (Account vs. Character), see [SPEC-architecture.md](SPEC-architecture.md).

---

## 1. Layer map

```
  routers/   ──►  services/   ──►  models/      +  game_config / eras/
     │                │                                ▲
     ▼                ▼                                │
  schemas/        scoring.py ──────────────────────────┘
```

Each layer has one job.

| Layer | Job | Key rule |
|---|---|---|
| `routers/` | HTTP adapter. Parse request, call service, serialize response. | No business logic. Route handlers should be thin enough to read in one glance (target: under ~15 lines). |
| `services/` | Business logic. Orchestrates models and enforces invariants. | Accept `session: AsyncSession` and (where rules apply) `era: EraConfig = CURRENT_ERA`. Return ORM objects or dataclasses, not Pydantic schemas — let routers serialize, or use a `build_*_out` helper living in the service. |
| `models/` | SQLAlchemy ORM tables. | No behavior. Just shape. Use `Mapped` + `mapped_column`. |
| `schemas/` | Pydantic request/response contracts. | Separate `*Create`/`*Update`/`*Out`/admin variants. Never leak `account_id` or `email` on a public `*Out`. |
| `scoring.py` | Pure domain math. | No I/O, no DB. Every function takes primitives + `EraConfig` and returns a number. Unit-tested without a DB. |
| `game_config.py` + `eras/` | Config. | Frozen dataclasses. Services read values from `era.*`, never from hardcoded literals. |

**Dependency direction is one-way.** Routers may import services, schemas, and
models. Services may import models, `scoring`, and `game_config`. Models
import nothing from `services/` or `routers/`. A module-level import inside
`services/` that points at another `services/` file is OK *if it doesn't
create a cycle*; see §9 for what to do when it does.

---

## 2. The era-config posture

All game rules live in `backend/game_config.py` (the dataclass shape) and
`backend/eras/era_N.py` (the values for era N). `CURRENT_ERA` is resolved
lazily in `game_config.py` via `__getattr__` — this is deliberate, to break an
import cycle between `game_config` and `eras/`.

The three rules:

1. **Services that depend on era rules accept `era: EraConfig = CURRENT_ERA`.**
   This lets tests pass a different era without monkey-patching.
2. **Never import `CURRENT_ERA` inside a function body.** If a service needs
   the current era, take it as a parameter.
3. **Never hardcode a value that lives on `EraConfig`.** If you're about to
   type `20`, `100`, or `(0, 10, 70, ...)` into service code, read it from
   `era.*` instead.

Canonical examples:
- `services/scoring.py` — every function takes `era: EraConfig = CURRENT_ERA`.
- `services/era.py::apply_era_reset` — takes `era: EraConfig = CURRENT_ERA`.
- `services/character_stats.py::recalculate_character_stats` — uses
  `era.factions` to look up faction modifiers.

---

## 3. Pragmatic DDD posture

This codebase is **not** full DDD. No aggregate-root base classes, no
repository interface types, no domain-event bus. What it *does* have are
implicit aggregates — groups of models that are always written together
through a service. Treat them as aggregates even without the ceremony.

### Implicit aggregates

| Aggregate root | Owns |
|---|---|
| `Character` | `CharacterStats` (per-era), `Relationship` (as `from_character`) |
| `Praxis` | `PraxisMember`, `PraxisInvite`, `MediaItem`, `Vote`, `Flag`, `PraxisMetaTask` |
| `Account` | `OAuthProvider`, `AccountRole` |
| `Task` | (referenced by Praxis; tasks themselves are admin-curated records) |

`Era` is a **value object**, not an aggregate. The DB `Era` row is an
immutable historical record of which `config_key` was active — the rules
themselves are frozen dataclasses.

### Rules that follow from this

- **Cross-aggregate writes go through services, not model↔model calls.** A
  vote does not reach into `CharacterStats.score`; `cast_or_update_vote`
  calls `recalculate_character_stats`.
- **A single request that touches multiple aggregates should touch each
  through its own service function.** This keeps invariants provable in
  isolation.
- **Aggregate-internal consistency can be enforced in the service that owns
  it.** E.g. `create_praxis` is free to write both `Praxis` and its
  `MediaItem` children in one transaction.

### What we deliberately skip

- No repository abstraction. Services issue SQLAlchemy queries directly.
  Revisit if query duplication grows (see §10).
- No behavior on models. `Character.level_up()` would be nice in theory;
  in practice, `recalculate_character_stats` is where level transitions
  happen. Leave models anemic.
- No domain-event bus. If vote → stats-recalc → taunt-emit chains grow
  longer, reconsider. For now, direct service-to-service calls are fine.

---

## 4. Identity & privacy boundary

One rule, one source of truth: **never expose `account_id` or `email` on a
public response.** Public responses key on `character_id` / `username`.

- `schemas/character.py::CharacterOut` — does not include `account_id` or
  `email`. This is the reference implementation of the rule.
- `schemas/admin.py::AccountSummary`, `AccountDetail`, `CharacterSummary`
  — do include them. These ride behind `Depends(require_admin)` and are
  the only blessed exception.
- `/auth/me` response (`schemas/auth.py::CurrentUser`) — includes
  `account_id`. This is **acknowledged and narrow**: the endpoint is
  auth-only and the frontend needs an opaque account handle. The rest of
  the API key on character.

Anti-self-voting is the other half of the identity boundary: enforced at the
**account** level, not the character level. `Vote.voter_account_id` is
denormalized specifically so the check can be done in one query.

---

## 5. Authorization layering

Three layers, each in exactly one place:

| Layer | Where | Example |
|---|---|---|
| Authentication (who is this?) | `services/auth.py::get_current_account` (FastAPI dependency) | Every authed route depends on `get_current_account` or `get_current_character`. |
| Role check (are they admin?) | `dependencies.require_admin` | Admin routers add `Depends(require_admin)` to the router or handler. |
| Domain authorization (can this *Character* do this *thing*?) | Inside services | Ownership checks, level gates, faction-rejoin rules, anti-self-vote, task-signup cap. |

Anything that needs to know about game state (level, faction, era) belongs in
the service. Anything that only needs to know "is the caller logged in / is
the caller admin" belongs in a FastAPI dependency.

Do not scatter level-gate checks across route handlers. If `flag_praxis`
requires level 4, that check lives inside `services/praxis.py::flag_praxis`.

---

## 6. Ubiquitous language

Canonical domain names, as used by **code, schemas, routers, migrations, and
docs**:

| Concept | Canonical name | Notes |
|---|---|---|
| Private login identity | **Account** | Not "User". The word "User" does not appear in code. |
| Public game persona | **Character** | |
| Completed-task artifact (the noun) | **Praxis** | The canonical noun for any proof-of-work submission. Covers solo, collab, and duel types. Table: `praxis`. |
| The act of marking proof ready | **submit** | Use "submit" / "submitted" as the verb; `PraxisStatus.submitted` as the state. |
| Multi-member proof-of-work | **collab praxis** (type=collab) | Both members must submit; praxis reaches `submitted` when all do. |
| Head-to-head competition | **duel praxis** (type=duel) | Votes are per-member via `praxis_member_id`. Winner determined by star total. |
| Activity unit players complete | **Task** | |
| Community rating of a praxis | **Vote** | |
| Ruleset for a playing period | **Era** | |
| Player group with a slug + modifiers | **Faction** | |
| Star-rating granted by a voter | **stars** | 1–5 integer. |
| Available voting currency | **votes_available** | Stored on `CharacterStats`. |

If you find yourself inventing a new name for an existing concept, stop and
use the canonical one.

---

## 7. Patterns to follow

- **Service signature**: `async def verb_noun(session: AsyncSession, ...,
  era: EraConfig = CURRENT_ERA) -> Orm | Dataclass`. Example:
  `services/vote.py::cast_or_update_vote`.
- **Pure domain math lives in `scoring.py`** and is unit-tested against
  primitives + `EraConfig` with no DB. Example: `compute_faction_multiplier`.
- **`build_*_out(orm, session)` helpers** for ORM → response conversion.
  Live in the service that owns the aggregate. Example:
  `services/praxis.py::build_praxis_out` — the canonical helper for all
  praxis types (solo, collab, duel).
- **Migrations are Alembic-only.** Never edit a model without generating a
  migration.
- **Use Enums for domain values**, not string literals. Examples:
  `ModerationStatus`, `PraxisType`, `PraxisStatus`, `PraxisInviteStatus`, `TaskStatus`.
  When a column stores an enum, the `Mapped[...]` annotation should be the
  enum class, not `Optional[str]`.
- **Separate `tests/unit/` from `tests/integration/`.** Unit tests import
  services and pure functions; they do not touch a DB. Integration tests hit
  routes via `AsyncClient` against a test DB.

---

## 8. Patterns to avoid

- Business logic inside route handlers. If a handler has more than a few
  lines after `Depends`, it likely owes work to a service.
- Importing `CURRENT_ERA` inside a function body instead of taking it as a
  parameter.
- Module-level imports between `services/*` files that form cycles. If you
  need a function-scoped import to break a cycle, it's a code smell: leave a
  `# TODO: break cycle` comment and open a task. The one current instance is
  `services/era.py:96` — see TASK A.4.
- String literals for domain values (`status == "active"`). Use the Enum.
- Hand-written joins where a declared `relationship()` would load the same
  data. Most of our models have no `relationship()` declarations today; see
  TASK A.2.
- Fat route handlers that inline query construction. `routers/tasks.py::list_tasks`
  is the current worst offender; see TASK A.5.
- Leaking `account_id` / `email` onto a public `*Out` schema. Always check
  before adding a field.

---

## 9. Intentional v2 deferrals

These features have schema or skeleton support but **no service enforcement**.
Do not "fix" them — they are deliberately parked until v2. See


| Feature | What exists | What's missing |
|---|---|---|
| Multi-faction tasks | `TaskFaction` junction table | Unused. `Task.primary_faction_slug` is the only faction link in live code. |
| Task Vision (Journeymen) | `Task.is_task_vision_eligible` column | No service exposes retired tasks to Journeymen. |
| Double Dipper (Analog) | `models/analog_double_dipper.py` | No service tracks per-level task repeats. |

**Already implemented — do not confuse with the above:** faction multipliers, MetaTask scoring,
Collaboration, and Duel resolution are *all* live. `services/scoring.py::compute_praxis_score`
applies meta-task bonuses and duel multipliers. `services/praxis.py` handles the full lifecycle
for all praxis types (solo, collab, duel). `routers/praxes.py` is the unified router at `/praxes`.
Only the exotic cases in the table above remain deferred.

---

## 10. When to revisit this posture

The current posture is sized for a ~20-model codebase with a single bounded
context. Signs it's time to revisit:

- More than three `from services.X import ...` inside function bodies —
  indicates real coupling that a module reshuffle would fix.
- Same query pattern copied across four or more service functions —
  consider a small `queries.py` helper or a repository, even if minimal.
- A second long-running chain of side effects (vote → stats → taunt →
  activity-feed) — consider a simple domain-event dispatch.
- A second bounded context emerging (e.g. a distinct moderation/admin
  domain that is no longer a thin overlay on the game model).

Until then, the rules in §1–§8 are enough.

## 11. When in doubt

- Start at `CLAUDE.md`'s "Where to look for X" table.
- For game rule values: `backend/eras/era_1.py`.
- For config shape: `backend/game_config.py`.
- For data model detail: [SPEC-data-models.md](SPEC-data-models.md).
- For formulas: [SPEC-game-rules.md](SPEC-game-rules.md) (and
  `backend/services/scoring.py`, which is the live truth — see TASK A.9 for
  a known divergence between the two).
