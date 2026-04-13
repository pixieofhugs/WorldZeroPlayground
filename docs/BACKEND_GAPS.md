# Backend Gaps — Features the Frontend Expects But Backend Doesn't Support Yet

Generated from frontend audit, 2026-04-13.

---

## Critical — Missing Endpoints

| Endpoint needed | Style guide ref | Why | Status |
|----------------|-----------------|-----|--------|
| `GET /submissions/{id}/voters` | §13.2 | Voter tile grid needs individual voter data (character_id, stars, avatar). Currently only VoteSummary (aggregate) is returned. | ✅ Done (2026-04-13) |
| `GET /tasks/{id}/signups` | §15.7 | "Who else is on this task" sidebar panel needs list of characters signed up. | ✅ Done (2026-04-13) |
| `GET /game-config` | — | Level thresholds, max task slots, vote budget formula. Frontend currently hardcodes these. | ✅ Done (2026-04-13) |
| `GET /relationships?status=active` | §17.7 | Pending friend/foe requests panel on Updates page. Relationships router exists but had no filtered query endpoint. | ✅ Done (2026-04-13) — also redesigned to instant declarations |

## Medium — Missing Models / Features

| Feature | Style guide ref | What's needed | Status |
|---------|-----------------|---------------|--------|
| **Collab/Duel mode** | §12.7, §15.4, §17.4 | Submission model needs `collaboration_mode` (solo/collab/duel) and partner character reference. | ✅ Done (2026-04-13) — migration + service validation |
| **Foe taunts** | §17.5 | TauntMessage model for auto-generated taunt strings per faction when foes pass each other in score. | ✅ Done (2026-04-13) — model + templates in game_config |
| **Activity feed** | §17.2–17.4 | No unified feed/activity endpoint. Updates page manually combines submissions + messages. Feed filters (Friends/Foes/Your stuff/Global) need a proper activity stream. | ❌ Deferred |
| **Meta tasks API** | §15.5 | Backend meta_task model exists but no API endpoint to list applicable meta tasks for a given task. | ✅ Done (2026-04-13) — `GET /meta-tasks?task_id=X` |
| **Faction color in API** | — | Colors/names were hardcoded in frontend `utils/factions.ts`. | ✅ Done (2026-04-13) — color field on FactionConfig, returned via `GET /game-config` |

## Low — Hardcoded Values (Work But Fragile)

| Value | Frontend location | Backend source | Status |
|-------|------------------|----------------|--------|
| `LEVEL_THRESHOLDS` | `utils/factions.ts` would be ideal, currently `CharacterProfile.tsx` | `game_config.py` `CURRENT_ERA.level_thresholds` — `(0, 10, 70, 170, 330, 610, 1090, 1840, 3040)` | ✅ Available via `GET /game-config` |
| `MAX_TASK_SLOTS = 20` | `Sidebar.tsx` | `game_config.py` `CURRENT_ERA.max_task_signups` | ✅ Available via `GET /game-config` |
| Faction colors/names | `utils/factions.ts` (consolidated) | Should be on Faction model | ✅ Available via `GET /game-config` |

## Fixed in Previous Session (PR #36)

- [x] Level thresholds updated from `[0, 10, 25, 50, ...]` to match backend `(0, 10, 70, 170, 330, 610, 1090, 1840, 3040)`
- [x] Task status param changed from `'active'` to `'in_progress'` to match `CharacterTaskStatus` enum
- [x] Faction colors/names consolidated into shared `frontend/src/utils/factions.ts`

## Fixed in This Session

- [x] `GET /submissions/{id}/voters` — voter tile grid endpoint
- [x] `GET /tasks/{id}/signups` — task signup list endpoint
- [x] `GET /game-config` — era config with faction colors, level thresholds, etc.
- [x] `GET /relationships` — filtered list with display status computation
- [x] `GET /meta-tasks?task_id=X` — applicable meta tasks per task
- [x] Relationship model redesigned: instant declarations (active|blocked), no pending state
- [x] Submission model: collaboration_mode (solo/collab/duel) + partner_character_id
- [x] TauntMessage model + taunt templates per faction in game_config.py
- [x] FactionConfig.color added to game_config.py (matching frontend values)
- [x] Media persistence diagnostics added to startup logging

## Remaining Gap

- [ ] **Unified activity feed endpoint** — Currently no `GET /activity` or similar. Updates page still needs to manually combine submissions + messages + taunts.
