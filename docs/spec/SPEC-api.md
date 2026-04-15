# World Zero — API Endpoints

> Last synced with code: 2026-04-13

## 9. API Endpoints

All routes return JSON. Auth routes set/clear httpOnly JWT cookies.
Snake_case field names throughout. ISO 8601 timestamps.

---

### Auth (`/auth`)
```
GET  /auth/google              → redirect to Google OAuth
GET  /auth/google/callback     → exchange code, create/login account, set JWT cookie
GET  /auth/me                  → CurrentUser { account_id, character?, is_admin }
POST /auth/logout              → clear JWT cookie
POST /auth/dev-login           → dev-only test login (disabled in production)
```

### Characters (`/characters`)
```
GET    /characters                       → list/search (query: search, faction, limit, offset)
GET    /characters/{id}                  → CharacterOut (public profile)
POST   /characters                       → CharacterCreate → CharacterOut (level-gated beyond first)
PUT    /characters/{id}                  → CharacterUpdate → CharacterOut (owner only)
DELETE /characters/{id}                  → soft-delete (owner only)
GET    /characters/{id}/submissions      → list[SubmissionOut] (query: limit, offset)
GET    /characters/{id}/relationships    → list[RelationshipOut]
POST   /characters/{id}/avatar           → multipart file upload → CharacterOut
```

### Tasks (`/tasks`)
```
GET    /tasks                  → list (query: status, level, faction, min_points, max_points, exclude_character_id, limit, offset)
GET    /tasks/my-tasks         → list[CharacterTaskOut] (query: status) — auth required
GET    /tasks/{id}             → TaskOut
GET    /tasks/{id}/signups     → list[TaskSignupOut]
POST   /tasks                  → TaskCreate → TaskOut (level 3+ or admin)
PUT    /tasks/{id}             → TaskCreate → TaskOut (proposer or admin)
POST   /tasks/{id}/signup      → CharacterTaskOut — auth required
DELETE /tasks/{id}/signup      → drop task — auth required
```

### Submissions (`/submissions`)
```
GET    /submissions                        → list (query: sort, task_id, character_id, moderation_status, limit, offset)
GET    /submissions/{id}                   → SubmissionOut
POST   /submissions                        → SubmissionCreate → SubmissionOut — auth required
PUT    /submissions/{id}                   → SubmissionCreate → SubmissionOut (owner only)
POST   /submissions/{id}/withdraw          → SubmissionOut (owner only)
POST   /submissions/{id}/resubmit          → SubmissionOut (owner only)
POST   /submissions/{id}/media             → multipart file + display_order → MediaItemOut (owner only)
DELETE /submissions/{id}/media/{media_id}  → delete media file (owner only)
POST   /submissions/{id}/flag              → SubmissionOut (query: reason) — level 4+ required
```

### Votes (no prefix — paths embed in `/submissions`)
```
POST /submissions/{id}/vote    → VoteIn { stars: 1-5 } → VoteOut — auth required
GET  /submissions/{id}/votes   → VoteSummary { total_votes, average_stars, total_score }
GET  /submissions/{id}/voters  → list[VoterDetail]
```

### Collaborations (`/collaborations`)
```
POST /collaborations                                       → CollaborationCreate { task_id, mode } → CollaborationOut — auth required
GET  /collaborations/{id}                                  → CollaborationOut (members, document, invite list for members)
POST /collaborations/{id}/document                         → { body_text } → CollaborationOut (any member)
POST /collaborations/{id}/invite                           → CollaborationInviteCreate { invitee_character_id } → CollaborationInviteOut (any member)
POST /collaborations/{id}/invites/{invite_id}/respond      → InviteResponse { accept, drop_task_id? } → CollaborationOut (invitee only)
POST /collaborations/{id}/submit                           → CollaborationOut (any member; marks caller as submitted)
POST /collaborations/{id}/edit                             → CollaborationOut (any member; resets all submit states, status → in_progress)
POST /collaborations/{id}/kick/{character_id}              → CollaborationOut (any member; removes target member)
GET  /collaborations/{id}/votes                            → list[DuelVoteSummary] (duel only)
POST /collaborations/{id}/vote                             → CollaborationVoteIn { target_character_id, stars: 1-5 } → VoteOut (duel only; non-members only)
```
*Creating a collaboration requires the character to have the task in-progress.*
*Collaborations require level ≥ 1; duels require level ≥ 2.*
*Task-list-full (20 tasks): respond with drop_task_id to drop a task and accept in one request.*

### Task Drop (`/tasks`)
```
POST /tasks/{id}/drop          → drop an in-progress task to free a slot — auth required
```
*(Alias for DELETE /tasks/{id}/signup; added for the invite-accept task-list-full flow.)*

### Relationships (`/relationships`)
```
GET    /relationships          → list[RelationshipListItem] (query: type, status) — auth required
POST   /relationships          → { to_character_id, type } → RelationshipOut — auth required
PUT    /relationships/{id}     → block relationship → RelationshipOut
DELETE /relationships/{id}     → remove relationship (declaring party only)
```
*Relationships are instant declarations (no pending state). Status: active | blocked.*

