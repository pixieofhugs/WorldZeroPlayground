# World Zero — Data Models

> Last synced with code: 2026-04-16

## 5. Data Models

### Account
```
id
email                -- from OAuth provider, never public
status               -- enum: active | suspended | deleted (AccountStatus)
created_at
updated_at
```

### OAuthProvider
```
id
account_id           -- FK -> Account
provider             -- e.g. "google", "github" (future)
provider_user_id     -- the ID from the OAuth provider
access_token         -- encrypted at rest
created_at
updated_at
```
*This table is what makes adding new OAuth providers a config change, not a schema change.*

### Role
```
id
name                 -- e.g. "admin", "moderator", "trusted_user"; unique
description
created_at
updated_at
```

### AccountRole
```
id
account_id           -- FK -> Account
role_id              -- FK -> Role
granted_at
granted_by           -- FK -> Account (who granted it)
```

### Character
```
id
account_id           -- FK -> Account (private, never exposed in public API responses)
username             -- permanent, unique, public handle
display_name         -- editable
bio                  -- editable, rich text / markdown (default "")
avatar_url           -- editable (default "")
location             -- editable (default "")
faction_slug         -- FK -> Faction.slug, NOT NULL, default "ua" (starting faction)
status               -- enum: active | paused | banned (CharacterStatus)
created_at
updated_at
```
*Score, level, votes_spent_this_era, and all_time_score live in CharacterStats (star schema split).*
*Faction graduation (level >= 3 to pick a real faction) is enforced at API layer, not DB.*

### CharacterStats
```
id
character_id         -- FK -> Character
era_id               -- FK -> Era
score                -- sum of non-flagged praxis scores for this era (default 0)
all_time_score       -- cumulative, never resets (default 0)
level                -- integer 0-8; derived from score (default 0)
votes_spent_this_era -- monotonic count of first-cast votes this era (default 0)
                       spendable `votes_available` is computed on read from
                       era.vote_budget_base + floor(era.vote_budget_multiplier * score)
                       - votes_spent_this_era (see services.scoring.compute_votes_available).
updated_at
CONSTRAINT: unique(character_id, era_id)
```
*One row per (character, era) pair. Era resets insert new rows; old rows are preserved
for historical queries. Character is a pure dimension table; all volatile game state
lives here.*

### Faction
```
slug                 -- PK, matches FactionConfig.slug in game_config.py
name
description          -- default ""
status               -- enum: visible | hidden | deprecated (FactionStatus)
created_at
updated_at
```
*No multiplier columns: faction rules live in game_config.py, not the DB.
This table exists for FK references and UI display only.*

### Task
```
id
title
description          -- rich text / markdown (default "")
point_value          -- base point value
level_required       -- players must be >= this level to create a praxis (default 0)
status               -- enum: pending | active | retired (TaskStatus)
created_by           -- FK -> Character (admin character)
primary_faction_slug -- FK -> Faction.slug, default "na" (cross-faction sentinel)
is_task_vision_eligible -- bool; Journeymen can see these when pretired/retired
created_at
updated_at
```

### TaskFaction (join table -- future multi-faction support)
```
task_id              -- PK, FK -> Task
faction_slug         -- PK, FK -> Faction.slug
is_primary
```

### Praxis
The canonical work-submission aggregate. Replaces the former Submission + Collaboration tables.
All three praxis types (solo, collab, duel) share this table.

```
id
task_id              -- FK -> Task (NOT NULL)
type                 -- enum: solo | collab | duel (PraxisType)
status               -- enum: in_progress | submitted (PraxisStatus); default in_progress
title                -- nullable text
body_text            -- nullable text; rich text / markdown proof
is_withdrawn         -- bool, default false
moderation_status    -- string (visible | flagged | hidden | failed); default "visible"
admin_note           -- nullable text (set by admin on failed/hidden)
flagged_at           -- nullable; NULL means "not yet flagged"
created_by_id        -- FK -> Character (the player who initiated)
created_at
updated_at
```
*Score is computed on-the-fly from votes; not stored.*
*Bank cap: at most `EraConfig.max_task_signups` in-progress praxes per character (enforced at service layer).*

