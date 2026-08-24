# ADR-0038 — Faction identity is config-canonical; the DB row is slug + status

**Status:** Accepted
**Date:** 2026-07-15

**Relates to:** #461 (this decision), ADR-0031 (backend emits keys; the frontend
catalog resolves them), ADR-0032 (react-i18next copy catalog), ADR-0030
(default faction behaviour), #440 (the copy-catalog foundation this rides on)

> **Numbering note.** Issue #461 proposed "ADR-0035" for this decision, but that
> number was already taken by the mobile-form-factor ADR (and 0036/0037 are
> feed-sources and flag-reasons). This decision is filed as **0038**, the next
> free number.

## Context

Faction name/description prose lived in **two** places at once:

- **Config** — `FactionConfig.name` / `.description` in `backend/eras/era_1.py`,
  served live via `/game-config` and read at feed/router render time.
- **The database** — `Faction.name` / `Faction.description` columns, seeded from
  config and mutable through an admin-only `PUT /factions/{slug}` edit path
  (`update_faction` + `FactionUpdate`).

This dual source of truth is exactly the kind of drift ADR-0031 removed for
taunts and ranks/unlocks — there ADR-0031 explicitly scoped faction copy *out*,
flagging it as an unresolved "config vs admin-editable DB" fork. #461 resolves
that fork. Meanwhile the i18n epic (#440/ADR-0032) had already moved the English
faction words into `frontend/src/locales/en/factions.json` (slug-keyed `names`
and `descriptions`), and the frontend now resolves faction name/description via
`factionName()` / `factionDescription()` off the slug. The backend fields and DB
columns had become a redundant, drift-prone second copy.

## Decision

Three coupled decisions:

1. **Faction identity is config-canonical.** Config (`CURRENT_ERA.factions`) owns
   *which factions exist* and their mechanics. The English **name/description
   prose is not config-owned and not backend-emitted** — it lives only in
   `frontend/src/locales/en/factions.json` (`names.<slug>`,
   `descriptions.<slug>`), resolved by slug in the viewer's locale. Mirrors
   ADR-0031: the backend emits a **slug**, the frontend catalog owns the words.

2. **The DB `Faction` row carries `slug` + `status` (+ timestamps) only.** The
   `name` and `description` columns are dropped. The row exists for FK targets
   and status (visible/hidden/deprecated); it holds no prose. `FactionConfig`
   loses its `name`/`description` fields; every API surface
   (`FactionOut`, `FactionStatusOut`, `InvitationLetterOut`, `FactionConfigOut`,
   the activity-feed invitation/defection payloads) stops emitting faction prose
   and emits the slug instead.

3. **The admin faction-copy edit path is retired.** `PUT /factions/{slug}`, the
   `update_faction` service, and the `FactionUpdate` schema are removed (zero
   frontend callers). There is no longer any editable prose on the row to edit;
   changing a faction's words is a `factions.json` catalog edit. The admin
   *create* path survives but now writes slug + status only.

**Drift guard.** As with ADR-0031, the backend is the only layer that can
enumerate the full slug set from config, so a **backend unit test**
(`tests/unit/test_i18n_catalog_coverage.py`) reads
`frontend/src/locales/en/factions.json` and asserts `names.<slug>` and
`descriptions.<slug>` both resolve (non-empty) for **every** slug in
`CURRENT_ERA.factions` — exceptionless, including the `na` sentinel.

**Migration.** None. Per the pre-launch squash doctrine (`docs/agents/db-migrations.md`,
Strategy A), the single baseline `0001_squashed` rebuilds the whole schema from the
live ORM models via `Base.metadata.create_all` — there are no incremental migrations.
Dropping `name`/`description` from `models/faction.py` removes them from the baseline
by construction; a fresh `alembic upgrade head` builds `faction` with `slug` + `status`
only, and `alembic check` reports no drift. Existing dev/worktree DBs are reset via
`reset_db.sh` (their old prose is discarded — accepted, mirroring #451's taunt-wipe).
An incremental `DROP COLUMN` migration would in fact break a fresh `upgrade head`,
since `create_all` never creates the columns for it to drop.

## Alternatives rejected

- **Keep the DB columns, drop only the config fields.** Leaves prose in the
  database as the source of truth, un-localizable and needing the admin edit
  path — the opposite of the ADR-0031/0032 direction. Rejected.
- **Keep config as the source and seed the DB columns from it.** Preserves the
  dual copy and the drift it invites; the DB prose is never read once the
  frontend resolves by slug. Rejected.
- **Preserve `PUT /factions/{slug}` against config-backed copy.** Nothing on the
  row to edit; would have to write back into `factions.json` from the API.
  Rejected — catalog edits are a frontend/repo concern.

## Scope

**In:** faction name/description dual-source collapse; DB column drop; admin
edit-path retirement. **Out (unchanged):** task-content localization (DB rows,
player-authored free text — still a separate DB-content problem, as ADR-0031
noted); faction *mechanics* stay config-owned.
