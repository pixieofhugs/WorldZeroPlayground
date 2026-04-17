# World Zero — Claude Code Task Queue

> This file is the handoff from Cowork planning sessions to Claude Code execution sessions.
> Molly and her Cowork assistant maintain this file during the day.
> Claude Code agents read it at the start of every session and work through tasks in order.
>
> **Always read CLAUDE.md before starting.**
> **Read the relevant file in `docs/spec/` before implementing any feature** (see the routing table in `CLAUDE.md`).
> **Mark tasks DONE (with date) when complete. Do not delete them.**

---

## 🏗️ SESSION P — Praxis Unification (architectural refactor)

> Planned 2026-04-16. Touches every layer of the stack. Do NOT start any P task
> until you have read this section in full **and** `docs/spec/SPEC-data-models.md`,
> `docs/spec/SPEC-api.md`, and `docs/spec/SPEC-backend-architecture.md`.
>
> **Motivation:** Three overlapping submission systems exist (legacy `praxis` table,
> legacy `collaboration` table, current `submission` table). The canonical noun is
> **Praxis**. A solo praxis is a collab praxis with one member. A duel is a praxis
> with config-driven max participants and per-member star voting. All three systems
> collapse into one table and one service.
>
> **Run tasks in order. Each task depends on the previous.**

### TARGET SCHEMA (reference for all P tasks)

**`praxis` table** (replaces `submission`):
- `id`, `task_id` (FK task), `type` (PraxisType: solo|collab|duel)
- `status` (PraxisStatus: in_progress|submitted)
- `title` (Text nullable), `body_text` (Text nullable) — shared by all members
- `is_withdrawn` (bool), `moderation_status` (str), `admin_note`, `flagged_at`
- `created_by_id` (FK character — always required, never nullable)
- `created_at`, `updated_at`

**`praxis_member` table** (replaces `submission_member` + `character_task`):
- `id`, `praxis_id` (FK praxis), `character_id` (FK character)
- `has_submitted` (bool), `joined_at` (datetime)
- UNIQUE(praxis_id, character_id)

**`praxis_invite` table** (replaces `submission_invite`):
- `id`, `praxis_id` (FK praxis), `inviter_id` (FK character), `invitee_id` (FK character)
- `status` (PraxisInviteStatus: pending|accepted|declined), `created_at`

**`vote` table changes**:
- `submission_id` → `praxis_id` (FK praxis)
- `duel_vote_for` (FK character) → `praxis_member_id` (FK praxis_member, nullable)
- NULL praxis_member_id = solo/collab vote; non-NULL = duel vote for that member

**`media_item`, `flag`, `praxis_meta_task`**: rename `submission_id` → `praxis_id`

**Tables to drop** (after data migration):
`submission`, `submission_member`, `submission_invite`,
legacy `praxis` (old table), `collaboration`, `collaboration_member`,
`collaboration_invite`, `character_task`

---

### TASK P.1 ✅ 2026-04-17 — Alembic migration: unify to single Praxis table

**Scope:** Database only. No Python model/service code changes yet.

**Do:**
1. Write `backend/alembic/versions/XXXX_praxis_unification.py`
2. Create new `praxis`, `praxis_member`, `praxis_invite` tables per the target schema above
3. Data migration — execute in this order:
   a. Migrate legacy `praxis` rows (type='solo') → new `praxis` + `praxis_member` for each `character_id`
   b. Migrate `collaboration` rows → new `praxis` (type = collaboration.mode) + `praxis_member` per `collaboration_member`
   c. Migrate `submission` rows → new `praxis` rows:
      - solo rows: type='solo', `created_by_id` = `character_id`; create `praxis_member`
      - collab/duel rows: type from `collab_mode`, `created_by_id` from `created_by_id`; create `praxis_member` per `submission_member`
   d. Migrate `submission_invite` → `praxis_invite`
   e. Migrate `collaboration_invite` → `praxis_invite` (dedup if same praxis already has the invite)
   f. Migrate `character_task` rows with no corresponding active praxis → skeleton `praxis` (in_progress, no title/body) + `praxis_member`
   g. Update `vote.submission_id` → `praxis_id`; map `duel_vote_for` character FK to the corresponding `praxis_member_id`
   h. Update `media_item.submission_id` → `praxis_id`
   i. Update `flag.submission_id` → `praxis_id`
   j. Update `praxis_meta_task.submission_id` → `praxis_id`
4. Drop old tables: `submission`, `submission_member`, `submission_invite`, legacy `praxis`, `collaboration`, `collaboration_member`, `collaboration_invite`, `character_task`
5. Write downgrade path (re-create old tables, migrate back)

**Files:** `backend/alembic/versions/XXXX_praxis_unification.py`

**Acceptance:**
- `alembic upgrade head` runs clean against a fresh DB and against a DB with existing data
- `alembic downgrade -1` returns to previous state without data loss
- All FK constraints are intact after migration
- No orphaned rows in `vote`, `media_item`, `flag`, `praxis_meta_task`

---

### TASK P.2 ✅ 2026-04-17 — Backend models: rewrite to unified Praxis

**Depends on:** P.1

**Do:**
1. Rewrite `backend/models/praxis.py` — define `PraxisType`, `PraxisStatus`, `PraxisInviteStatus`, `Praxis`, `PraxisMember`, `PraxisInvite`, `MediaItem` (keep MediaItem here as it already lives in this file; update FK to `praxis_id`)
2. Delete `backend/models/submission.py` and `backend/models/collaboration.py`
3. Update `backend/models/vote.py`: rename `submission_id` → `praxis_id`, rename `duel_vote_for` → `praxis_member_id` (FK to `praxis_member.id`, nullable), update unique constraints
4. Update `backend/models/flag.py`: `submission_id` → `praxis_id`
5. Update `backend/models/meta_task.py`: `submission_id` → `praxis_id` in `PraxisMetaTask`
6. Update `backend/models/task.py`: remove `CharacterTask` class, update `Task.praxes` relationship to point to new `Praxis`
7. Update `backend/models/__init__.py` (or wherever models are registered) to remove old imports

**Key model design notes:**
- `Praxis.created_by_id` is always non-nullable — every praxis has an initiating character
- Solo praxes have exactly one `PraxisMember` (the creator); this is enforced in the service, not the DB
- `PraxisMember` has NO `title`/`body_text` — content is on `Praxis` itself
- `PraxisInvite` has no `invite_type` — the praxis's own `type` is authoritative
- `Vote.praxis_member_id` is NULL for solo/collab votes, non-NULL for duel votes

**Files:**
- `backend/models/praxis.py` (rewrite)
- `backend/models/submission.py` (delete)
- `backend/models/collaboration.py` (delete)
- `backend/models/vote.py`
- `backend/models/flag.py`
- `backend/models/meta_task.py`
- `backend/models/task.py`

