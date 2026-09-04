# ADR-0091 — The latest `Era` row chooses the live ruleset, and `CURRENT_ERA` is an identity, not a name

**Status:** Accepted
**Date:** 2026-09-02

**Amends:** [ADR-0042](0042-era-as-ruleset-config-owns-rules-db-owns-history.md) — the
clause "the DB owns only history", *as applied to the choice of ruleset*. The database
still owns no rule. It now owns **which** ruleset is live: the latest `Era` row's
`config_key`. Every rule value stays in `backend/eras/`, exactly as before.

**Relates to:** [ADR-0073](0073-a-praxis-is-written-in-a-room-and-the-room-is-not-the-record.md)
(the single-instance lock this leans on), [ADR-0045](0045-pragmatic-ddd-posture.md)
(why there is no request-scoped era dependency), #827 (this issue and its ruling),
#824 (the duel freeze this control fires), #1623 (`era_config_for_key`, the registry
reused here), #2708 (the side-effect rebinding this must not reintroduce),
#2711 / PR #2760 (the hand-flip rollover this replaces), #1667 (which deleted the
admin era route this restores).

## Context

Ending an era was an owner's code edit. `CURRENT_ERA` was a constant pointing at
`ERA_1`; rolling into Era 2 meant editing `game_config.py`, deploying, and then running
`scripts/era_reset.py` from a shell. PR #2760 exists to do exactly that by hand.

