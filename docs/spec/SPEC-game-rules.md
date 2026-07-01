# World Zero — Game Rules

> This is the source-of-truth spec for World Zero game mechanics. It reflects the
> intended rules after reconciliation with the Notion design docs (April 17, 2026)
> and follow-up design decisions made the same day.
>
> Code references: `backend/game_config.py` (config shape), `backend/eras/era_1.py`
> (Era 1 values), `backend/services/scoring.py` (formulas). When code and this
> document disagree, **this document is the target**; any gaps are flagged with
> ⚠️ **Not yet implemented** and need backend work to close.

---

## Change log

**2026-06-05 — June reconciliation (vault SOT sync)**
- Additional character slot level gate: **4** (was 5 in spec and code; confirmed by requirements doc)
- Faction choice at level 3: **opt-in, not forced**. `aged_out` / `AgedOutOfUA` graduation mechanic retired. `check_faction_graduation` removed — UA characters no longer auto-graduate.
- /Albescent unlock condition: account must have a character at **level 8** who has completed **at least one task from each faction** (not "one of every task" — one per faction is the bar)
- Collaboration participant cap: **removed**. Era 1 collaborations are unlimited. `max_collab_participants` removed from EraConfig.

**2026-04-17 — Design decisions (follow-up)**
- Second character creation level gate raised from 3 → **5** (subsequently corrected to **4** — see 2026-06-05 entry)
- Albescent faction choosable for new characters only when account has **at least one character at level 8**
- Albescent onboarding: second character starts in Albescent (skips UA); at level 3 can optionally switch to another faction (not forced); `can_always_rejoin=True` so any character who has been Albescent can return
- Vote budget: **on-read recomputation** — `votes_available` is always computed fresh from formula, never stored as a running counter

**2026-04-17 — Truth reconciliation pass**
- Snide tie rule: opponent now uses their own faction's `duel_loss_modifier`, not Snide's 0.0×
- Task signup level gate: added (can only sign up for tasks ≤ your level)
- `task_submit_level_gap` field: **removed** — once signed up, you can always submit
- Metatask level privileges: corrected (see/propose at L6, apply own at L7) — L4 "meta task access" row removed ⚠️
- Albescent: second-character starting faction at level 1, skips UA ⚠️
- Duel anti-self-vote: now account-level (was character-level for duels)
- Collab max participants: hard-capped at 20 ⚠️
- Vote budget: continuously recomputed as score grows
- Era reset level: 0 (Notion previously said 1 — corrected in Notion)
- Sunyata faction: dropped from design entirely (was hidden, unused)
- "The Terminal" display name replaced with "Singularity" throughout

---

## What is configurable per era vs. hardcoded

### Configurable per era (fields on `EraConfig`)

| Field | Era 1 value | Effect |
|---|---|---|
| `max_task_signups` | 20 | Max concurrent in-progress praxes per character (bank cap) |
| `max_duel_participants` | 2 | Max members in a duel praxis |
| ~~`max_collab_participants`~~ | removed | Era 1 collaborations have no participant cap. Field was never added to code; do not add it. |
| `vote_budget_base` | 100 | Base votes for a new character; also the reset floor |
| `vote_budget_multiplier` | 2.0 | Votes grow by `floor(multiplier × score)` |
| `level_thresholds` | `(0,10,70,170,330,610,1090,1840,3040)` | Score required to reach each level (index = level) |
| `reset_score` | `True` | Whether era reset zeroes character score |
| `reset_level` | `True` | Whether era reset zeroes character level |
| `reset_faction` | `True` | Whether era reset returns characters to `"na"` |
| `reset_vote_budget` | `True` | Whether era reset resets votes_available to `vote_budget_base` |
| `reset_all_time_score` | `False` | Whether era reset clears all-time score (almost always False) |
| `factions` | dict of `FactionConfig` | Per-faction point multipliers and duel modifiers |
| `tasks` | tuple of `TaskDef` | Task definitions seeded for this era |
| `taunt_templates` | dict | Per-faction taunt message templates |

**Removed:** `task_submit_level_gap` — dropped entirely. Once a character signs up for a task (signup is level-gated; see below), they can always submit it regardless of their current level or subsequent era resets.

Per-faction fields on `FactionConfig` (all configurable per era):

