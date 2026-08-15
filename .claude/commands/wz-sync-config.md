# /wz-sync-config

**Installation:** Copy this file to `worldzero-playground/.claude/commands/wz-sync-config.md`
**Invoke in Claude Code:** `/wz-sync-config`

Syncs era config values in `backend/eras/era_1.py` against the vault source of truth.

**Scope:** Config and data values only — faction modifiers, era parameters, level thresholds.
**Not in scope:** Logic changes, structural changes (adding/removing factions, renaming slugs, schema changes). Those go through `/wz-drift-check` and require a GitHub issue.
**Rule:** Never apply any change without explicit approval. Show the diff, wait for "yes apply."

---

## Step 1 — Check that the vault SOT exists

Look for these two files (paths relative to this repo root):

- `../engineering/World-Zero-Engineering.md`
- `../design/World-Zero-Design.md`

If either file is missing, stop and say:

> The vault SOT files haven't been created yet. Run `/wz-reconcile` in Cowork first to adjudicate conflicts and produce the topic files. Then come back here.

If both exist, proceed.

---

## Step 2 — Read source files

Read all three of these in full before doing anything else:

1. `../engineering/World-Zero-Engineering.md` — era config values, vote budget, level thresholds
2. `../design/World-Zero-Design.md` — faction list, faction names, colors, descriptions, mechanics
3. `backend/eras/era_1.py` — the live config to be compared

Also read `frontend/src/factions.ts` — it has parallel faction config that needs to stay in sync.

---

## Step 3 — Extract and compare config values

From the vault SOT files, extract the intended values for each field below. From `era_1.py`, extract the current code values. Produce a comparison table.

### EraConfig fields

| Field | Current (`era_1.py`) | Vault SOT | Match? |
|---|---|---|---|
| `vote_budget_base` | | | |
| `vote_budget_multiplier` | | | |
| `max_task_signups` | | | |
| `level_thresholds` | | | |
| `faction_graduation_level` | | | |
| `invitation_point_threshold` | | | |
| `second_character_level_required` | | | |
| `albescent_level_required` | | | |

Include any other `EraConfig` fields present in `era_1.py` that aren't listed above.

### Level unlock table

Compare the level → unlock mapping. Source the current state from `era_1.py` (and any level-gate constants defined there). Source the intended state from the vault engineering file.

### FactionConfig fields (per faction)

For each faction defined in `ERA_1_FACTIONS`, compare:

| Faction | Field | Current | Vault SOT | Match? |
|---|---|---|---|---|

Fields to compare per faction: `name`, `description`, `color`, `is_selectable`, `can_always_rejoin`, `own_task_modifier`, `other_task_modifier`, `collab_own_modifier`, `collab_other_modifier`, `duel_win_modifier`, `duel_loss_modifier`.

**Do not compare slugs** — slug changes are structural (rename in DB, routes, frontend). Flag them separately (see Step 4).

### Frontend factions.ts

Compare faction `name`, `color`, `description`, and any modifier-adjacent fields in `factions.ts` against the vault design SOT.

---

## Step 4 — Flag structural drift (don't fix it here)

If you find any of the following, flag them clearly but do NOT attempt to fix them in this command:

- A faction in the vault SOT that has no matching slug in `era_1.py`
- A faction in `era_1.py` that doesn't appear in the vault SOT
- A slug that appears to have been renamed
- A new level unlock that requires a new field in `EraConfig`
- Any change that would require a DB migration or new route

For each structural mismatch, produce a one-line description formatted for a GitHub issue title:

> **Structural drift (not synced):** [description — use /wz-drift-check to file issues]

---

## Step 5 — Present proposed changes

For each mismatched config field, show the exact edit to `era_1.py` using a before/after diff block. Be specific — show the line, not just the field name.

Example format:

```python
# era_1.py — proposed changes

# vote_budget_multiplier
- vote_budget_multiplier=2.0,
+ vote_budget_multiplier=2.5,   # per vault SOT (engineering file, §Vote Budget)

# S.N.I.D.E. duel_win_modifier
- duel_win_modifier=2.0,
+ duel_win_modifier=1.8,        # per vault SOT (design file, §S.N.I.D.E.)
```

Group by section: EraConfig fields first, then faction-by-faction.

If there are zero mismatches, say so clearly:

> `era_1.py` is in sync with the vault SOT. No changes needed.

---

## Step 6 — Wait for approval

After presenting the diff, ask:

> Apply these changes to `era_1.py`? Say "yes apply" to proceed, or tell me which ones to skip.

Do not edit any file until you receive explicit approval. If the user says "skip X", remove that change and confirm what will be applied before touching anything.

---

## Step 7 — Apply approved changes

Edit `era_1.py` (and `factions.ts` if frontend changes were approved) with exactly the approved changes. No other edits.

After applying, re-read the changed file and confirm the values are correct.

Then say:

> Done. Applied [N] changes to era_1.py[, N changes to factions.ts]. Vault SOT and code are now in sync for these fields.
>
> Structural mismatches flagged (not synced): [list, or "none"]

---

## Hard rules

- Never edit `game_config.py` — that's the dataclass shape, not values. It only changes when a new field is added to the spec.
- Never change task content in `ERA_1_TASKS` — tasks are content, not config.
- Never change taunt templates in `ERA_1_TAUNT_TEMPLATES`.
- Never change logic in services, routes, or models.
- If a vault SOT value is ambiguous or missing for a field, ask before proposing a value. Don't infer.
- If the vault SOT files were last reconciled more than 30 days ago (check the file header), warn before proceeding.