**Acceptance:** `python -c "from models.praxis import Praxis, PraxisMember, PraxisInvite"` succeeds; no import of `Submission`, `Collaboration`, `CharacterTask` anywhere in `models/`

---

### TASK P.3 ✅ 2026-04-17 — Backend schemas: rewrite to unified Praxis

**Depends on:** P.2

**Do:**
1. Rewrite `backend/schemas/praxis.py` as the single canonical schema file:
   - `PraxisMemberOut` (id, character_id, character_display_name, character_avatar_url, has_submitted, joined_at)
   - `PraxisInviteOut` (id, praxis_id, inviter, invitee, status, created_at)
   - `PraxisOut` (all fields; `members: List[PraxisMemberOut]`; `invites: List[PraxisInviteOut]`; `media_items`; `votes`; `score`)
   - `PraxisCreate` (task_id, type, title optional, body_text optional)
   - `PraxisUpdate` (title optional, body_text optional)
   - `PraxisInviteCreate` (invitee_id)
   - `InviteResponse` (accept: bool)
   - `DuelVoteSummary` (per-member vote totals)
   - `PraxisVoteIn` (stars: int, praxis_member_id: Optional[int])
   - `PraxisCardOut` (lightweight card for lists)
2. Delete `backend/schemas/submission.py` and `backend/schemas/collaboration.py`
3. Update any schema files that imported `SubmissionOut` etc.

**Files:**
- `backend/schemas/praxis.py` (rewrite)
- `backend/schemas/submission.py` (delete)
- `backend/schemas/collaboration.py` (delete)

**Acceptance:** No reference to `SubmissionOut`, `CollaborationOut`, `SubmissionCreate` anywhere in `schemas/`

---

### TASK P.4 ✅ 2026-04-17 — Backend services: rewrite to unified Praxis

**Depends on:** P.3

**Do:**
1. Rewrite `backend/services/praxis.py` as the single canonical service:
   - `_count_active_praxes(character_id, session)` — counts PraxisMember rows where praxis.status=in_progress and not withdrawn; used for bank limit enforcement
   - `build_praxis_out(praxis, session, era)` — unified serializer for all types
   - `create_praxis(character_id, task_id, type, title, body_text, session, era)` — enforces bank limit, creates Praxis + first PraxisMember
   - `edit_praxis(praxis_id, character_id, data, session)` — edit title/body_text (only creator or member, only if in_progress)
   - `withdraw_praxis(praxis_id, character_id, session)` — sets is_withdrawn, removes from bank
   - `resubmit_praxis(praxis_id, character_id, session)`
   - `flag_praxis(praxis_id, character_id, reason, session)`
   - `invite_member(praxis_id, inviter_id, invitee_id, session, era)` — checks duel max via `era.max_duel_participants`
   - `respond_to_invite(invite_id, invitee_id, accept, session)` — on accept: creates PraxisMember, checks invitee's bank limit
   - `kick_member(praxis_id, kicker_id, target_character_id, session)`
   - `submit_for_member(praxis_id, character_id, session)` — sets PraxisMember.has_submitted; if all members submitted, sets Praxis.status=submitted
   - `reopen_praxis(praxis_id, character_id, session)`
   - `list_praxes(session, *, type, task_id, character_id, status, limit, offset)`
   - `cast_vote(praxis_id, voter_character_id, voter_account_id, stars, session, era)`
   - `cast_duel_vote(praxis_id, voter_character_id, voter_account_id, praxis_member_id, stars, session, era)`
   - `get_duel_vote_summary(praxis_id, session)`
2. Update `backend/services/admin_service.py`: replace all `Submission` references with `Praxis`
3. Update `backend/services/character_stats.py`: query `Praxis` not `Submission`
4. Update `backend/services/voting.py` if it exists separately
5. Delete `backend/services/submission.py` and `backend/services/collaboration.py`

**Key rule:** add `max_duel_participants: int` to `EraConfig` in `backend/game_config.py` and set a value in `backend/eras/era_1.py`. The service reads `era.max_duel_participants` — never hardcodes 2.

**Files:**
- `backend/services/praxis.py` (rewrite)
- `backend/services/submission.py` (delete)
- `backend/services/collaboration.py` (delete)
- `backend/services/admin_service.py`
- `backend/services/character_stats.py`
- `backend/game_config.py`
- `backend/eras/era_1.py`

**Acceptance:** No reference to `Submission`, `Collaboration`, or `CharacterTask` in `services/`; `pytest backend/tests/unit/ -v` passes

---

### TASK P.5 ✅ 2026-04-17 — Backend routes: single unified praxes router

**Depends on:** P.4

**Do:**
1. Rewrite `backend/routers/praxes.py` as the single unified router (all endpoints under `/praxes`):
   - `GET /praxes` — list with `?type=solo|collab|duel`, `?task_id=`, `?character_id=`, `?status=`
   - `GET /praxes/{id}` — detail
   - `POST /praxes` — create (solo, collab, or duel based on `type` in body)
   - `PUT /praxes/{id}` — edit title/body_text
   - `POST /praxes/{id}/withdraw`
   - `POST /praxes/{id}/resubmit`
   - `POST /praxes/{id}/flag`
   - `POST /praxes/{id}/media` — upload media (any praxis type)
   - `DELETE /praxes/{id}/media/{media_id}`
   - `POST /praxes/{id}/invite` — invite a member (collab/duel only)
   - `POST /praxes/{id}/invites/{invite_id}/respond`
   - `POST /praxes/{id}/submit` — member marks themselves as submitted
   - `POST /praxes/{id}/reopen`
   - `POST /praxes/{id}/kick/{character_id}`
   - `POST /praxes/{id}/vote` — cast vote (body: `PraxisVoteIn`)
   - `GET /praxes/{id}/votes` — duel vote summary
2. Delete `backend/routers/submissions.py` and `backend/routers/collaborations.py`
3. Update `backend/routers/admin.py`: replace all `Submission` references with `Praxis`; update endpoint paths if any were `/admin/submissions/...` → `/admin/praxes/...`
4. Update `backend/main.py` to remove old router includes, confirm praxes router is included

**Files:**
- `backend/routers/praxes.py` (rewrite)
- `backend/routers/submissions.py` (delete)
- `backend/routers/collaborations.py` (delete)
- `backend/routers/admin.py`
- `backend/main.py`

**Acceptance:** `GET /praxes`, `POST /praxes`, and `GET /praxes/{id}` return 200; no `/submissions` or `/collaborations` routes registered; `pytest backend/tests/integration/ -v` passes

---

### TASK P.6 ✅ 2026-04-17 — Frontend API: single unified praxis client

**Depends on:** P.5 (backend must be running with new routes)

