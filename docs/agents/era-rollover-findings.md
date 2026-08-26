# Era rollover: what breaks when `CURRENT_ERA` moves

Findings from pointing `CURRENT_ERA` at `ERA_2` (Metamorphosis) and running the
backend suite against it, 2026-08-25. Era 2 had been authored-but-dormant since
#1618; this is the first time anything actually ran under it.

**Status of the branch this was found on:** docs only. The flip and the two code
fixes tried during the investigation were reverted after the grill settled that the
flip lands **last** — see Outcome at the bottom. Everything below is the evidence,
recorded as it was found; nothing here is fixed on this branch.

Result of the flip alone: **unit 442/442 green; integration 36 failed, 1061
passed, plus 3 modules that fail at import.**

---

## The headline

Era 1 is not "the current era" in this codebase — it is **the only era the code
has ever had**, and a lot of things quietly encode its roster rather than reading
the era. Nothing here is a bug in Era 2's config. Every failure is a place that
named an Era 1 faction instead of asking the era a question.

Era 2 drops four slugs — `ua`, `coven`, `ephemerists`, `singularity` — and keeps
five: `snide`, `wow`, `everymen`, `albescent`, `na`.

---

## F1. The rollover script cannot perform a rollover

`scripts/era_reset.py` is the documented way to close one era and open the next.
It cannot do it, and the reason is circular:

```python
current_era_row = await get_current_era_row_safe(session)   # era_reset.py:99
if current_era_row is None:
    print("ERROR: no era row for the current config - run seed.py before a rollover.")
    return 1
```

`get_current_era_row_safe` (`services/era.py`) resolves the live era as *the
latest `Era` row whose `config_key == CURRENT_ERA.config_key`*. The instant
`CURRENT_ERA` becomes Era 2, **no row carries `era_2` yet** — creating it is the
job of the very script that just refused to run. The script's own `print_plan`
proves the intent: it prints `current_era_row` as the era being **closed**, so it
wants the *old* row and looks it up by the *new* key.

Worse, the same lookup backs the whole app. Between the deploy and the rollover,
`get_current_era_row` raises:

```
500 "No active era configured. Run the initial seed before creating characters."
```

...on every path that resolves a character's stats. So the deploy window is an
outage that only the rollover can end, and the rollover is what the outage blocks.

**This has never been exercised.** `tests/integration/test_era_reset_script.py`
builds its era row from `CURRENT_ERA.config_key` (via the `era` fixture in
`conftest.py`), so every test rolls Era N into Era N — a config-key *change* has
no coverage at all.

### Options (needs a decision, they are not equivalent)

- **(a) Fix the script only.** Look the closing era up as *the latest `Era` row*,
  regardless of key. Smallest change; leaves the deploy-window 500s.
- **(b) Redefine "the live era" as the latest row** in `get_current_era_row_safe`,
  dropping the `config_key` filter. This is what the append-only invariant already
  says — `get_closing_era_id` and `get_next_era_row` both document "rows are only
  ever appended, one per reset". Closes the window *and* fixes the script in one
  line. **Cost:** "the era is unseeded" stops meaning "no row for this key" and
  starts meaning "no rows at all", so a deployed-but-not-rolled-over app serves
  the *new* rules against the *old* era row instead of failing loudly. It also
  breaks exactly one test, which mutates `era.config_key = "era_not_seeded"` to
  simulate the unseeded state (`test_praxis_feed_scope.py:153`).
  *(Tried on this branch, then reverted — it is a judgement call, not a cleanup.)*
- **(c) Let `seed.py` open the row.** The seeder already runs on every deploy
  (`start.sh`) and already owns "make the DB match the era config" for factions and
  tasks. Having it insert the `Era` row for an unseen `config_key` removes the
  window entirely — but it collides with the rollover, which *creates* that row
  itself to stamp `started_by`. Bigger redesign; probably the honest end state.

---

## F2. Dropping a faction from the config leaves its row visible

`models/faction.py` states the design outright:

> "Retiring a faction means dropping it from the era config, which leaves its row
> `hidden`."

Nothing implemented the second half. `seed.upsert_era_factions` only ever *added*
rows, and `GET /factions` serves `visible` rows straight from the table — so after
the flip the registry would still have offered `ua`, `coven`, `ephemerists` and
`singularity` to join, while `can_join_faction` (which reads the era config) refused
every one of them. Four factions you can see and cannot join.

It went unnoticed because until now no era had ever dropped one.

