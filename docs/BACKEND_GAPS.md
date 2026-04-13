# Backend Gaps — Features the Frontend Expects But Backend Doesn't Support Yet

Generated from frontend audit, 2026-04-13.

---

## Critical — Missing Endpoints

| Endpoint needed | Style guide ref | Why |
|----------------|-----------------|-----|
| `GET /submissions/{id}/voters` | §13.2 | Voter tile grid needs individual voter data (character_id, stars, avatar). Currently only VoteSummary (aggregate) is returned. |
| `GET /tasks/{id}/signups` | §15.7 | "Who else is on this task" sidebar panel needs list of characters signed up. |
| `GET /game-config` or `/era/current` | — | Level thresholds, max task slots, vote budget formula. Frontend currently hardcodes these. |
| `GET /relationships?status=pending` | §17.7 | Pending friend/foe requests panel on Updates page. Relationships router exists but has no filtered query endpoint. |

## Medium — Missing Models / Features

| Feature | Style guide ref | What's needed |
|---------|-----------------|---------------|
| **Collab/Duel mode** | §12.7, §15.4, §17.4 | Submission model has no `collaboration_mode` (solo/collab/duel) or partner character reference. Sign-up block, collaboration strip, and duel challenges all depend on this. |
| **Foe taunts** | §17.5 | No TauntMessage model. Updates feed needs auto-generated taunt strings per faction when foes pass each other in score. |
| **Activity feed** | §17.2–17.4 | No unified feed/activity endpoint. Updates page manually combines submissions + messages. Feed filters (Friends/Foes/Your stuff/Global) need a proper activity stream. |
| **Meta tasks API** | §15.5 | Backend meta_task model exists but no API endpoint to list applicable meta tasks for a given task. |
| **Faction color in API** | — | Colors/names are hardcoded in frontend `utils/factions.ts`. Adding a `color` field to the Faction model and returning it from `GET /factions` would eliminate duplication. |

## Low — Hardcoded Values (Work But Fragile)

| Value | Frontend location | Backend source |
|-------|------------------|----------------|
| `LEVEL_THRESHOLDS` | `utils/factions.ts` would be ideal, currently `CharacterProfile.tsx` | `game_config.py` `CURRENT_ERA.level_thresholds` — `(0, 10, 70, 170, 330, 610, 1090, 1840, 3040)` |
| `MAX_TASK_SLOTS = 20` | `Sidebar.tsx` | `game_config.py` `CURRENT_ERA.max_task_signups` |
| Faction colors/names | `utils/factions.ts` (consolidated) | Should be on Faction model |

## Fixed in This Session

- [x] Level thresholds updated from `[0, 10, 25, 50, ...]` to match backend `(0, 10, 70, 170, 330, 610, 1090, 1840, 3040)`
- [x] Task status param changed from `'active'` to `'in_progress'` to match `CharacterTaskStatus` enum
- [x] Faction colors/names consolidated into shared `frontend/src/utils/factions.ts`