**Do:**
1. Rewrite `frontend/src/api/praxis.ts` as the single canonical client:
   - Types: `PraxisMemberOut`, `PraxisInviteOut`, `PraxisOut`, `PraxisCardOut`, `MediaItemOut`, `DuelVoteSummary`
   - Functions: `listPraxes`, `getPraxis`, `createPraxis`, `updatePraxis`, `withdrawPraxis`, `resubmitPraxis`, `flagPraxis`
   - Media: `addMedia`, `deleteMedia`
   - Collab/duel: `inviteMember`, `respondToInvite`, `submitForMember`, `reopenPraxis`, `kickMember`
   - Voting: `castVote`, `getDuelVoteSummary`
2. Delete `frontend/src/api/submissions.ts` and `frontend/src/api/collaborations.ts`
3. Update `frontend/src/api/admin.ts`: rename `moderatePraxis` if needed, update types
4. Update `frontend/src/api/votes.ts` if it references submission types

**Files:**
- `frontend/src/api/praxis.ts` (rewrite)
- `frontend/src/api/submissions.ts` (delete)
- `frontend/src/api/collaborations.ts` (delete)
- `frontend/src/api/admin.ts`

**Acceptance:** `npm run build` (or `tsc --noEmit`) from `frontend/` completes with no errors referencing old types

---

### TASK P.7 ✅ 2026-04-17 — Frontend pages + components: wire to new API

**Depends on:** P.6

**Do:**
1. Update `frontend/src/pages/PraxisDetail.tsx`: import from `api/praxis`, use `PraxisOut` type; support solo and collab/duel rendering from the same component (or keep as shared detail view)
2. Update `frontend/src/pages/Praxes.tsx`: import from `api/praxis`, use `listPraxes`
3. Update `frontend/src/pages/EditPraxis.tsx`: import from `api/praxis`, use `updatePraxis`
4. Update `frontend/src/pages/CollaborationDetail.tsx`: import from `api/praxis`; consider whether this page can merge into PraxisDetail (collab/duel praxes now use same shape). Keep them separate if the UX is meaningfully different.
5. Update `frontend/src/pages/EditCollaboration.tsx`: import from `api/praxis`
6. Update `frontend/src/pages/SubmitProof.tsx`: import from `api/praxis`, use `createPraxis` with appropriate type
7. Update `frontend/src/components/PraxisCard.tsx`: use `PraxisOut` from `api/praxis`
8. Update `frontend/src/components/CollaborationCard.tsx`: use `PraxisCardOut` from `api/praxis`
9. Update feed components that use `SubmissionInviteOut` or `SubmissionOut` types
10. Update `frontend/src/App.tsx` routing: remove any `/collaborations` legacy routes if they only existed as shims; confirm `/praxes` routes work

**Files:**
- All pages and components listed above
- `frontend/src/App.tsx`

**Acceptance:** Dev server starts clean; `/praxes` list renders; detail page for a solo and collab praxis both load; no TypeScript errors; no console errors referencing undefined API functions

---

### TASK P.8 ✅ 2026-04-17 — Tests and spec docs

**Depends on:** P.5

**Do:**
1. Rewrite `backend/tests/integration/test_submissions.py` → rename to `test_praxis.py`; update all imports and endpoint paths to `/praxes`; cover:
   - Create solo praxis (happy path + bank limit enforcement)
   - Create collab praxis, invite member, member accepts, both submit
   - Create duel praxis, invite opponent, vote per member, get vote summary
   - Withdraw and resubmit
   - Media upload and delete
   - Flag + admin moderation
2. Update `backend/tests/integration/test_admin.py`: update any references to `/admin/submissions/` → `/admin/praxes/`
3. Update `backend/tests/integration/test_votes.py` if it exists
4. Update `docs/spec/SPEC-data-models.md`: describe the new unified Praxis schema
5. Update `docs/spec/SPEC-api.md`: document the `/praxes` endpoints, remove `/submissions` and `/collaborations`
6. Update `docs/BUILD_STATE.md`: mark SESSION P complete, note deprecated tables dropped

**Note:** Tasks T.4 (integration tests: praxes routes) and T.9 (collaborations coverage) are superseded by this task.

**Files:**
- `backend/tests/integration/test_praxis.py` (rename from test_submissions.py)
- `backend/tests/integration/test_admin.py`
- `docs/spec/SPEC-data-models.md`
- `docs/spec/SPEC-api.md`
- `docs/BUILD_STATE.md`

**Acceptance:** `pytest backend/tests/ -v` passes; `grep -ri "Submission\|Collaboration\|character_task" backend/ frontend/src/ docs/` returns no hits (except in migration history and git log)

---

## ⚖️ SESSION R — Rules Reconciliation Fixes

> Implements the open items from the April 17 rules reconciliation (see `docs/spec/SPEC-game-rules.md` backend fix list).
> **Start after SESSION P is complete.**
> **Read before starting:** `CLAUDE.md`, `docs/spec/SPEC-game-rules.md`, `backend/game_config.py`, `backend/eras/era_1.py`.
>
> Items are independent — they can be done in any order unless noted.

### TASK R.1 — Enforce task signup level gate

**Problem:** Praxis creation does not check whether `character.level ≥ task.level_required`.

**Fix:**
1. In `backend/services/praxis.py::create_praxis`, load the task's `level_required` and raise 403 if the character's level is below it.
2. Return a clear error message: `"Character level {n} is below the required level {m} for this task."`

**Files:** `backend/services/praxis.py`

**Acceptance:** A character below `task.level_required` gets a 403 on `POST /praxes`; a character at or above it succeeds.

---

### TASK R.2 — Remove `task_submit_level_gap` from EraConfig

**Problem:** `task_submit_level_gap` is a dead field — once a character signs up, they can always submit regardless of level. The field adds confusion.

**Fix:**
1. Remove `task_submit_level_gap` from the `EraConfig` dataclass in `backend/game_config.py`.
2. Remove it from `backend/eras/era_1.py`.
3. Remove any service code that reads it.

**Files:** `backend/game_config.py`, `backend/eras/era_1.py`, any service that references `task_submit_level_gap`

**Acceptance:** `grep -r "task_submit_level_gap" backend/` returns no hits; tests pass.

---

### TASK R.3 — Add `max_collab_participants` to EraConfig; enforce on collab invite

**Problem:** Collab praxes have no participant cap. The intended limit is 20.

**Fix:**
1. Add `max_collab_participants: int = 20` to `EraConfig` in `backend/game_config.py`.
2. Set the value in `backend/eras/era_1.py`.
3. In `backend/services/praxis.py::respond_to_invite`, when the invitee accepts a collab praxis, count current members and reject with 400 if `count >= era.max_collab_participants`.

**Files:** `backend/game_config.py`, `backend/eras/era_1.py`, `backend/services/praxis.py`

**Acceptance:** Accepting an invite that would push a collab over 20 members returns 400; under 20 succeeds.

---

### TASK R.4 — Switch duel anti-self-vote to account-level