**Ruled**: not `hidden` — a third status, `retired` (ADR-0087, issue #2706). Rows are
never deleted; `character.faction_slug` and `task.primary_faction_slug` are FKs onto
this table and a closed era's rows are the history they point at.

**The knock-on that forced the third status:** `hidden` factions' *tasks* drop out of
every listing (`services/task.py` filters on `hidden_faction_slugs`), and that filter
has never excluded a row in production — `hidden_faction_slugs` subtracts `na` from its
own result, leaving only `aged_out`, which no task carries. Retiring four real factions
through `hidden` would have activated a dormant filter and taken most of Era 1's task
history out of the archive.

---

## F3. Seeding a fresh DB and rolling over an existing one are different paths

This matters directly for "delete the database and test again".

`bootstrap_admin` creates the `Era` row **only when Pixie's account is absent** —
i.e. only on a genuinely un-bootstrapped database.

- **Fresh DB**: the seeder writes an `era_2` row. No rollover needed, no F1 at all.
  This path works today.
- **Existing DB**: the seeder never writes the row, so `era_2` never appears unless
  `era_reset.py` writes it — and F1 says it will not.

So wiping the DB *routes around* F1 rather than testing it. If the rollover is
meant to be a supported operation, it needs its own test against a config-key
change, not just a fresh-seed run.

---

## F4. Dev seeding breaks on a fresh Era 2 database

`scripts/seed_demo_praxes.py` hardcodes Era 1 slugs:

```python
METATASK_FACTION_SLUG = "ua"       # line 100  — not in Era 2
DUEL_TASK_FACTION_SLUG = "snide"   # line 125  — fine
COLLAB_TASK_FACTION_SLUG = "coven" # line 145  — not in Era 2
```

and line 516 does `era.factions[COLLAB_TASK_FACTION_SLUG].collab_own_modifier`
— an unguarded `KeyError` under Era 2.

Phase 5 is **dev-only** (`if env == "dev"` in `seed.py`), so production is safe.
But it will fire the moment anyone seeds a fresh dev database on this branch,
which is exactly the plan. Fix before re-testing.

`seed.py:305`'s `DUEL_FIXTURE_TASK_FACTION_SLUG = "ua"` is already guarded — it
no-ops when the row is absent — so it degrades quietly rather than crashing.

---

## F5. The test suite is written against Era 1's roster

All 39 integration failures, by cause:

| # | Cause | Where |
|---|---|---|
| 10 | **FK violation** — a fixture seeds a `Task`/`Character` into a slug with no `Faction` row, because the seeder no longer creates it | `test_seed_score_fixtures`, `test_score_rounds_half_up`, `test_backfill_metatask_multiplier` |
| 8 | **`KeyError`** on `CURRENT_ERA.factions["ua" / "coven" / "singularity"]` | 3 of these are *module-level* constants, so the file fails at import: `test_collab_vote_recalc:33`, `test_era_scoped_recalc:42`, `test_habit_bonus:37` |
| 9 | **Scoring assertions** that only hold under Coven's 1.1 collab modifier | `test_score_rounds_half_up::test_coven_collab_banks_half_up` |
| 7 | **Level-jump fixture errors** | `test_level_jump_signup` |
| 4 | **Route rejections** (400/422/404/403) — correct behaviour: the faction does not exist | `test_dev_login`, `test_admin_edit_task_faction`, `test_characters` |
| 1 | Ephemerists' retired-task carve-out | `test_praxes`, `test_task_can_sign_up_filter`, `test_task_visibility_gates` |

The shared fixture is the single biggest lever: `conftest.faction_ua` seeds exactly
two literal rows (`ua` visible, `na` hidden) and `factories.py` defaults every
character, task and duel side to `faction_slug="ua"` — **257 `"ua"` literals across
82 files.** Its own docstring admits the slug is arbitrary:

> "`ua` is the default slug because it is the only faction the shared fixtures seed
> a row for, and most callers do not read the slug at all."

### Two traps found while attempting the migration (both cost a full test run)

1. **Seeding only the live era's factions makes it worse, not better** —
   197 failures instead of 36. The ~250 sites that seat a character in `ua` need
   that row to *exist*; production keeps it too (hidden, never deleted). The fixture
   should seed every slug any era ever configured and let the live era decide
   `visible` vs `hidden` — that is production's actual shape.
2. **`era.starting_faction_slug` is the wrong default.** It is `na`, and `na` is a
   sentinel two rules treat specially: `faction_slugs.faction_filter_slugs` folds it
   together with `albescent` for every faceted list, and
   `scoring.compute_faction_multiplier` reads a cross-faction task as own-faction.
   Defaulting to it silently changed the answer to ~25 task-listing tests.

### And the trap under both of them

**Metamorphosis has no ordinary faction.** Era 1's `ua` was a plain vehicle —
baseline modifiers everywhere, one small perk. Every Era 2 faction carries
something: `snide` the duel gamble (2.0/0.0), `wow` the level jump, `everymen`
Double Dipper, `albescent` inherits all of them, `na` is a sentinel. There is no
neutral slug to default a fixture to, so the fixture needs to *declare* what it
wants ("a faction with no duel modifier") rather than name one.

---

## F6. Rules that lose their subject entirely

These are not test bugs. The rule still exists and is still era-driven; Era 2 just
grants it to nobody, so the guard silently stops guarding. Each needs a decision:
**skip loudly**, or **pin the test to `ERA_1`** (services all take
`era: EraConfig = CURRENT_ERA`, so a test can name its era — that seam already exists).

| Rule | Held by | In Era 2 |
|---|---|---|
| `habit_bonus_points` (+5 on a praxis sealed inside the window) | `ua` only | **nobody** — Era 2 has no habit bonus at all |
| Collab bonus (1.1x) | `coven` only | **nobody** — era_2.py says so: "the first era with no non-1.0 collab modifier at all" |
| Task Vision (praxis on a retired task) | `ephemerists` | `allow_praxis_on_retired_task_factions` is empty by design |

The half-up rounding tests are the sharpest case: Coven's 1.1 was the *only* thing
producing a fractional score to round. With every modifier at 1.0 there is nothing
to round, so `test_coven_collab_banks_half_up` cannot fail no matter what the
rounding code does. A vacuous pass is worse than a red test.

---

## F7. Consequences of Era 2 that are correct but worth saying out loud

Not bugs — design consequences the rollover makes real:

- **Everyone lands in `na`.** `reset_faction=True` with the default
  `reset_faction_slug`. Ex-UA characters are not stranded, but nobody keeps a
  faction. Admin role lives on the `Account`, so admin access survives.
- **Four faction kits go dark.** `ua`, `coven`, `ephemerists`, `singularity` have
  built frontend kits (#1632 and others). Their CSS keys stay in
  `frontend/src/utils/factions.ts` and degrade to `default` — harmless — but the
  work is invisible until an era brings them back.
- **The Albescent unlock gets dramatically cheaper.** Its coverage half requires a
  praxis for every non-sentinel faction in the era: seven in Era 1, **three** here.
  The level half (`albescent_level_required=8`) does not move. Already flagged in
  `eras/era_2.py` as knowingly accepted.
- **Albescent inherits less.** `inherits_faction_perks=True` widens it to the best
  perk any faction in *this* era holds. No Ephemerists means no Task Vision to
  inherit; no UA means no habit bonus.
- **Retired task titles stay reserved forever** — `services/task_import.py` dedupes
  on title with no status filter, and the whole board retires at rollover. Already
  documented on `retire_board_at_era_close`; it starts to bite from the second era.

---

## Outcome

Grilled with the owner 2026-08-25. Every open question is settled; the rulings are recorded
in **[ADR-0087](../adr/0087-structural-faction-slugs-are-not-era-owned.md)** (which amends
ADR-0042 and ADR-0030) and the vocabulary in `CONTEXT.md`.

**The flip lands last, not first.** Every issue below is independently valuable and passes
under Era 1, so they land with CI green throughout and `CURRENT_ERA` moves once at the end
against a suite that already proves Era 2's rules. The branch this was found on has been
reverted to docs only for that reason.

| Issue | |
|---|---|
| [#2705](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2705) | `era_reset.py` cannot roll over into a new `config_key` — F1/F3 |
| [#2706](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2706) | A dropped faction is `retired`, not `hidden` — F2 |
| [#2707](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2707) | `EraConfig` must require `na` + `albescent` and pin the two `na`-fields |
| [#2708](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2708) | Fixtures ask the era for a faction, never name one — F5 |
| [#2709](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2709) | Per-era rules modules + perk-coverage guard — F5/F6 |
| [#2710](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2710) | Dev demo fixtures KeyError on a fresh Era 2 DB — F4 |
| [#2711](https://github.com/pixieofhugs/WorldZeroPlayground/issues/2711) | Point `CURRENT_ERA` at Era 2 — blocked by the six above |

### Rulings that resolved the open options above

- **F1** → the live era is **the latest `Era` row**, full stop (option b). The loud failure the
  `config_key` filter used to provide moves to a seeder warning on every deploy.
- **F2** → **option (ii)**: a third `FactionStatus`. `hidden` stays "system row"; `retired` leaves
  the registry but keeps its task history in the archive.
- **F5** → a test may know only that it got *some* faction. Fixture default is the first
  non-sentinel faction the era defines; score assertions derive from the slug the fixture
  actually used.
- **F6** → per-era rules modules, one per registered era, with a guard requiring each to name
  every perk that era grants. The registry it walks already exists (`_MAX_PERK_FIELDS` and
  siblings, built for #1871).
- **F4** → the demo fixtures drop the perk-demonstration property; they seed *a* collab.
- **Structural vs roster** (new, from the owner): `na` is the neutral faction and `albescent`
  the endgame **in every era**; everything else is roster, and any perk may vanish or move
  between eras. A faction not in the live era is retired.
