# ADR-0045 — Pragmatic DDD: implicit aggregates, anemic models, no repository layer, HTTPException in services

**Status:** Accepted
**Date:** 2026-07-17

**Relates to:** `SPEC-backend-architecture.md` §3 (aggregate map) + §5 (auth layering + the HTTPException rationale), ADR-0041 (identity), ADR-0042 (era-as-ruleset)

## Context

This backend is **deliberately not full DDD**, and the deviations are surprising enough that
a DDD-trained engineer will read the code and try to "fix" them — add a repository interface,
move behaviour onto models, or replace service-raised `HTTPException`s with a domain-exception
hierarchy plus a router-side translator. Each of those "fixes" is a large, low-value refactor
*against* a deliberate choice. `SPEC-backend-architecture` carries the mechanical *how* (the
aggregate map, the auth-layer table); this ADR records the *why* so it survives even if that
spec is later trimmed — the failure mode this whole 2026-07-17 sweep was cleaning up.

## Decision

Practice **pragmatic DDD** — the discipline of aggregates without the ceremony:

- **Implicit aggregates, not aggregate-root base classes.** Model groups always written
  together through one service (Praxis owns PraxisMember / Vote / MediaItem / Flag / …;
  Character owns CharacterStats; Account owns OAuthProvider / AccountRole) are treated as
  aggregates by convention. Cross-aggregate writes go **through services**, never model→model.
  (Map: `SPEC-backend-architecture.md §3`.)
- **Anemic models.** No behaviour on ORM models; logic lives in services (level transitions
  happen in `recalculate_character_stats`, not a `Character.level_up()`).
- **No repository layer.** Services issue SQLAlchemy directly.
- **No domain-event bus.** Direct service-to-service calls (vote → stats-recalc → taunt).
- **`HTTPException` may be raised inside services.** When a domain rule is violated, the service
  raises `fastapi.HTTPException` at the point of the check, mapping the rule to its natural
  status code (403 not-allowed, 404 not-found, 409 conflict, 422 bad-transition). Routers stay
  thin and do **not** catch-and-re-raise.

## Considered and rejected

**Full DDD ceremony** — aggregate-root types, a repository abstraction, a domain-event bus, and
a domain-exception hierarchy translated to HTTP in the router layer. Rejected because:

- **Blast radius.** 100+ existing service-raised `HTTPException`s; a mechanical rewrite to a
  parallel exception hierarchy + translator buys little and risks a lot.
- **Thin routers.** A router-side translator pushes status-code decisions away from the rule
  and fattens routers — the opposite of the posture everywhere else.
- **Soft, not hard, coupling.** A service stays unit-testable via
  `pytest.raises(HTTPException)` + `exc.status_code`; the FastAPI import does not force a web
  runtime at test time. The coupling is a type import, not a runtime dependency.

## Consequences

- "Refactor this to real DDD" is a **non-goal** — point here when it comes up.
- **Revisit triggers are explicit** (`SPEC-backend-architecture.md §11`): add a repository layer
  only if query duplication grows; add an event bus only if service-call chains grow.
- New logic goes in a **service**, not on a model — models stay anemic by rule.