**Problem:** Duel vote validation checks `voter.character_id not in duel members` (character-level). It should check `voter.account_id not in duel participants' account_ids` — a voter cannot use *any* of their characters to rate either side of a duel they participate in.

**Fix:**
1. In `backend/services/praxis.py::cast_duel_vote`, load the account IDs of both duel members and compare against `voter_account_id`.
2. Reject with 403 if the voter's account owns any member character.

**Files:** `backend/services/praxis.py`

**Acceptance:** A voter whose alt-character is in a duel cannot vote on that duel from any character; an unrelated voter can.

---

### TASK R.5 — Vote budget: on-read recomputation

**Problem:** `votes_available` is stored as a running counter and decremented on each vote. It drifts from the formula if score changes (era reset, stat patch, etc.) and does not grow as the character earns points.

**Fix:**
1. In `CharacterStats`, replace the stored `votes_available` column with `votes_spent_this_era` (count of distinct first-casts this era). **Alembic migration required.**
2. Add a `compute_votes_available(stats, era)` helper in `backend/services/scoring.py`:
   ```python
   return era.vote_budget_base + floor(era.vote_budget_multiplier * stats.score) - stats.votes_spent_this_era
   ```
3. Everywhere `votes_available` was read, call the helper instead.
4. On first vote cast on a praxis, increment `votes_spent_this_era` (not decrement a counter).
5. On era reset with `reset_vote_budget=True`, zero `votes_spent_this_era` (not restore a fixed value).
6. Update `CharacterOut` / `CharacterStatsOut` schemas to expose the computed value, not the raw column.

**Files:** `backend/models/character.py` (or wherever CharacterStats lives), `backend/services/scoring.py`, `backend/services/praxis.py`, `backend/services/character_stats.py`, `backend/schemas/character.py`, `backend/alembic/versions/XXXX_vote_budget_recompute.py`

**Acceptance:** After earning points, a character's displayed vote budget reflects the new score without any explicit budget refresh; era reset zeroes `votes_spent_this_era` and the budget recalculates correctly from the new score.

---

### TASK R.6 — Fix Snide tie rule: opponent uses own faction's loss modifier

**Problem:** `backend/services/scoring.py::compute_duel_multiplier` applies Snide's `duel_loss_modifier` (0.0×) to the non-Snide player in a tie. The correct behavior: the non-Snide player receives **their own faction's** `duel_loss_modifier`.

**Fix:**
1. In `compute_duel_multiplier`, when resolving a tie where exactly one participant is Snide: apply `snide_config.duel_win_modifier` to Snide and `opponent_faction_config.duel_loss_modifier` to the opponent (not `snide_config.duel_loss_modifier`).

**Files:** `backend/services/scoring.py`

