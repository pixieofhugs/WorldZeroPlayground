# World Zero — Backend Architecture

Read this before touching anything under `backend/`. It describes **how** the
backend is assembled — the conventions agents should follow, the patterns that
already work, and the traps to avoid. For the identity model (Account vs.
Character) see ADR-0041; for the era-as-ruleset config posture see ADR-0042.

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
create a cycle*; see §10 for what to do when it does.

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
- `services/character.py::create_character` — reads `era.starting_faction_slug`
  for the faction a character is *born* into, never the `"na"` literal.
- `services/era.py::apply_era_reset` — reads `era.reset_faction_slug` for the
  faction a rollover *returns* a character to. Deliberately a second field, not
  the one above (#1580): where you start and where a rollover puts you are two
  moments an era may answer differently. It was a module constant until #1580,
  which is exactly the rule-3 shape to watch for — a reset block reading
  `era.reset_level` and `era.reset_vote_budget` and then a hardcoded slug.

---

## 3. Pragmatic DDD posture

> **Decision recorded in ADR-0045.** This section (and §5's HTTPException note) is the *how*;
> the *why* + the rejected full-DDD alternative live in the ADR so they survive spec trimming.

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
  Revisit if query duplication grows (see §11).
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
  `account_id`, and since #2155 `email` and `provider` as well. This is
  **acknowledged and narrow**: the endpoint is auth-only and answers about
  the caller alone, so none of the three is a fact about a third party.
  `email` is there because the Settings Account card has to show a player
  which address they signed up with; `provider` is display-only (ADR-0075's
  linking flow does not exist). The rest of the API keys on character.
  `tests/integration/test_auth_me_account_fields.py` ratchets the set of
  schemas allowed to carry an `email` at all, so widening this exception —
  including by making `CurrentUser` a base class — fails CI.

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

### HTTPException inside services is allowed

Services **may** raise `fastapi.HTTPException` directly when a domain rule is
violated. This is a deliberate pragmatic choice, not an accident:

- **Blast radius.** The codebase has 100+ existing `HTTPException` raises in
  services. A mechanical rewrite to a parallel domain-exception hierarchy and
  router-side translator buys little and risks a lot.
- **Single source of truth.** The service layer is the authoritative place for
  domain rules, and those rules map naturally onto HTTP status codes — 403 for
  "not allowed", 400 for "bad input", 404 for "not found", 409 for "conflict",
  422 for "bad state transition". Raising at the point the rule is checked
  keeps the error shape next to the rule.
- **Thin routers.** Moving translation into the router layer would push
  status-code decisions away from the domain rule and make routers thicker —
  the opposite of the "routes stay thin" posture elsewhere in this spec.
- **Tradeoff.** Services carry a *soft* coupling to FastAPI's `HTTPException`
  type. This is not a hard coupling: a service remains unit-testable by
  asserting `pytest.raises(HTTPException)` and inspecting `exc.status_code` /
  `exc.detail`. The FastAPI import does not force a web runtime at test time.

Routers should not catch these exceptions only to re-raise them; let FastAPI
turn them into responses. Routers that need to add context (e.g. wrapping a
404 from a different resource) can still catch and re-raise deliberately.

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
| Multi-member proof-of-work | **collab praxis** (type=collab) | One shared praxis; reaches `submitted` by lazy consensus — any member submits, silence past the window auto-publishes (ADR-0012). |
| Head-to-head competition | **duel** (two linked `type=solo` praxes) | Each side is its own praxis with its own votes; a `Duel` row links them (ADR-0011). Winner = higher star total. No `praxis_member_id`. |
| Activity unit players complete | **Task** | |
| Community rating of a praxis | **Vote** | |
| Ruleset for a playing period | **Era** | |
| Player group with a slug + modifiers | **Faction** | |
| Star-rating granted by a voter | **vote value** | 1–5 integer (`Vote.value`; "stars" is retired — ADR-0014). |
| Available voting currency | **votes_available** | Computed on read (ADR-0043); only `votes_spent_this_era` is stored on `CharacterStats`. |

If you find yourself inventing a new name for an existing concept, stop and
use the canonical one.

---

## 7. The API is a private BFF

This is not a public API. It is a backend-for-frontend with exactly one
consumer — `frontend/` — which is developed in the same repository, reviewed in
the same PR, and deployed alongside it. Every design argument that starts "but a
REST API should…" has to answer that first, because the constraints those
arguments exist to satisfy — unknown clients, clients you cannot upgrade,
clients that outlive your deploy — are not constraints we have.

Three things follow, and they are the reason this section is written down at
all.

**Screen-shaped endpoints are correct here.** `GET /me/sidebar` returns the
rail's panels: a compound read assembled for one piece of UI, named after that
UI rather than after a resource. Under public-API doctrine that is a smell, and
the cure is to expose the underlying resources and let the client compose them.
Here the cure is the disease — it turns one round trip into several, on the
first wave of every page load, to serve a caller we control and can see. Build
the endpoint the screen needs. The pressure to resist is the opposite one: a
compound endpoint that no screen uses.

**There is no versioning, and there should not be.** No `/v1`, no version
header, no deprecation window, no parallel old-and-new shape. Both halves ship
together, so a wire change is a single atomic edit across the seam — and since
#1400 the seam is checked: `backend/openapi.json` is regenerated in CI and the
frontend's types are generated from it, so a shape that changes on one side and
not the other fails the build instead of failing a user. The moment a second
consumer appears that we cannot deploy in lockstep, this paragraph is wrong and
the posture has to be revisited (§11); until then, versioning buys nothing and
costs every change twice.

**Verb and URL aesthetics are opportunistic only.** Some routes are tidier than
others, and the untidy ones are not bugs. Rename a path or straighten a verb
when you are already editing that router for another reason and the change is
free; never open a PR to do it, and never make one a precondition of shipping
something else. A rename costs a backend edit, a frontend edit, a regenerated
schema and a review — and buys a nicer-looking string that no one outside this
repository will ever read.

---

## 8. Patterns to follow

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

## 9. Patterns to avoid

- Business logic inside route handlers. If a handler has more than a few
  lines after `Depends`, it likely owes work to a service.
- Importing `CURRENT_ERA` inside a function body instead of taking it as a
  parameter.
- Module-level imports between `services/*` files that form cycles. If you
  need a function-scoped import to break a cycle, it's a code smell: leave a
  `# TODO: break cycle` comment and open a task. There are **seven** current
  instances (2026-07-31), and they are not scattered — they orbit one triangle:
  four in `services/praxis.py` + `services/vote.py` all import `services.duel`,
  because `services/duel.py` imports `_count_in_progress_praxes`, `get_praxis`
  and `is_active_member_of_task` at module level. The remaining three are in
  `services/character.py` (one of them the `praxis → faction_service → character`
  loop). Breaking the triangle needs `get_praxis` to move, which is why #1391's
  third cut exists.
- String literals for domain values (`status == "active"`). Use the Enum.
- Hand-written joins where a declared `relationship()` would load the same
  data. Most of our models have no `relationship()` declarations today.
- Fat route handlers that inline query construction. `routers/tasks.py::list_tasks`
  used to be the worst offender and is now the example of the fix: it is a thin
  parameter-forwarder, and the query it used to inline lives in
  `services/task.py::list_tasks`.
- Leaking `account_id` / `email` onto a public `*Out` schema. Always check
  before adding a field.

---

## 10. Intentional v2 deferrals

These features are **parked, not built** — deliberately deferred until v2. Do not "fix" them.

| Feature | State | Notes |
|---|---|---|
| Task Vision (Ephemerists) | config flag `is_task_vision_eligible` exists | No service exposes retired tasks to Ephemerists. |
| Multi-faction tasks | not built | `Task.primary_faction_slug` is the only faction link in live code (no `TaskFaction` table). |

**Already implemented — do not confuse with the above:** faction multipliers, MetaTask scoring,
Collaboration, and Duel resolution are *all* live. `services/scoring.py::compute_praxis_score`
applies meta-task bonuses and duel multipliers. `services/praxis.py` handles the full lifecycle
for all praxis types (solo, collab, duel). `routers/praxes.py` is the unified router at `/praxes`.
Only the exotic cases in the table above remain deferred.

---

## 11. When to revisit this posture

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

Until then, the rules in §1–§9 are enough.

## 12. When in doubt

- Start at `CLAUDE.md`'s "Where to look for X" table.
- For game rule values: `backend/eras/era_1.py`.
- For config shape: `backend/game_config.py`.
- For data model detail: `backend/models/*.py` (source of truth).
- For scoring formulas: `backend/services/scoring.py` + `praxis_scoring.py` (the live
  truth); rule *values* in `backend/eras/era_1.py`; rationale in ADR-0014/0043/0044.