### Messages (`/messages`)
```
GET  /messages       → list[MessageOut] — auth required
POST /messages       → MessageCreate { to_character_id, body } → MessageOut
GET  /messages/{id}  → MessageOut (marks as read if recipient)
```

### Leaderboard (`/leaderboard`)
```
GET /leaderboard     → list[CharacterOut] (query: faction, limit, offset) — sorted by score DESC
```

### Factions (`/factions`)
```
GET /factions        → list[FactionOut] (visible factions only)
PUT /factions/{slug} → FactionUpdate → FactionOut — admin only
```

### Game Config (`/game-config`)
```
GET /game-config     → GameConfigOut (era config, faction colors, level thresholds — static from game_config.py)
```

### Meta Tasks (`/meta-tasks`)
```
GET /meta-tasks      → list[MetaTaskOut] (query: task_id — required, filters by task's faction or generic)
```

### Contact (`/contact`)
```
POST /contact        → ContactMessageIn { name, email, message } → ContactMessageOut
```

### Health (`/health`)
```
GET /health          → { "status": "ok" }
```

---

### Admin (`/admin`) — requires admin role

#### Dashboard
```
GET /admin/overview                   → OverviewStats { accounts, characters, active_tasks, submissions, votes, flagged_submissions, suspended_accounts }
```

#### Accounts & Characters
```
GET    /admin/accounts                → list[AccountSummary] (query: email filter)
GET    /admin/accounts/{id}           → AccountDetail (with characters list)
POST   /admin/accounts/{id}/suspend   → SuspendAction { suspended: bool }
POST   /admin/accounts/{id}/role      → RoleAction { role, action: grant|revoke }
GET    /admin/characters              → list[CharacterSummary] (query: faction, status)
POST   /admin/characters              → AdminCharacterCreate → new character for any account
POST   /admin/characters/{id}/ban     → BanAction { banned: bool }
PATCH  /admin/characters/{id}/stats   → CharacterStatsPatch → CharacterStatsOut
POST   /admin/characters/backfill-stats → recalculate all character stats → { recalculated: int }
```

#### Tasks
```
GET  /admin/tasks/pending          → list[PendingTaskOut] (with created_by_name)
PUT  /admin/tasks/{id}/approve     → TaskOut (pending → active)
PUT  /admin/tasks/{id}/retire      → TaskOut (active → retired)
PUT  /admin/tasks/{id}/status      → TaskStatusAction → TaskOut
POST /admin/tasks                  → TaskCreate → TaskOut (admin can create active tasks directly)
POST /admin/tasks/{id}/reactivate  → TaskOut (retired → active)
```

#### Submissions & Moderation
```
GET    /admin/submissions/flagged        → list[SubmissionOut] (full data with media, score, task info)
PATCH  /admin/submissions/{id}/moderate  → ModerationAction { status, admin_note } → SubmissionOut
DELETE /admin/submissions/{id}           → hard delete submission
```

#### Contact Messages
```
GET   /admin/messages               → list[ContactMessageOut] (query: archived)
PATCH /admin/messages/{id}/archive  → ContactMessageOut
```

#### Factions
```
POST /admin/factions               → FactionCreate → FactionOut
```

#### CLI Token
```
POST /admin/cli-token              → CliTokenResponse (header: X-Admin-Cli-Secret)
```

---

## Key Response Schemas

### CharacterOut
```
id, username, display_name, bio, avatar_url, location,
level, score, all_time_score,  ← from CharacterStats join
faction_slug, status, created_at
```

### PraxisOut (solo submissions)
```
id, task_id, character_id, character_display_name, task_title, task_point_value,
title, body_text, moderation_status, is_withdrawn, admin_note,
created_at, updated_at, media: list[MediaItemOut], score
```

### CollaborationOut
```
id, task_id, task_title, task_point_value, mode, status, body_text,
created_by_id, created_at, updated_at,
members: list[CollaborationMemberOut],
invites: list[CollaborationInviteOut]  ← only included for members
```

### CollaborationMemberOut
```
character_id, display_name, faction_slug, has_submitted, joined_at
```

### CollaborationInviteOut
```
id, collaboration_id, inviter_id, inviter_display_name,
invitee_id, invitee_display_name, type, status, created_at
```

### DuelVoteSummary
```
character_id, display_name, total_stars, is_winning
```

### TaskOut
```
id, title, description, point_value, level_required, status,
created_by, primary_faction_slug, is_task_vision_eligible, created_at
```

### VoteSummary
```
submission_id, total_votes, average_stars, total_score
```

### RelationshipListItem (GET /relationships response)
```
id, from_character_id, to_character_id, type, status, created_at,
to_display_name, to_avatar_url, to_faction_slug, reverse_type, display_status
```