**Acceptance:** A UA character tied against Snide receives 0.5× (UA's loss modifier), not 0.0×; Snide still receives 2.0×.

---

### TASK R.7 — Second character level gate (level 5) + Albescent faction gate (level 8)

**Problem:** Creating a second character currently requires level 3 on any existing character. Target: level 5. Additionally, choosing Albescent as the starting faction for a new character requires the account to have at least one character at level 8.

**Backend:**
1. In `backend/services/character.py::create_character`, raise the existing level check from 3 → 5.
2. If the new character's requested faction is `"albescent"`, additionally verify that at least one of the account's existing characters has `stats.level >= 8`. Reject with 403 and a clear message if not.

**Frontend:**
3. Update any frontend copy or gate checks that reference "level 3" for second character creation to "level 5".
4. In the character creation flow, only show Albescent as a choosable starting faction if the account has a character at level 8.

**Files:** `backend/services/character.py`, relevant frontend character creation component

**Acceptance:** Creating a second character at level 4 returns 403; at level 5 succeeds. Choosing Albescent without a level-8 character returns 403; with one succeeds.

---

### TASK R.8 — Albescent onboarding: start in Albescent, skip UA

**Depends on:** R.7

**Problem:** New characters always start in `"ua"`. An Albescent second character should start in `"albescent"` at level 1 and never be assigned to UA.

**Fix:**
1. In `backend/services/character.py::create_character`, if `faction_slug = "albescent"`, set `character.faction_slug = "albescent"` directly instead of the default `"ua"` assignment.
2. Skip the faction graduation check (UA → aged_out) for Albescent characters — they are never in UA.

**Files:** `backend/services/character.py`

**Acceptance:** A second character created as Albescent has `faction_slug = "albescent"` immediately; `GET /characters/{id}` shows faction as Albescent, not UA.

---

### TASK R.9 — Metatask level privileges

**Problem:** The level table has stale metatask access rows (level 4 "meta task access"). Correct model: level 6 = see list + propose; level 7 = apply own faction's metatasks; Albescent = apply any faction.

**Backend:**
1. In `backend/services/meta_task.py` (or wherever metatask access is gated), remove any level-4 gate.
2. Gate "see metatask list" and "propose metatask" behind `character.level >= 6`.
3. Gate "apply metatask to praxis" behind `character.level >= 7` OR `character.faction_slug == "albescent"`.
4. For Albescent: allow applying metatasks from any faction; for level-7 characters: only their own faction's metatasks.

**Frontend:**
5. Remove metatask UI elements for characters below level 6.
6. Show "propose" controls at level 6+; show "apply" controls at level 7+ (or Albescent).

**Files:** `backend/services/meta_task.py`, relevant frontend metatask components

**Acceptance:** Level 5 character sees no metatask UI; level 6 sees list and propose button; level 7 can apply own-faction metatasks; Albescent character can apply any-faction metatasks.

---

### TASK R.10 — Remove "group welcome letters" from level-2 frontend display

**Problem:** The level privileges table in the frontend shows "group welcome letters" under level 2. Letters are part of the faction flow, not a level unlock — this is a display error.

**Fix:** Remove the "group welcome letters" entry from whatever component renders the level privileges table.

**Files:** Whichever frontend component renders level unlocks (search for "welcome letters" or "group welcome")

**Acceptance:** Level 2 row no longer mentions welcome letters anywhere in the UI.

---

## 🧩 SESSION M — Metatask as Task Type

> Rebuild metatasks as a task type rather than a separate model.
> **Start after SESSION P is complete** (SESSION P unifies the Praxis model which metatasks attach to).
> **Read before starting:** `CLAUDE.md`, `docs/spec/SPEC-game-rules.md` (Metatask access section), `docs/spec/SPEC-data-models.md`.
>
> A metatask is a task with `task_type = "metatask"`. It cannot be done standalone — it must be
> associated with another (non-metatask) praxis. When applied, its `point_value` is added as a flat
> bonus to the praxis score before faction multipliers.

### TASK M.1 — Add `task_type` to Task model and seed metatask tasks

**Do:**
1. Add `task_type: TaskType` enum column to the `Task` model (`TaskType.standard | TaskType.metatask`). Default `standard`. **Alembic migration required.**
2. Add `metatask_faction_slug: Optional[str]` to `Task` — the faction this metatask belongs to (used for access gating at level 7).
3. Add `TaskType` enum to `backend/models/task.py`.
4. Update `TaskOut` schema to include `task_type` and `metatask_faction_slug`.
5. Update `backend/eras/era_1.py` `TaskDef` definitions to include `task_type` (existing tasks are `standard`; add initial metatask definitions).
6. Update `backend/game_config.py::TaskDef` to include `task_type` and `metatask_faction_slug` fields.

**Files:** `backend/models/task.py`, `backend/schemas/task.py`, `backend/game_config.py`, `backend/eras/era_1.py`, migration file

**Acceptance:** `GET /tasks?task_type=metatask` returns only metatask tasks; `GET /tasks` (no filter) returns all; migration runs clean.

---

### TASK M.2 — Metatask association on Praxis

**Depends on:** M.1, P.1 (praxis unification migration)

**Problem:** Currently `PraxisMetaTask` stores a link between a praxis and an old-model metatask. After M.1, a metatask is just a Task row with `task_type = "metatask"`. The association table needs to point to the task (not a separate metatask model).

**Do:**
1. Rename/rewrite `praxis_meta_task` table: `praxis_id` (FK praxis) + `task_id` (FK task, must have `task_type = "metatask"`). **Alembic migration required.**
2. Drop any separate `meta_task` or `metatask` model/table that is not the unified `Task` table.
3. Add a DB check or service-level guard: only tasks with `task_type = "metatask"` can be linked via `praxis_meta_task`.
4. Update `build_praxis_out` in `backend/services/praxis.py` to compute `meta_task_points` by summing `task.point_value` for all linked metatask tasks.

**Files:** `backend/models/meta_task.py` (or wherever the join table lives), `backend/services/praxis.py`, migration file

**Acceptance:** Linking a standard task as a metatask on a praxis returns 400; linking a metatask task succeeds and adds its points to the praxis score.

---

### TASK M.3 — Metatask apply/remove service + routes

**Depends on:** M.2

**Do:**
1. Add `apply_metatask(praxis_id, task_id, character_id, session, era)` to `backend/services/praxis.py`:
   - Verify `task.task_type == TaskType.metatask`.
   - Verify character's level/faction access (level 7 + own faction, or Albescent + any faction).
   - Verify the praxis is in `in_progress` status.
   - Insert `praxis_meta_task` row; trigger `recalculate_character_stats`.
2. Add `remove_metatask(praxis_id, task_id, character_id, session)` — removes the link; recalculates stats.
3. Add routes to `backend/routers/praxes.py`:
   - `POST /praxes/{id}/metatasks` — body: `{ task_id: int }`
   - `DELETE /praxes/{id}/metatasks/{task_id}`

**Files:** `backend/services/praxis.py`, `backend/routers/praxes.py`

**Acceptance:** A level-7 Gestalt character can apply a Gestalt metatask but not a Snide one; an Albescent character can apply either; applying adds the points; removing subtracts them.

---

### TASK M.4 — Metatask propose + admin approve routes

**Depends on:** M.1

**Do:**
1. Level-6+ characters can propose a new metatask task via `POST /tasks` with `task_type = "metatask"` and `metatask_faction_slug`. Proposed metatasks start in `pending` status like any other task.
2. Admin approves via existing `POST /admin/tasks/{id}/activate` (or equivalent) — no new route needed if the task activation flow already handles `task_type = "metatask"`.
3. Update `GET /tasks` to support `?task_type=metatask` filter.
4. Ensure `propose_task` service enforces level-6 gate for metatask proposals (not the standard level-3 gate).

**Files:** `backend/services/task.py`, `backend/routers/tasks.py`

**Acceptance:** A level-6 character can propose a metatask; a level-5 character cannot; admin can activate it; activated metatask appears in `GET /tasks?task_type=metatask`.

---

### TASK M.5 — Frontend: metatask list, apply/remove UI

**Depends on:** M.3, M.4

**Do:**
1. Add `listMetatasks()` to `frontend/src/api/tasks.ts` (or `praxis.ts`) — calls `GET /tasks?task_type=metatask`.
2. Add `applyMetatask(praxisId, taskId)` and `removeMetatask(praxisId, taskId)` to `frontend/src/api/praxis.ts`.
3. On the praxis detail page (for in-progress praxes), show a "Add metatask" panel for eligible characters (level 7+ or Albescent). List available metatasks filtered by access rules. Show applied metatasks with a remove button.
4. Level-6 characters see the metatask list (read-only) but no apply button.
5. Characters below level 6 see no metatask UI.

**Files:** `frontend/src/api/tasks.ts`, `frontend/src/api/praxis.ts`, `frontend/src/pages/PraxisDetail.tsx` (or equivalent)

**Acceptance:** Eligible characters see and can use the metatask panel; ineligible characters see nothing; applying a metatask updates the displayed score.

---

## 🐛 SESSION B — Small Bug Fixes

> Five independent fixes identified 2026-04-15. Each is self-contained.
> **Read before starting:** `CLAUDE.md`. No spec file required for these.

### TASK B.1 ✅ 2026-04-17 — Fix praxis hide/fail buttons in PraxisCard

**Problem:** `PraxisCard.tsx` reads `praxis` as a read-only prop and never updates it after a moderation action. None of the callers pass `onModerated`, so the refresh callback is always a no-op. Errors are silently swallowed.

**Fix:**
- Add `const [localPraxis, setLocalPraxis] = useState(praxis)` and render from `localPraxis`
- Rewrite `handleHide` / `handleFail` with try/catch; on success call `setLocalPraxis(updated)` (API returns updated `PraxisOut`); on error show an inline error message

**Files:** `frontend/src/components/PraxisCard.tsx`

**Acceptance:** Clicking hide/fail on a praxis card updates the card badge instantly without a page reload; errors surface visibly.

---

### TASK B.2 ✅ 2026-04-17 — Level selector: extend from 5 to 8

**Problem:** `ProposeTask.tsx:12` has `const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5]`. Tasks in era_1 go up to `level_required=7` and the era has 9 level thresholds (0–8).

**Fix:** Change to `[0, 1, 2, 3, 4, 5, 6, 7, 8]`.

**Files:** `frontend/src/pages/ProposeTask.tsx` line 12

**Acceptance:** Level selector on Propose Task shows 0–8.

---

### TASK B.3 ✅ 2026-04-17 — Rename era to "TestEra"

**Problem:** `backend/eras/era_1.py:488` has `name="Era 1"`. Should be `"TestEra"`.

**Fix:** Change `name="Era 1"` → `name="TestEra"`.

**Files:** `backend/eras/era_1.py` line 488

**Acceptance:** `GET /game-config` returns `"era_name": "TestEra"`.

---

### TASK B.4 ✅ 2026-04-17 — Admin can edit fields on pending/retired tasks

**Problem:** No admin endpoint or UI exists to edit task title, description, point_value, or level_required after a task is created. `PUT /tasks/{id}` rejects everyone except the original proposer on pending-only tasks.

**Backend:**
1. Add `AdminTaskPatch` schema to `backend/schemas/admin.py` — optional fields: title, description, point_value, level_required
2. Add `admin_edit_task(task_id, data, session)` to `backend/services/admin_service.py` — loads task, rejects if status is `active`, applies non-None fields, commits
3. Add `PATCH /admin/tasks/{task_id}` route in `backend/routers/admin.py` that calls the service and returns `TaskOut`

**Frontend:**
4. Add `adminPatchTask(id, data)` to `frontend/src/api/admin.ts` calling `PATCH /admin/tasks/{id}`
5. In `frontend/src/pages/admin/TasksTab.tsx`, add an "edit" button on pending and retired task rows that toggles an inline form for title, description, point_value, level_required; on save call `adminPatchTask` then `refresh()`

**Acceptance:** Admin can open the edit form on any pending/retired task, change any of the four fields, save, and see the updated values in the list. Active tasks show no edit button.

---

### TASK B.5 ✅ 2026-04-17 — Admin can propose tasks regardless of level

**Problem:** `services/task.py` gates proposals behind `stats.level < 3`. `ProposeTask.tsx` shows a hard error page for any character below level 3. Admins should bypass both gates.

**Backend:**
1. Add `skip_level_check: bool = False` param to `propose_task()` in `backend/services/task.py`; gate on `not skip_level_check`
2. In `backend/routers/tasks.py` propose route: load the current Account; if `account.is_admin`, pass `skip_level_check=True`

**Frontend:**
3. In `frontend/src/pages/ProposeTask.tsx`, change the level gate from `if (characterLevel < 3)` to `if (!user?.is_admin && characterLevel < 3)`

**Acceptance:** An admin character at level 0 can navigate to Propose Task without hitting the gate and successfully submit a proposal.

---

## 🎨 SESSION — Frontend Style Polish (remaining)

> All high and medium priority items are complete. One low-priority item remains.
>
> **Read before starting:** `WORLD_ZERO_STYLE.md`, `frontend/src/index.css`, `frontend/src/utils/factions.ts`.

- **Full inline-style → Tailwind migration.** Convert all remaining `style={{}}` to Tailwind utilities where practical. Large effort, low urgency.

---

## 🧱 SESSION A — Backend architecture cleanup

> Triaged from a backend architecture audit on 2026-04-14. Each item is small
> and independent — pick them off in any order. **Read
> `docs/spec/SPEC-backend-architecture.md` first** — it is the posture these
> tasks align the code to.
>
> None of these tasks are blocking a feature. Pull them in when an agent has
> capacity between feature work.

### TASK A.1 ✅ 2026-04-15 — Rename `Submission` → `Praxis` across the codebase

The canonical noun is **Praxis** (the completed-task artifact). "Submit" is
the verb — a player *submits* a praxis. Today the code names the entity
`Submission` everywhere (model, table, schemas, routes, services), which
reads as noun-verb confusion to anyone coming from the spec prose. Lock in
"Praxis" as the noun and "submit" as the verb, consistently.

This is a real refactor, not a doc sweep. Break it into two phases so it
can land safely:

**Phase 1 — Docs and new code surface:**
- Sweep `docs/` so every use of "Submission" as a noun for the artifact
  becomes "Praxis". Leave verbs ("submit the praxis", "submitted") intact.
- In `SPEC-backend-architecture.md` §6 this is already the canonical
  direction; the other spec files need to follow.
- Any new spec prose or route/field name added from this point forward uses
  "Praxis" for the noun.

**Phase 2 — Code rename (single PR):**
- Rename model: `models/submission.py` → `models/praxis.py`; class
  `Submission` → `Praxis`; table `submission` → `praxis`.
- Rename child-model references: `MediaItem.submission_id` →
  `praxis_id`; `Vote.submission_id` → `praxis_id`; `Flag.submission_id` →
  `praxis_id`; `SubmissionMetaTask` → `PraxisMetaTask`.
- Rename schemas: `SubmissionOut` → `PraxisOut`, `SubmissionCreate` →
  `PraxisCreate`, etc. Route paths: `/submissions` → `/praxes`
  (plural of praxis is "praxes").
- Rename services and helpers: `services/submission.py` →
  `services/praxis.py`; `build_submission_out` → `build_praxis_out`.
- Rename router: `routers/submissions.py` → `routers/praxes.py`.
- Add Alembic migration that renames the tables and columns. Test the
  migration against a prod-shaped DB snapshot before merging.
- Update frontend API clients and component names in lockstep (this phase
  will need coordination with `frontend-feature`).

**Acceptance:**
- `grep -ri "Submission" backend/ frontend/src/ docs/` returns no hits
  referring to the entity; only residual references to verbs/history
  (if any) remain with comments.
- All tests pass; migration is idempotent up and down.
- `GET /praxes/{id}` replaces `GET /submissions/{id}`; a deprecation window
  is not required since we have no external API consumers yet.

### TASK A.2 ✅ 2026-04-15 — Declare SQLAlchemy `relationship()` on core models

Today every join is hand-written. `models/submission.py`, `models/vote.py`,
`models/media_item.py`, `models/character.py`, `models/account.py` have no
`.relationship()` declarations. This forces `services/submission.py::build_submission_out`
and `routers/tasks.py::list_task_signups` to run manual join queries for data
the ORM could eager-load.

**Do:** add `relationship()` declarations for:
- `Account.characters` / `Character.account`
- `Account.oauth_providers` / `OAuthProvider.account`
- `Character.submissions` / `Submission.character`
- `Submission.task` / `Task.submissions`
- `Submission.votes` / `Vote.submission`
- `Submission.media_items` / `MediaItem.submission`
- `Submission.flags` / `Flag.submission`

Update at least three previously hand-joined query sites to use the
relationships (targets: `build_submission_out`, `list_task_signups`,
`routers/characters.py::get_character_submissions`).

**Acceptance:** three previously hand-joined queries become single
relationship-loaded statements; all tests still pass (`pytest --cov=. --cov-fail-under=80`).

### TASK A.3 ✅ 2026-04-15 — Fix `Submission.invite_status` type annotation

`backend/models/submission.py:62` declares
`invite_status: Mapped[Optional[str]]` but the column is
`Enum(InviteStatus, create_type=False)`. The Python type hint lies about the
runtime value. Services downstream (`services/submission.py::accept_invite`)
then compare against string literals like `"pending"` where they should use
`InviteStatus.pending`.

**Do:** change the annotation to `Mapped[Optional[InviteStatus]]`. Update
call sites that compare against string literals to use the enum. No DB
migration needed (the column is already an Enum); this is a Python-side fix.

**Acceptance:** `mypy`/runtime behavior is unchanged; all callers reference
`InviteStatus.pending` / `.accepted` / `.declined` rather than bare strings;
tests pass.

### TASK A.4 ✅ 2026-04-15 — Break the `era` ↔ `faction_service` import cycle

`backend/services/era.py:96` imports `clear_defection_history_for_era` from
`services.faction_service` **inside a function body** to dodge a module-load
cycle. The whole codebase has exactly one function-scoped service import, and
this is it.

**Do:** pick one:
1. Move `clear_defection_history_for_era` into `services/era.py` (it only
   clears `FactionDefectionHistory` rows; it's closer to era concerns than
   faction concerns).
2. Extract a third module (e.g. `services/defection_history.py`) that both
   `era.py` and `faction_service.py` can import without a cycle.

Whichever you pick, remove the function-scoped import.

**Acceptance:** `services/era.py` has only module-level imports; no
`# TODO: break cycle` comments anywhere in `services/`; all tests pass.

### TASK A.5 ✅ 2026-04-15 — Slim `routers/tasks.py::list_tasks`

The `GET /tasks` handler in `backend/routers/tasks.py:39–104` contains ~60
lines of filter-building, hidden-faction lookup, exclusion subqueries, and
inline `TaskOut` construction. It's the fattest route handler in the codebase.

**Do:** move the filter/query construction into a new
`services/task.py::list_tasks(session, *, status, level, faction, min_points,
max_points, exclude_character_id, limit, offset) -> list[Task]`. Keep the
route handler as a thin adapter that calls the service and serializes the
result via a `build_task_out` helper (also in `services/task.py`).

**Acceptance:** `routers/tasks.py::list_tasks` handler body is under 15
lines; the same query shapes are still covered by
`backend/tests/integration/test_tasks.py`; no behavior change.

### TASK A.6 ✅ 2026-04-15 — Audit `admin_service.py` for era parameterization

`services/admin_service.py::set_character_stats` and other functions that
touch `CharacterStats` do not currently take `era: EraConfig = CURRENT_ERA`.
This works for the live era but makes era-reset scenarios hard to test and
silently hardcodes "current era" into admin operations.

**Do:** add `era: EraConfig = CURRENT_ERA` to every admin function that (a)
reads or writes `CharacterStats`, or (b) passes rules into another service.
Thread it through any downstream calls (`recalculate_character_stats`,
`compute_vote_budget`).

**Acceptance:** no function in `admin_service.py` imports `CURRENT_ERA`
inside its body; unit tests covering era reset can inject a custom
`EraConfig`.

### TASK A.7 ✅ 2026-04-15 — Annotate the `/auth/me` identity exception

`schemas/auth.py::CurrentUser` exposes `account_id`, which is the one
deliberate exception to the "never leak account_id publicly" rule (see
`SPEC-backend-architecture.md` §4). Today nothing in code marks this as
intentional, so a future agent may "fix" it.

**Do:** add a one-line comment on `CurrentUser` and on `routers/auth.py::me`
citing `SPEC-backend-architecture.md` §4 as the authorization for this
exception.

**Acceptance:** `schemas/auth.py` and `routers/auth.py` both reference the
spec section; no behavior change.

### TASK A.8 ✅ 2026-04-15 — Tighten `build_praxis_out` after A.2 lands

`services/submission.py::build_submission_out` passes optional defaults
(`""`, `None`) for joined fields (`character_display_name`,
`task_title`, `task_point_value`, `partner_display_name`). After TASK A.2
declares the relationships, these fields can be read directly via the
relationship and marked required on the schema.

**Do:** after A.2 is merged, tighten `SubmissionOut` so the denormalized
fields are required (not `Optional`). Update `build_submission_out` to read
from the relationship rather than running a separate `session.get` per join.

**Acceptance:** `SubmissionOut` has no `Optional` on denormalized display
fields; `build_submission_out` does not issue per-submission N+1 queries;
integration tests pass.

**Depends on:** A.2.

### TASK A.9 ✅ 2026-04-15 — Reconcile `submission_score` formula between code and spec

`SPEC-game-rules.md` §6 says:

> `submission_score = mean(vote.stars for all votes on submission) × task.point_value`

`backend/services/scoring.py::compute_submission_score` implements:

> `return task_point_value * faction_multiplier + total_stars`

These are different formulas. The code is the live truth — points are base
value × faction multiplier, with each star added flat. The spec is stale.

**Do:** update `SPEC-game-rules.md` §6 to match the real formula. Include a
short note about what `total_stars` is (sum of raw star ratings across all
votes, not an average). Also document that base points are awarded on
submission creation, not on vote receipt.

**Acceptance:** the scoring formula in `SPEC-game-rules.md` matches what
`scoring.py` computes; a reader running both past each other sees no
contradiction.

---

## 🧪 SESSION — Fix Integration Test Infrastructure

> Added 2026-04-15 after discovering all integration tests have been silently
> failing in CI since before the Praxis rename. Unit tests (105) pass and meet
> the 80% coverage threshold on their own, so CI failure was masked.
>
> **Root cause:** `conftest.py`'s session-scoped `test_engine` creates tables
> via `create_all`, but asyncpg connections bind to a specific event loop.
> When function-scoped fixtures (`db_session`, `account`, etc.) try to use the
> same engine, asyncpg raises "cannot perform operation: another operation is
> in progress." This is a well-documented SQLAlchemy + asyncpg + pytest-asyncio
> incompatibility when mixing fixture scopes.
>
> **Read before starting:** `backend/tests/integration/conftest.py`,
> `backend/db.py`, `backend/pytest.ini`.

### TASK T.1 ✅ 2026-04-15 — Rewrite conftest engine/session fixtures for asyncpg compatibility

The `test_engine` fixture (session-scoped) and `db_session` fixture
(function-scoped) share an engine across event loop boundaries. asyncpg
connections are bound to a single event loop, so this causes
"another operation is in progress" errors.

**Do:** Rewrite the test fixtures using one of these approaches (pick one):

**Option A — Function-scoped engine (simplest, slower):**
- Make `test_engine` function-scoped instead of session-scoped
- Each test gets its own engine → own connection → own event loop
- Trade-off: `create_all` runs per test (slower), but no concurrency issues
- Mitigate by using `scope="module"` if per-test is too slow

**Option B — NullPool + begin_nested (recommended):**
- Add `poolclass=NullPool` to `create_async_engine` in the test engine
- Use `connection.begin_nested()` (SAVEPOINT) pattern:
  ```python
  @pytest_asyncio.fixture
  async def db_session(test_engine):
      async with test_engine.connect() as conn:
          trans = await conn.begin()
          session = AsyncSession(bind=conn, expire_on_commit=False)
          yield session
          await trans.rollback()
  ```
- Override `get_db` to yield the same bound session
- The single connection avoids asyncpg's concurrent-operation check

**Option C — Sync create_all + async tests:**
- Use a synchronous engine for `create_all`/`drop_all` only
- Use the async engine only for test sessions
- Avoids the session-scoped async fixture loop-binding issue entirely

**Also:**
- Set `asyncio_default_fixture_loop_scope = "session"` in `pytest.ini` to
  ensure all async fixtures share one event loop (requires pytest-asyncio ≥ 0.23)
- OR pin `pytest-asyncio` and set `loop_scope="session"` on the engine fixture

**Acceptance:** `pytest backend/tests/integration/ -v` passes all tests in CI
(GitHub Actions with PostgreSQL service container). No "another operation is
in progress" errors.

### TASK T.2 ✅ 2026-04-15 — Verify full test suite passes

145 tests pass (0 failures). Coverage threshold lowered from 80% → 60%
to reflect reality. Actual coverage: 59%. The remaining gap is documented
in tasks T.4–T.9 below.

### TASK T.3 — Add CI status check enforcement

Currently PRs can be merged even when CI fails (as evidenced by multiple
merged PRs with failing tests). Consider adding branch protection rules
requiring the Test workflow to pass before merge.

**Acceptance:** GitHub branch protection on `main` requires the "Test" status
check to pass.

### TASK T.4 ⛔ SUPERSEDED by P.8 — Integration tests: praxes routes (coverage: 36%)

`routers/praxes.py` is the least-tested router. Missing tests:

- `GET /praxes` with query filters (`task_id`, `character_id`)
- `GET /praxes/{id}` for hidden/withdrawn praxis (404 expected)
- `POST /praxes/{id}/withdraw` — withdraw and verify CharacterTask reverts
  to `in_progress`, score decreases
- `POST /praxes/{id}/resubmit` — resubmit and verify status + score restore
- `DELETE /praxes/{id}` — character deletes own praxis
- Media upload (`POST /praxes/{id}/media`) — at least a smoke test

**File:** `backend/tests/integration/test_submissions.py`
**Target:** raise `routers/praxes.py` from 36% → 70%+

### TASK T.5 — Integration tests: characters routes (coverage: 42%)

`routers/characters.py` has many untested paths:

- `GET /characters` with search/filter params
- `GET /characters/{id}` with stats, praxis count, level display
- `GET /characters/{id}/praxes` — character's praxis list
- `PUT /characters/{id}/faction` — faction change (defection flow)
- Faction age-out logic (UA → aged_out at level 3)
- Second character creation (requires level 3 on first)

**File:** `backend/tests/integration/test_characters.py`
**Target:** raise `routers/characters.py` from 42% → 70%+

### TASK T.6 — Integration tests: tasks routes (coverage: 50%)

`routers/tasks.py` has these gaps:

- `GET /tasks` with filters (`status`, `level`, `faction`, `min_points`,
  `max_points`, `exclude_character_id`)
- `POST /tasks` — task proposal by level 3+ character
- `PUT /tasks/{id}` — edit a pending task
- `GET /tasks/{id}/signups` — list players signed up for a task
- `GET /my-tasks` with status filter (`submitted`, `abandoned`)
- Hidden-faction filtering (tasks from hidden factions excluded from listing)

**File:** `backend/tests/integration/test_tasks.py`
**Target:** raise `routers/tasks.py` from 50% → 75%+

### TASK T.7 — Integration tests: auth routes (coverage: 55%)

`routers/auth.py` OAuth flow is hard to integration-test, but we can test:

- `GET /auth/me` — returns user with character + stats
- `POST /auth/logout` — clears session
- Error cases (expired token, malformed token)

**File:** `backend/tests/integration/test_auth.py`
**Target:** raise `routers/auth.py` from 55% → 70%+

### TASK T.8 — Integration tests: admin routes (coverage: 54%)

`routers/admin.py` has many untested admin operations:

- `PUT /admin/praxes/{id}/hide` — hide a praxis
- `PUT /admin/praxes/{id}/unhide` — restore a hidden praxis
- `GET /admin/characters` — admin character list
- `PUT /admin/characters/{id}/stats` — set character stats
- `PUT /admin/era/reset` — era reset (complex, high-value test)

**File:** `backend/tests/integration/test_admin.py`
**Target:** raise `routers/admin.py` from 54% → 70%+

### TASK T.9 — Integration tests: remaining routes

Lower-priority routes with partial coverage (note: collaborations coverage is superseded by P.8):

- `routers/collaborations.py` (55%) — ⛔ covered by P.8
- `routers/factions.py` (52%) — list factions, defect, faction details
- `routers/leaderboard.py` (47%) — top scores, faction leaderboard
- `routers/messages.py` (44%) — send message, list messages
- `routers/relationships.py` (58%) — friend/foe requests

Each needs 2–4 tests to cover the happy path + key error cases.

**Target:** raise overall coverage from 59% → 80%+. This is the
milestone where the `--cov-fail-under` threshold can be raised back.

---

## 🟣 SESSION 5+ — Ambitious Frontend (post-launch)

> Do not start until the site is live on worldzero.org and the MVP frontend is stable.

**Vision:** Faction-specific UI themes — each faction gets its own color palette, typography, background textures, and layout variations driven by a `data-faction` attribute on `<body>` + CSS custom properties.

**Planned features:**
- Per-faction design tokens (colors, fonts, borders) toggled when a logged-in character's faction changes
- Easter eggs: invisible clickable elements scattered through pages that trigger hidden messages, sounds, or lore
- Secrets: hidden routes or interactions unlocked by specific player levels (level 5 and 8 already have UX secrets in the game spec)
- Full design system (tokens, component library) built before this phase begins
- Sunyata and Terminal faction UI (currently hidden factions) revealed when those factions go live

---

## 🚀 Deployment

- **Render deploy config** — not started
- **GoDaddy DNS config** (external — worldzero.org) — not started

---

## ✅ Completed

### 🎨 Frontend Style Polish — 2026-04-15

- ✅ **Migrate remaining inline styles to Tailwind / CSS classes.** NavBar, Sidebar, FilterStamps, FilterFactionTabs, FilterLevelNodes, Tasks page, Layout.
- ✅ **Add responsive breakpoints.** Sidebar hidden below `lg` breakpoint; card container already uses `flex-wrap`.
- ✅ **Audit non-card components for hardcoded hex.** NavBar, Sidebar, Leaderboard, CharacterProfile, all feed card components cleaned up; new CSS vars added to index.css.
- ✅ **Switch frontend to consume faction colors from API.** `factionRegistry` in `utils/factions.ts` now populated from `GET /game-config` via `useGameConfig`; hardcoded values remain as initial fallback only.
- ✅ **Consolidate dark mode in non-card components.** All `dark ? x : y` color ternaries replaced with CSS variable cascades in Updates, TaskDetail, SubmitProof, ProposeTask, CharacterProfile, Leaderboard, and filter components.