| Field | Effect |
|---|---|
| `own_task_modifier` | Solo multiplier when task faction matches character faction (or task is unaffiliated) |
| `other_task_modifier` | Solo multiplier on all other tasks |
| `collab_own_modifier` | Collab multiplier on own-faction tasks |
| `collab_other_modifier` | Collab multiplier on other-faction tasks |
| `duel_win_modifier` | Applied to base points if this character wins a duel |
| `duel_loss_modifier` | Applied to base points if this character loses a duel |
| `is_selectable` | Whether players can choose this faction at level 3 |
| `can_always_rejoin` | Whether a character who left can return (UA Masters, Albescent) |

### Hardcoded in service code

| Rule | Value | Where |
|---|---|---|
| Task signup minimum level | `task.level_required ≤ character.level` | `services/praxis.py::_check_create_preconditions` |
| Collaboration minimum level | 1 | `services/praxis.py::COLLABORATION_LEVEL_REQUIRED` |
| Duel minimum level | 2 | `services/praxis.py::DUEL_LEVEL_REQUIRED` |
| Flagging minimum level | 4 | `services/praxis.py::flag_praxis` |
| Second character requires level | 4 on any existing character | `era.second_character_level_required` in `eras/era_1.py` |
| Albescent faction choosable for new characters | Requires account to have at least one character at level 8 who has completed at least one task from each faction | ⚠️ Not yet enforced — see SESSION R |
| Faction choice | Level 3+ with a valid faction invite may optionally join a faction. No forced graduation — opt-in only. | ✅ `check_faction_graduation` removed — UA characters no longer auto-graduate |
| Stars range | 1–5 | `services/vote.py` |
| Snide tiebreaker rule | Snide always wins a tie vs non-Snide | `services/scoring.py::compute_duel_multiplier` |
| Unaffiliated task slug | `"na"` | `services/scoring.py::UNAFFILIATED_FACTION_SLUG` |

---

## Scoring

### Praxis score formula

```
praxis_score = (task_point_value + meta_task_points) × faction_multiplier × duel_multiplier + total_stars
```

- **`task_point_value`** — set on the Task by the proposer/admin.
- **`meta_task_points`** — flat bonus from attached MetaTask(s); multiple metatasks stack additively. 0 if none, or if the character doesn't have access to that metatask for this praxis (see Metatask access). Applied per-member for collab and duel.
- **`faction_multiplier`** — see Faction Multipliers section below.
- **`duel_multiplier`** — 1.0 for solo and collab; outcome-based for duels (see Duel section).
- **`total_stars`** — sum of all raw star ratings across every vote on this praxis. Stars add flat after all multipliers. Not an average.

Score is **not stored** — it is computed on the fly from votes whenever requested.

### Character score

```
character.score = sum of praxis_score for all non-hidden, non-withdrawn praxes this era
```

Updated synchronously on every vote cast/updated and on withdraw/resubmit. The `CharacterStats` row for the current era holds the cached score.

### All-time score

Increments with every point gain. Never decremented, including on era reset. Stored on `CharacterStats.all_time_score`.

### Vote budget

```
votes_available = vote_budget_base + floor(vote_budget_multiplier × character.score) − votes_spent_this_era
```

`votes_available` is **always recomputed on read** from this formula — it is never stored as a running counter. `votes_spent_this_era` is the count of distinct praxes the character has cast a first vote on during this era (updates to existing votes cost 0).

- **First cast** on a praxis costs 1 (increments `votes_spent_this_era`).
- **Updating** an existing vote (changing star value) costs 0 — budget is not re-deducted on updates.
- `votes_available == 0` blocks new votes but not updates.
- Budget grows organically as the character earns points: 2 additional votes per point earned in Era 1.

Implemented as on-read recomputation in `services/scoring.py::compute_votes_available` — the budget is computed fresh from the formula on every read (stored column is `votes_spent_this_era` only), consumed in `services/vote.py` and `routers/characters.py`.

### Level computation

```
character.level = highest index i where character.score ≥ era.level_thresholds[i]
```

Level is recalculated synchronously every time score changes (via `recalculate_character_stats`). It is stored on `CharacterStats.level` for query performance.

---

## Faction multipliers

Multipliers are applied based on the character's faction and the task's `primary_faction_slug`. A task with `primary_faction_slug = "na"` is treated as own-faction for all characters (no penalty).

### Solo and duel (use `own_task_modifier` / `other_task_modifier`)

| Faction | Own-faction task | Other-faction task |
|---|---|---|
| UA | 1.0× | 1.0× |
| UA Masters | 0.8× | 0.8× |
| S.N.I.D.E. | 1.0× | 0.7× |
| Gestalt | 1.1× | 0.7× |
| Ephemerists | 1.0× | 0.7× |
| Analog | 1.0× | 0.7× |
| Singularity | 1.0× | 0.7× |
| /Albescent | 1.0× | 1.0× |