Mods cannot deploy. So "end the era" — the moment that freezes every duel (#824), retires
the board, and resets every character — was reachable only by the one person who can push
to `main`. #827 asks for it as a control on the admin page, which means the active ruleset
has to resolve at **runtime** from something a mod can change, and the only such thing is
the database.

That reverses a stated invariant. `CLAUDE.md` said *"Changing `CURRENT_ERA` is the one
lever"*, `game_config.py`'s docstring said the database *"never owns the rules themselves"*,
and `models/era.py` said `config_key` was identity-only. Under this record the row still
owns no rule — but it decides which set of rules is live, which those sentences were
written to deny.

### What was already built

`era_config_for_key(config_key) -> EraConfig | None` and `_ERA_ATTRIBUTE_BY_CONFIG_KEY`
have shipped since #1623, and `services.activity_feed` already uses them to label a *past*
era correctly. The lookup this needs existed; what was missing was ordering and runtime
selection.

### The measurement that settled the shape

`era: EraConfig = CURRENT_ERA` appears **114** times under `backend/`
(`grep -rn --include='*.py' "era: EraConfig = CURRENT_ERA" backend/`; the number drifts,
the shape does not). The rejected alternative — a request-scoped
`Depends(get_current_era)` with `era=` threaded down explicitly — makes every one of them
a silent trap until it is stripped: a caller
that omits `era=` quietly serves the compile-time era, and nothing fails. It buys
correctness under a scale-out that ADR-0073 forbids, at the cost of the largest refactor
on the board.

## Decision

### 1. The latest `Era` row's `config_key` names the live ruleset

Resolved through the existing `era_config_for_key`. Bound at exactly two moments, and
there is no third:

- **process start-up**, from the app's lifespan, after the single-instance lock is held —
  and from `seed.py`, which `start.sh` runs on every deploy and whose faction mirror has
  to reflect the era the database says is live. Both ask the database which era that is,
  through `services.era.rebind_live_era`.
- **immediately after a rollover's commit**, through
  `services.era.commit_and_bind_live_era`, which takes the era config the rollover
  already holds. Not before the commit and not inside `apply_era_reset`: that function
  only flushes, and binding a process-wide object to a transaction that may still roll
  back is how the process and the database end up disagreeing about which era the game is
  in.

`services/era.py` is the only module that reaches the primitive, and
`tests/unit/test_live_era_binding.py` fails if a site outside it calls `bind_live_era`.

Services keep taking `era: EraConfig`. Not one of those call sites changes.

### 2. `CURRENT_ERA` is a stable object identity whose fields are refreshed in place

This is the part that is easy to get wrong, and the ruling's own phrasing — "rebind the
name" — does not survive contact with Python.

A default argument is evaluated **once, when the `def` executes**. Every one of those
functions therefore holds the *object* `CURRENT_ERA` named at import time, for the life of
the process. Four further sites read `CURRENT_ERA` as a module global inside a function
body, which resolves against the *importing* module's globals, not `game_config`'s.
Assigning `game_config.CURRENT_ERA = other` moves neither population: it rebinds one name
in one module while every holder keeps what it captured. A process flipped that way is
**half-flipped** — some readers on the new era, most on the old — which is worse than
either era, and is the same failure mode #2708 found from the other direction.

So the live era is one `EraConfig` instance, distinct from every era file's own config,
whose fields are overwritten **per key** when the era changes. Every holder — default
argument, module global, closure — sees the new ruleset at once, and the "call sites
untouched and correct" the ruling asked for is actually true rather than merely stated.

Per key, and never `clear()`-then-refill. That distinction is the whole safety of the
mechanism, so it is a decision and not an implementation detail: an empty-then-fill refresh
leaves the live era with **no attributes** between two statements, and every one of those
holders points at that object. FastAPI runs sync dependencies and sync route handlers in a
threadpool and the GIL is released between bytecodes, so a worker thread can read the object
mid-refresh and raise `AttributeError` on a field that exists — under load, during the one
operation this mechanism exists to enable. Overwriting key by key means a concurrent reader
sees the closing era's value or the opening era's for any given field, never a missing one,
which is exactly the straddling this record already accepts under *Consequences* and nothing
worse. A clear also buys nothing: `EraConfig` is a frozen dataclass with a fixed field list
and no `__slots__`, and both sides of every call carry all 43 declared fields, so there is
never a stale key to remove. `bind_live_era` prunes unexpected extras after the update
instead, which keeps that defensiveness without the empty state.

Consequences taken knowingly:

- **`CURRENT_ERA is ERA_1` is now false, and `CURRENT_ERA == ERA_1` is the question.**
  Correct on the merits — `CURRENT_ERA` means "the live binding", not "era 1" — but it
  broke one assertion, in `test_era_2_is_authored_not_activated`, which is updated in the
  same commit.
- **The live instance must never *be* an era file's config.** `bind_live_era` overwrites
  the fields of the object it is given custody of; doing that to `ERA_1` would leave Era 1
  carrying Era 2's rules for the life of the process. Pinned by a test.
- **Writing through a frozen dataclass** is the same move `EraConfig.__post_init__`
  already makes. The frozen wall stops *callers* mutating a config; it is not a claim that
  the module cannot own one instance.

### 3. Resolving a past era still never touches the live one

`game_config.__getattr__` keeps `CURRENT_ERA` and `ERA_N` in separate branches. #2708 found
that folding them meant `services.activity_feed`'s lookup of a stored row's key — done to
label a *past* era in the feed — silently put the whole process back on Era 1. Making the
rebinding deliberate is the same operation pointed the right way, which is exactly why the
separation has to survive it. Two tests pin it, one either side of a flip.

### 4. A fresh database falls back, loudly, and invents nothing

`bootstrap_admin` writes the first `Era` row only on an un-bootstrapped database, so
start-up can legitimately find none. `rebind_live_era` then binds
`COMPILE_TIME_ERA_CONFIG_KEY` and logs it at info. A row naming a `config_key` no era file
registers — a deleted era file, or a row from a newer version rolled back — falls back the
same way at warning, saying plainly that the game is not playing by the rules that row
records.

It does not write a row. `Era.started_by` is a not-null audit trail and a fresh process has
nobody to put in it.

### 5. The rollover is one admin operation with a target

`GET /admin/eras` lists the registered rulesets in era order and marks the live one.
`PUT /admin/eras/live` takes a `config_key`, refuses one the registry does not know
(`ERA_CONFIG_UNKNOWN`, 422), appends the `Era` row, and runs `apply_era_reset` with the
**incoming** era's flags — which freezes every unresolved duel (#824), retires the board,
and rebinds the live era.

This restores an entry point #1667 deleted, on the other side of the argument that deleted
it. `PUT /admin/era/reset` went because it was unreachable from any UI and re-instantiated
the *same* era: a destructive operation behind any admin session, for no gain. It returns
because #827 gives it the two things it lacked — a target to choose, and a mod control that
chooses it.

## Consequences

**The rules change under a live process.** A request in flight when a mod confirms the
rollover began under the closing era's rules and finishes under the opening one's. Accepted
with the ruling, and stated here so it is not discovered as a surprise. The hand-flip this
replaces had the same effect, arriving via a deploy that restarted the process. If it ever
proves to matter, the answer is draining, or rebinding behind the rollover's own lock — not
reverting to a request-scoped era.

**A process-wide mutable global is sound here because it is enforced, not assumed.**
`render.yaml` declares no instance count deliberately and the app takes a Postgres
session-level advisory lock at boot; a second instance exits loudly (ADR-0073). This spends
a constraint the CRDT praxis rooms already pay for rather than adding a new one. If that
constraint is ever lifted, this record must be revisited before the second worker starts —
two workers would drift onto different eras with nothing to notice.

**`scripts/era_reset.py` still works and is now the second-best door.** It re-opens
whichever era **the latest `Era` row** names — a new season under the same ruleset — which
is what it always did back when the compile-time era and the live era were the same thing.
It cannot choose a different one; the admin control is the one that can choose. If that
row's `config_key` resolves to no era file it refuses outright rather than falling back to
the compile-time era, because "re-open the live era" and "roll the game back to Era 1" are
not the same operation. Note the deliberate asymmetry: the route refuses the era that is
already live (`ERA_ALREADY_LIVE`), because from the admin page that is a mis-click — a full
destructive reset landing on the ruleset the game was already on — while from a shell,
behind `--yes`, it is the operation asked for by name.

**One more thing an era file must get right.** A new era is *appended* to
`_ERA_ATTRIBUTE_BY_CONFIG_KEY`, never inserted: that dict's order is the order the selector
offers, and the offer is an ordering claim about eras.

**Three records had to be corrected, not just added to.** `CLAUDE.md`'s "Config
architecture" section, `backend/game_config.py`'s module docstring and
`backend/models/era.py`'s `config_key` comment each asserted the invariant this reverses.
All three are fixed in the same commit as this record; a rule that lives in four places and
is corrected in one is worse than a rule that was never written down.