### PraxisMember
```
id
praxis_id            -- FK -> Praxis
character_id         -- FK -> Character
has_submitted        -- bool; whether this member pressed Submit (resets on kick/reopen)
joined_at
CONSTRAINT: unique(praxis_id, character_id)
```

### PraxisInvite
```
id
praxis_id            -- FK -> Praxis
inviter_id           -- FK -> Character
invitee_id           -- FK -> Character
status               -- enum: pending | accepted | declined (PraxisInviteStatus)
created_at
```
*Only one pending invite per (praxis_id, inviter_id, invitee_id) is allowed — enforced at service layer.*

### MediaItem
```
id
praxis_id            -- FK -> Praxis
type                 -- enum: image | video | audio (MediaType)
file_path            -- relative path (structured for S3 swap in v2)
display_order        -- default 0
created_at
```

### Vote
```
id
praxis_id            -- FK -> Praxis (NOT NULL)
praxis_member_id     -- FK -> PraxisMember (nullable; required for duel votes only)
voter_character_id   -- FK -> Character
voter_account_id     -- FK -> Account (denormalized for anti-self-vote check)
stars                -- integer 1-5
created_at
updated_at           -- votes can be updated; update costs 0 additional budget
CONSTRAINT: unique(praxis_id, voter_character_id)                        -- solo/collab votes
CONSTRAINT: unique(praxis_id, voter_character_id, praxis_member_id)      -- duel votes
```
*For duel votes, praxis_member_id is required.*
*Anti-self-vote: duel members cannot vote on their own praxis; solo/collab uses account-level check.*

### Flag
```
id
praxis_id            -- FK -> Praxis
flagged_by           -- FK -> Character
reason               -- text (default "")
created_at
```

### Relationship
```
id
from_character_id    -- FK -> Character
to_character_id      -- FK -> Character
type                 -- enum: friend | foe (RelationshipType)
status               -- enum: active | blocked (RelationshipStatus)
created_at
updated_at
CONSTRAINT: unique(from_character_id, to_character_id)
```
*Relationships are instant declarations -- no pending state. Mutual friend + mutual foe = Rival
(one per character). Foe is opt-in by both parties.*

### Message
```
id
from_character_id    -- FK -> Character
to_character_id      -- FK -> Character
body
read_at              -- nullable; NULL = unread
created_at
```

### TauntMessage
```
id
from_character_id    -- FK -> Character
to_character_id      -- FK -> Character
message              -- text
trigger_type         -- enum: score_overtake | level_up | praxis_complete (TauntTriggerType)
created_at
```
*Auto-generated messages between foes triggered by game events. Templates live in game_config.py.*

### Era
```
id
name                 -- human label for the era
config_key           -- references EraConfig.config_key in game_config.py
started_at
started_by           -- FK -> Account
notes                -- default ""
updated_at
```

### MetaTask
```
id
name
description
faction_slug         -- FK -> Faction (group-specific)
bonus_type           -- enum: flat | percentage (BonusType)
bonus_value          -- float
level_required       -- default 0
created_at
updated_at
```

### PraxisMetaTask
```
praxis_id            -- PK, FK -> Praxis
meta_task_id         -- PK, FK -> MetaTask
applied_at
```

### ContactMessage
```
id
name                 -- String(100)
email                -- String(254)
message              -- text
is_archived          -- bool, default false
created_at
```
*Public contact form capture. Not part of the game system.*

---

## Enum Summary

| Enum | Values | Used By |
|------|--------|---------|
| AccountStatus | active, suspended, deleted | Account.status |
| CharacterStatus | active, paused, banned | Character.status |
| FactionStatus | visible, hidden, deprecated | Faction.status |
| TaskStatus | pending, active, retired | Task.status |
| PraxisType | solo, collab, duel | Praxis.type |
| PraxisStatus | in_progress, submitted | Praxis.status |
| PraxisInviteStatus | pending, accepted, declined | PraxisInvite.status |
| MediaType | image, video, audio | MediaItem.type |
| ModerationStatus | visible, flagged, hidden, failed | Praxis.moderation_status |
| RelationshipType | friend, foe | Relationship.type |
| RelationshipStatus | active, blocked | Relationship.status |
| BonusType | flat, percentage | MetaTask.bonus_type |
| TauntTriggerType | score_overtake, level_up, praxis_complete | TauntMessage.trigger_type |