For duels, `faction_multiplier` uses the solo own/other modifiers, and `duel_multiplier` is applied on top.

### Collab (use `collab_own_modifier` / `collab_other_modifier`)

Each member's score is computed independently using their own faction's collab modifiers.

| Faction | Own-faction collab | Other-faction collab |
|---|---|---|
| UA | 1.0× | 1.0× |
| UA Masters | 0.8× | 0.8× |
| S.N.I.D.E. | 1.0× | 0.7× |
| Gestalt | 1.1× | 0.9× (less penalty than solo) |
| Ephemerists | 1.0× | 0.7× |
| Analog | 1.0× | 0.7× |
| Singularity | 1.0× | 0.7× |
| /Albescent | 1.0× | 1.0× |

---

## Praxis types

### Solo

- Any character who meets the task's `level_required` and has bank capacity can create a solo praxis.
- **Signup level gate:** character.level ≥ task.level_required. Enforced in `services/praxis.py::_check_create_preconditions`.
- Creator is automatically added as the sole `PraxisMember`.
- Votes are praxis-wide (no `praxis_member_id` required). Anti-self-vote is enforced at account level.

### Collaboration

- Requires character level ≥ 1 (hardcoded) **to *create* a collab**.
- **No participant cap** in Era 1 — any number of characters may join a collaboration.
- Creator invites other characters. Each accepts or declines via the invite flow.
- **Level-lift rule (by design):** accepting a collab invite lets a **lower-level player collaborate on a task above their own sign-up level**. `respond_to_invite` gates the accept only on the invitee's **bank cap** and the collab not already being **submitted** — it deliberately does **not** check the invitee's level or the task's `level_required`. An invite is a lift by a qualified creator; this is not a bypass to be "fixed" later.
- A collab reaches `submitted` status when **all current members** have individually marked `has_submitted = True`.
- Each member's score is computed independently using their own faction modifiers.
- Votes are praxis-wide. Members cannot vote on their own collab (account-level anti-self-vote).

### Duel

- Requires character level ≥ 2 (hardcoded).
- Max participants: `era.max_duel_participants` (Era 1: 2).
- Creator invites one opponent. Opponent accepts or declines.
- Votes are **per-member** (`praxis_member_id` required). Voters may vote for one or both members — each is a separate `Vote` row.
- Duel participants cannot vote on **either side** of a duel they're in, at the **account level** — a voter cannot use any of their characters to rate the challenger's *or* the opponent's side. Enforced per-praxis in `services/vote.py`: the account-level anti-self-vote blocks the participant's own side, and when the target praxis is a duel side, the vote is additionally rejected (403) if the voter's account owns either side of that duel (#309).
- Winner is determined by the highest `total_stars` across each member's votes.
- **Forfeit (sticky).** Unsubmitting a `settled` duel side, or having your character banned, forfeits the contest: the opponent wins by default — win/loss faction modifiers apply and vote tallies are ignored — and the duel stays `settled`. Recorded once in `Duel.forfeited_by_character_id`; resubmitting does not restore the contest (ADR-0011 §Forfeit). Scored in `services/praxis_scoring.py::compute_contributions`; triggered by `withdraw_praxis` / `soft_delete_character`.

### Duel outcome multipliers (Era 1)

| Faction | Win | Loss |
|---|---|---|
| UA | 1.5× | 0.5× |
| UA Masters | 0.8× | 0.8× |
| **S.N.I.D.E.** | **2.0×** | **0.0×** |
| Gestalt | 1.5× | 0.5× |
| Ephemerists | 1.5× | 0.5× |
| Analog | 1.5× | 0.5× |
| Singularity | 1.5× | 0.5× |
| /Albescent | 1.5× | 0.5× |

**Tie tiebreaker rule:**
- If exactly one participant is Snide: Snide wins the tie. **Snide receives their own `duel_win_modifier` (2.0×); the other player receives their own faction's `duel_loss_modifier`** (e.g. a UA player in this situation receives 0.5×, not Snide's 0.0×). Implemented in `services/scoring.py::compute_duel_multiplier` (the modifier is resolved from each character's own faction).
- If neither or both are Snide: both get 1.0× (no win/loss applied).

---

## Level privileges

| Level | Points (Era 1) | Unlocks |
|---|---|---|
| 0 | 0 | Browse tasks |
| 1 | 10 | Sign up for tasks; start collaborations |
| 2 | 70 | See pretired tasks; start duels; group pages |
| 3 | 170 | Optionally choose a faction if invited (not forced; may stay in UA indefinitely); propose tasks |
| 4 | 330 | Flag praxes; create additional characters |
| 5 | 610 | Vote to promote level-0 tasks; new UX secrets |
| 6 | 1090 | See metatask list; propose metatasks |
| 7 | 1840 | Apply metatasks from own faction |
| 8 | 3040 | New UX secrets; /Albescent invitation triggered when player has completed at least one task from each faction; once received, /Albescent is choosable for any future characters on this account |

**Notes:**
- Invitation letters are *not* a level-table unlock. Per **ADR-0022**, a character earns faction X's invitation once it meets **both** conditions, per-character / faction-scoped / era-scoped: (1) `invitation_task_threshold` tasks completed for X (default **2**), and (2) `invitation_point_threshold` points earned from X's tasks (default **50**). The old level≥3 / score≥20 gate and the "Pledge allegiance to [faction]" praxis condition are **dropped**. Points include vote-driven points, so a letter can land when later votes push a faction's total past the threshold. Delivery happens in `services.character_stats` after a praxis is scored and is idempotent on the (character, faction, era) key; letters surface in the player's update feed. Earning is per-character — account-pooling applies only later, at the *join* gate (ADR-0019).
- Metatask access for /Albescent is a faction perk, not a level privilege: Albescent characters may apply metatasks from any faction.

Point thresholds come from `era.level_thresholds` and vary per era.

---

## Factions

### Faction selection

- All characters start in **UA** (not selectable — assigned automatically), **except** /Albescent second-or-later characters which start in `/Albescent` at level 1 and never enter UA. ⚠️ Albescent-at-creation not yet implemented.
- At level 3, a player **may optionally** choose a faction if they have received at least one valid invitation. There is no forced graduation from UA — players can remain in UA indefinitely.
- The `aged_out` / `AgedOutOfUA` mechanic is **retired**. `check_faction_graduation` removed — existing `aged_out` characters can still choose a faction; no new characters will be put there.
- **Faction change / defection:** a character can switch factions subject to defection rules tracked in `FactionDefectionHistory`. `can_always_rejoin=True` factions (/Albescent) can always be rejoined after leaving.

### Era 1 selectable factions

| Slug | Name | Identity |
|---|---|---|
| `ua_masters` | UA Masters | Veterans aged out of UA. Flat 0.8× on everything. |
| `snide` | S.N.I.D.E. | High-risk duel specialists. 2.0× wins, 0.0× losses. |
| `gestalt` | Gestalt | Collective-minded. Bonus on own tasks, penalty on other. |
| `journeymen` | The Ephemerists | Wanderers recording fleeting truths. Task Vision (access to select retired tasks — deferred v2). |
| `analog` | Analog | Depth over breadth. Double Dipper (repeat one task per level — deferred v2). |
| `singularity` | Singularity | Hidden/lurker faction. Currently 1.0× own / 0.7× other. Lurker ability (vote bank +100 on trigger) — deferred. |

### Special / non-selectable factions

| Slug | Name | Notes |
|---|---|---|
| `ua` | UA | Starting faction. Full points. Players may stay indefinitely (opt-in faction choice from L3). |
| `albescent` | /Albescent | Second-or-later character starting faction. Unlocked when account has a character at level 8 who has completed at least one task from each faction. Full points on everything, any metatasks. `can_always_rejoin=True`. |
| `aged_out` | AgedOutOfUA | **Retired.** No new characters will enter this state. Existing `aged_out` characters can still choose a faction normally. |
| `na` | None | Sentinel for tasks with no faction affiliation. Treated as own-faction. |

### Albescent — second-or-later character flow

- Albescent becomes a choosable faction for new characters when **any character on the account reaches level 8 and has completed at least one task from each faction**. ⚠️ Not yet gated in code.
- When a second-or-later character is created as Albescent, they start in `/Albescent` at level 1 and bypass UA entirely. ⚠️ Not yet implemented.
- At level 3, an Albescent character may optionally choose a selectable faction (same faction-choice flow as any other character). Unlike UA characters, they are **not forced** to leave — staying in Albescent is valid.
- Any character who has previously been in Albescent can always return (`can_always_rejoin=True`), even after defecting.
- `/Albescent` grants: full points (1.0×) on all tasks, access to any-faction metatasks, and same retired/pretired task access as the Ephemerists.

### Metatask access

Metatasks are a task type (see SESSION M). Access is level- and faction-gated:

- Below level 6: cannot see the metatask list. Can see metatasks applied to others' praxes.
- Level 6: can see the metatask list and **propose** new metatasks for any faction (pending admin approval).
- Level 7: can **apply** metatasks from their **own faction** to their praxes.
- /Albescent characters (any level): can apply metatasks from **any faction**.

Metatask bonuses are flat point values, added before faction multipliers. Multiple metatasks stack additively.

---

## Bank cap (task signups)

A character may have at most `era.max_task_signups` (Era 1: 20) in-progress praxes at once, counted across all types. Withdrawn praxes do not count against the cap. Attempting to create a new praxis when at capacity returns a 400 error.

---

## Praxis lifecycle

```
in_progress -> submitted        (all members call /submit)
            -> withdrawn        (creator calls /withdraw; can resubmit)
submitted   -> in_progress      (creator calls /reopen; resets all has_submitted flags)
any state   -> [deleted]        (creator; only if in_progress or withdrawn — not if submitted)
```

- **Moderation status** (set by admin, not players): `visible | flagged | hidden | failed`
- Hidden praxes are excluded from public listings; their scores are excluded from character stats.
- Failed praxes carry an `admin_note` explaining the decision.
- Players can **flag** a praxis (level 4+ required; cannot flag own praxis).

---

## Era reset

Triggered by admin via `POST /admin/eras`. All behaviour is driven by the incoming era's `EraConfig` flags:

```
if reset_score       -> new CharacterStats.score = 0
if reset_level       -> new CharacterStats.level = 0
if reset_faction     -> character.faction_slug = "na" + defection history cleared
if reset_vote_budget -> new CharacterStats.votes_spent_this_era = 0
if reset_all_time_score -> new CharacterStats.all_time_score = 0  (almost always False)
```

Always on reset (not config-driven):
- New `Era` DB row created with `config_key` referencing the new `EraConfig`.
- Old `CharacterStats` rows preserved for historical queries; new rows created per character.
- All active tasks -> retired.
- In-progress praxis memberships carry over (signup level gate grandfathers them in).

---

## Deferred features (v2)

These have schema support or design intent but no live service enforcement:

| Feature | Faction | What's missing |
|---|---|---|
| Task Vision | The Ephemerists | Retired/pretired tasks are not surfaced to the Ephemerists based on the `journeymen_visible` task flag. |
| Double Dipper | Analog | No per-level task-repeat tracking. |
| Lurker vote bank +100 | Singularity | Trigger condition TBD; no vote_bank increment logic. |
| Multi-faction tasks | — | `TaskFaction` junction table was dropped. Only `Task.primary_faction_slug` is live; multi-faction support would require a new design. |

---

## Backend fix list (open items — SESSION R)

Items flagged ⚠️ above, consolidated for engineering:

1. ~~Enforce task signup level gate (`character.level ≥ task.level_required` on praxis creation).~~ — ✅ **done** (`services/praxis.py::_check_create_preconditions`).
2. Remove `task_submit_level_gap` from `EraConfig` and any references.
3. ~~Add `max_collab_participants` to `EraConfig`~~ — **removed**. Era 1 collaborations are unlimited. Do not add this field.
4. ~~Switch duel anti-self-vote from character-level to account-level (same behavior as solo/collab).~~ — ✅ **done** (account-level anti-self-vote per-praxis in `services/vote.py`; opponent-side blocking landed in #309 — a participant cannot rate either side of their duel).
5. ~~Vote budget on-read recomputation: compute `votes_available = vote_budget_base + floor(multiplier × score) − votes_spent_this_era` fresh on every read. Replace stored running counter with stored `votes_spent_this_era` only.~~ — ✅ **done** (`services/scoring.py::compute_votes_available`; stored column is `votes_spent_this_era`).
6. ~~Snide tie rule: opponent gets **own** faction's `duel_loss_modifier`, not Snide's. Update `compute_duel_multiplier`.~~ — ✅ **done** (`services/scoring.py::compute_duel_multiplier`).
7. Second character level gate: raise from 3 → **4**. Gate the Albescent faction choice for new characters behind "account has at least one character at level 8 who has completed at least one task from each faction."
8. Albescent second-character onboarding: when a second-or-later character is created as Albescent, start them in `albescent` at level 1, skip UA assignment.
9. Metatask level privileges: remove any level-4 metatask access; implement level-6 "see list + propose", level-7 "apply own faction", Albescent "apply any faction".
10. Level table display: remove "group welcome letters" from level-2 frontend display (letters flow lives in Faction spec, not level table).
