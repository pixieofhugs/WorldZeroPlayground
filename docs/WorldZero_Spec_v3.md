# World Zero — Project Spec v3
**A modern, mobile-friendly rebuild of sf0.org**
*Built with FastAPI + React | Not for profit | Rebuilt with permission*

> This document supersedes WorldZero_Spec_v2.md. Changes in v3: Era-as-ruleset config architecture, game_config.py design, testing strategy (pytest + coverage + GitHub Actions CI), deployment architecture.

---

## 1. Project Overview

A community game where players create characters, complete real-world tasks, post proof of completion (text, images, video, audio), and earn points through community voting. Inspired by the original SF0 / SFZero alternate reality game.

The soul of the original — creativity, exploration, weirdness, and the artistry of the proof post — must survive in this version.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Backend | FastAPI (Python) | Async-native, automatic API docs, Pydantic validation |
| Frontend | React | Mobile-first, media-rich social UIs |
| Database | PostgreSQL | Relational, handles voting/points/roles well |
| Auth | Google OAuth2 (via Authlib) | Frictionless now; designed to add providers later |
| Media Storage | Local filesystem (v1) | Simple to start; structured for S3/Cloudinary swap |
| ORM | SQLAlchemy (async) + Alembic | Async ORM with migration support |
| Testing | pytest + pytest-cov + GitHub Actions | Unit + integration coverage, enforced on every push |

### Auth Design Note
Google OAuth is the only provider in v1, but the auth layer must be implemented in a provider-agnostic way (OAuth2 abstraction, not Google-specific code). Adding GitHub, email/password, etc. later should require no schema changes — only a new OAuth handler and an additional row in `oauth_providers`.

---

## 3. Identity Model — Account vs. Character

This is the most important architectural distinction in the project.

### Two-layer identity

**Account** — private, secure, never shown publicly.
- Tied to Google (or future OAuth provider)
- Holds login credentials and email
- The anti-abuse anchor: all game actions trace back to an account for enforcement purposes

**Character** — the public in-game persona.
- Has a username (permanent, unique), display name (editable), bio, avatar, level, score, faction
- Multiple characters can belong to one account (subject to level gating — see Section 7)
- Everything game-facing (submissions, votes, tasks, friendships, DMs) is tied to a Character, not an Account
- A character's Google identity is never exposed publicly

### Sock Puppet / Anti-Self-Voting Rule
Since one account can own multiple characters, vote fraud prevention must operate at the **account level**, not the character level. When a vote is cast, the system checks that the voter's `account_id` ≠ the submission author's `account_id`. This check is invisible to players but enforced at the API layer on every vote.

---

## 4. Era-as-Ruleset: Config Architecture

**The core insight:** Eras are not just resets — they are rule sets. Each Era defines the game mechanics that apply while it is active. Switching eras can mean different vote budgets, different task limits, different point structures. The config is the game design tool.

### Design Principles

- `game_config.py` is the **single source of truth** for all game rules
- The database stores **history** (when eras started, who started them) but never owns the rules
- All services accept an `EraConfig` parameter, defaulting to `CURRENT_ERA`
- Tests import specific `EraConfig` instances directly — no DB required for logic tests
- Changing `CURRENT_ERA = ERA_2` is the one lever that switches the live game's mechanics

### game_config.py Structure

```python
from dataclasses import dataclass, field

@dataclass(frozen=True)
class FactionConfig:
    slug: str
    name: str
    description: str
    point_multiplier: float          # applied to all task earnings
    duel_bonus_multiplier: float     # extra % on duel wins (0.0 if not applicable)
    is_selectable: bool              # can players choose this faction at level 3?
    own_faction_multiplier: float    # some factions get a bonus on in-faction tasks
    other_faction_multiplier: float  # and a penalty on out-of-faction tasks


@dataclass(frozen=True)
class EraConfig:
    name: str
    config_key: str                  # matched to Era.config_key in DB for historical record

    # Task rules
    max_task_signups: int            # max active CharacterTask rows per character
    task_submit_level_gap: int       # how many levels above your own you can submit praxis

    # Vote budget: available = base + (multiplier × score)
    vote_budget_base: int
    vote_budget_multiplier: float

    # Level thresholds — index = level number, value = points required to reach it
    # level_thresholds[0] = 0 (everyone starts at level 0)
    # level_thresholds[1] = 10 (reach level 1 at 10 points), etc.
    level_thresholds: tuple[int, ...]

    # Era reset behaviour — what happens to characters when a new era begins
    reset_score: bool
    reset_level: bool
    reset_faction: bool
    reset_vote_budget: bool
    reset_all_time_score: bool       # almost always False

    # Faction configs, keyed by slug
    factions: dict[str, FactionConfig]


# ── Faction definitions for Era 1 ──────────────────────────────────────────

ERA_1_FACTIONS = {
    "ua": FactionConfig(
        slug="ua",
        name="UA",
        description="The default starting faction. Full points on all tasks. Must leave at level 3.",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,          # assigned automatically; not a choosable destination
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "ua_masters": FactionConfig(
        slug="ua_masters",
        name="UA Masters",
        description="Veterans who aged out of UA. Can sign up for any task at reduced points.",
        point_multiplier=0.8,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=0.8,
        other_faction_multiplier=0.8,
    ),
    "snide": FactionConfig(
        slug="snide",
        name="Snide",
        description="Specialists in one-on-one competition. Bonus points for winning duels.",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.1,    # +10% on duel wins
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "gestalt": FactionConfig(
        slug="gestalt",
        name="Gestalt",
        description="Collective-minded. Excel at their own faction's tasks; reduced elsewhere.",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.1,   # +10% on own-faction tasks
        other_faction_multiplier=0.7, # -30% on other-faction tasks
    ),
    "journeymen": FactionConfig(
        slug="journeymen",
        name="Journeymen",
        description="Explorers with access to select retired tasks (Task Vision ability).",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "analog": FactionConfig(
        slug="analog",
        name="Analog",
        description="Depth over breadth. Can repeat one task per level for points (Double Dipper).",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "singularity": FactionConfig(
        slug="singularity",
        name="Singularity",
        description="TBD",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=True,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "albescent": FactionConfig(
        slug="albescent",
        name="/Albescent",
        description="Full points and any meta tasks from any group. Unlock-only.",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,          # only available as additional character unlock
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
    "aged_out": FactionConfig(
        slug="aged_out",
        name="AgedOutOfUA",
        description="Placeholder faction for characters who hit level 3 while offline.",
        point_multiplier=1.0,
        duel_bonus_multiplier=0.0,
        is_selectable=False,
        own_faction_multiplier=1.0,
        other_faction_multiplier=1.0,
    ),
}


# ── Era definitions ─────────────────────────────────────────────────────────

ERA_1 = EraConfig(
    name="Era 1",
    config_key="era_1",
    max_task_signups=20,
    task_submit_level_gap=2,
    vote_budget_base=100,
    vote_budget_multiplier=2.0,
    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),
    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_1_FACTIONS,
)

# Future era example — different mechanics, same structure
# ERA_2 = EraConfig(
#     name="Foo Era",
#     config_key="era_2",
#     max_task_signups=3,
#     vote_budget_base=20,
#     vote_budget_multiplier=3.0,
#     ...
# )

# ── The one lever that controls live game mechanics ──────────────────────────
CURRENT_ERA: EraConfig = ERA_1
```

### How Services Consume Config

Every service function that implements a game rule accepts `era: EraConfig` as a parameter, defaulting to `CURRENT_ERA`. This makes them independently testable against any era without a running database.

```python
# services/scoring.py
from game_config import CURRENT_ERA, EraConfig

def compute_vote_budget(score: int, era: EraConfig = CURRENT_ERA) -> int:
    return era.vote_budget_base + int(era.vote_budget_multiplier * score)

def compute_level(score: int, era: EraConfig = CURRENT_ERA) -> int:
    for level, threshold in reversed(list(enumerate(era.level_thresholds))):
        if score >= threshold:
            return level
    return 0

def compute_submission_score(avg_stars: float, task_point_value: int) -> float:
    return avg_stars * task_point_value
```

### DB ↔ Config Link

The `Era` DB table stores `config_key` (e.g. `"era_1"`), which maps to the `EraConfig.config_key` in `game_config.py`. This creates a historical record of which ruleset was active during each era without the DB owning the rules themselves.

```
Era (DB table)
  id
  name             -- human-readable, from admin input
  config_key       -- matches EraConfig.config_key (e.g. "era_1")
  started_at
  started_by       -- FK → Account
  notes
```

---

## 5. Data Models

### Account
```
id
email                -- from OAuth provider, never public
created_at
is_active            -- for soft bans
```

### OAuthProvider
```
id
account_id           -- FK → Account
provider             -- e.g. "google", "github" (future)
provider_user_id     -- the ID from the OAuth provider
access_token         -- encrypted at rest
created_at
```
*This table is what makes adding new OAuth providers a config change, not a schema change.*

### Role
```
id
name                 -- e.g. "admin", "moderator", "trusted_user"
description
```

### AccountRole
```
id
account_id           -- FK → Account
role_id              -- FK → Role
granted_at
granted_by           -- FK → Account (who granted it)
```

### Character
```
id
account_id           -- FK → Account (private, never exposed in public API responses)
username             -- permanent, unique, public handle
display_name         -- editable
bio                  -- editable, rich text / markdown
avatar_url           -- editable
location             -- optional, editable
level                -- integer 0–8; derived from score, stored for query performance
score                -- sum of non-flagged submission scores for current era
all_time_score       -- cumulative, never resets
votes_available      -- spendable budget; formula and reset behaviour from EraConfig
faction_slug         -- FK → Faction.slug (nullable until level 3)
created_at
is_active            -- soft delete / ban flag
```

### Faction
```
slug                 -- PK, matches FactionConfig.slug in game_config.py
name
description
-- No multiplier columns: faction rules live in game_config.py, not the DB
-- This table exists for FK references and UI display only
```

### Task
```
id
title
description          -- rich text / markdown, can embed images and video
point_value          -- base point value
level_required       -- players must be >= this level to sign up
status               -- enum: pending | active | retired
created_by           -- FK → Character (admin character)
primary_faction_slug -- FK → Faction.slug
is_task_vision_eligible -- bool; Journeymen can sign up for these when pretired/retired
created_at
```

### TaskFaction (join table — future multi-faction support)
```
task_id
faction_slug
is_primary
```

### CharacterTask
```
id
character_id         -- FK → Character
task_id              -- FK → Task
signed_up_at
status               -- enum: in_progress | submitted | abandoned
```
*Active rows capped at `EraConfig.max_task_signups` per character, enforced at API layer.*

### Submission (aka "Praxis")
```
id
task_id              -- FK → Task
character_id         -- FK → Character
title
body_text            -- rich text / markdown
is_flagged           -- bool, default false
flagged_at
created_at
updated_at
```
*Score is computed on-the-fly from votes; not stored in v1.*

### MediaItem
```
id
submission_id        -- FK → Submission
type                 -- enum: image | video | audio
file_path            -- relative path (structured for S3 swap in v2)
display_order
created_at
```

### Vote
```
id
submission_id        -- FK → Submission
voter_character_id   -- FK → Character
voter_account_id     -- FK → Account (denormalized for anti-self-vote check)
stars                -- integer 1–5
duel_vote_for        -- FK → Character (nullable; Duels only)
created_at
updated_at           -- votes can be updated; update costs 0 additional budget
CONSTRAINT: unique(submission_id, voter_character_id)
```

### Flag
```
id
submission_id        -- FK → Submission
flagged_by           -- FK → Character
reason               -- optional text
created_at
```

### Relationship
```
id
from_character_id    -- FK → Character
to_character_id      -- FK → Character
type                 -- enum: friend | foe
status               -- enum: pending | accepted | blocked
created_at
CONSTRAINT: unique(from_character_id, to_character_id)
```
*Mutual friend + mutual foe = Rival (one per character). Foe is opt-in by both parties.*

### Message
```
id
from_character_id    -- FK → Character
to_character_id      -- FK → Character
body
read_at
created_at
```

### Era
```
id
name                 -- human label for the era
config_key           -- references EraConfig.config_key in game_config.py
started_at
started_by           -- FK → Account
notes
```

### MetaTask
```
id
name
description
faction_slug         -- FK → Faction (group-specific)
bonus_type           -- enum: flat | percentage
bonus_value
level_required
created_at
```

### SubmissionMetaTask
```
submission_id
meta_task_id
applied_at
```

---

## 6. Scoring & Vote Budget

All formulas are driven by `CURRENT_ERA` (or a passed `EraConfig` in tests).

### Submission Score (computed on-the-fly)
```
submission_score = mean(vote.stars for all votes on submission) × task.point_value
```

### Character Score
```
character.score = sum(submission_score for all non-flagged submissions this era)
```

### All-Time Score
Increments with every point gain, never decremented (including on Era reset).

### Vote Budget
```
votes_available = era.vote_budget_base + floor(era.vote_budget_multiplier × character.score)
```
- First cast of a vote costs 1 from `votes_available`
- Updating an existing vote (changing star value) costs nothing additional
- A character with `votes_available == 0` cannot cast new votes
- On Era reset: `votes_available` recalculated from new (reset) score per era config

### Level Computation
```
character.level = highest index i where character.score >= era.level_thresholds[i]
```
Level is stored on Character for query performance and updated synchronously on every score change that crosses a threshold.

---

## 7. Level Privileges

| Level | Points (Era 1) | Unlocks |
|---|---|---|
| 0 | 0 | Browse tasks |
| 1 | 10 | Sign up for tasks; collaboration |
| 2 | 70 | See pretired tasks; group welcome letters; Duels; group pages |
| 3 | 170 | Choose faction; submit task proposals; create second character |
| 4 | 330 | Meta task unlock (varies by faction); flagging |
| 5 | 610 | Vote for level 0 tasks to be promoted; new UX secrets |
| 6 | 1090 | Meta task unlock (varies by faction) |
| 7 | 1840 | Meta task: do any task "as if" from own faction for full points |
| 8 | 3040 | New UX secrets; special trigger if player has one of each task completed |

Point thresholds come from `era.level_thresholds` — they can differ across eras.

---

## 8. Factions

All faction rules (multipliers, selectability) live in `game_config.py` under each `EraConfig`. The DB `Faction` table exists only for FK references and display. See Section 4 for the full `FactionConfig` definitions.

Characters start in **UA**. At level 3 they must choose a permanent faction (excluding Albescent and special-assignment factions). Characters who hit level 3 while offline are moved to **AgedOutOfUA** and prompted to choose on next login.

---

## 9. API Endpoints

### Auth
```
GET  /auth/google              → redirect to Google OAuth
GET  /auth/google/callback     → exchange code, create/login account, return JWT
GET  /auth/me                  → return current account + active character
POST /auth/logout
```

### Characters
```
GET    /characters             → list/search all characters (public)
GET    /characters/{id}        → public character profile
POST   /characters             → create character (level-gated beyond first)
PUT    /characters/{id}        → edit own character
DELETE /characters/{id}        → soft-delete own character
GET    /characters/{id}/submissions
GET    /characters/{id}/relationships
```

### Tasks
```
GET    /tasks                  → paginated list (filter: status, level, faction, points, date)
GET    /tasks/{id}             → task detail + submissions
POST   /tasks                  → propose task (level 3+) or create active task (admin)
PUT    /tasks/{id}             → edit (admin for active; proposer for pending)
POST   /tasks/{id}/signup      → sign up for task
DELETE /tasks/{id}/signup      → drop task
```

### Submissions (Praxis)
```
GET    /submissions            → feed (paginated; recent | top-rated)
GET    /submissions/{id}       → submission detail
POST   /submissions            → create submission
PUT    /submissions/{id}       → edit own submission
POST   /submissions/{id}/media → upload media file(s)
POST   /submissions/{id}/flag  → flag (level 4+)
GET    /submissions/{id}/collaborators
POST   /submissions/{id}/collaborators → add collaborator
```

### Votes
```
POST /submissions/{id}/vote    → cast or update vote
GET  /submissions/{id}/votes   → vote summary
```

### Relationships
```
POST   /relationships          → send friend or foe request
PUT    /relationships/{id}     → accept / decline
DELETE /relationships/{id}     → remove
```

### Messages
```
GET  /messages                 → inbox
POST /messages                 → send DM
GET  /messages/{id}            → read message (marks read)
```

### Admin
```
GET    /admin/tasks/pending         → pending task queue
PUT    /admin/tasks/{id}/approve    → approve → active
PUT    /admin/tasks/{id}/retire     → retire active task
DELETE /admin/submissions/{id}      → delete flagged submission
POST   /admin/characters/{id}/ban   → ban/unban character
POST   /admin/meta-tasks            → create meta task
POST   /admin/eras                  → start Era reset (requires confirmation payload)
```

### Account (private)
```
GET    /account                → current account info
DELETE /account                → delete account + all characters
```

### Leaderboard
```
GET /leaderboard               → top characters by score, paginated
```

---

## 10. Frontend Pages

### Navigation — Top
1. Home (`/`) — About if logged out; activity feed if logged in
2. Updates (`/updates`) — Recent activity, friend/foe feed, votes on your submissions
3. Tasks (`/tasks`) — Browse, filter, sign up
4. Groups (`/groups`) — Faction pages
5. Players (`/players`) — Character directory
6. Praxis (`/submissions`) — Global submission feed
7. Login / Profile (state-dependent)

### Navigation — Bottom
About, Contact, Disclaimer, Attributions, Donate

### Pages (MVP)

**Home (`/`)** — Activity feed when logged in. About content when logged out.

**Task Feed (`/tasks`)** — Card grid. Filters: status, date, faction, level, points, completions, rating.

**Task Detail (`/tasks/:id`)** — Full description, praxis sorted by score, "Submit Proof" CTA.

**Task Edit/Add** — Rich text editor with preview.

**Submission Detail (`/submissions/:id`)** — Full proof post, media gallery, star rating widget, collaborators, flag button (level 4+).

**Submit Proof (`/tasks/:id/submit`)** — Auth-gated. Title, rich body, media upload, preview.

**Character Profile (`/characters/:id`)** — Avatar, display name, bio, level, faction, score, all-time score, submission grid, relationship controls.

**Leaderboard (`/leaderboard`)** — Ranked by score, paginated.

**Groups (`/groups`)** — Faction list before joining; own faction featured after.

**Updates (`/updates`)** — Reverse chronological activity. Foe-specific taunts included (catch up / watch your back).

**Admin (`/admin`)** — Task approval queue, flagged submissions, character management, meta task creation, Era reset with confirmation dialog.

---

## 11. Era Reset

Triggered by admin via `POST /admin/eras`. Requires a confirmation payload to prevent accidental triggers.

Reset behaviour is entirely driven by the incoming era's `EraConfig` flags:

```
if new_era_config.reset_score       → character.score = 0
if new_era_config.reset_level       → character.level = 0
if new_era_config.reset_faction     → character.faction_slug = "aged_out"
if new_era_config.reset_vote_budget → character.votes_available = new_era_config.vote_budget_base
if new_era_config.reset_all_time_score → character.all_time_score = 0  (almost never true)
```

Always on reset (not config-driven):
- New `Era` record created in DB with `config_key` referencing the new `EraConfig`
- All active tasks → retired
- In-progress CharacterTask rows carry over; characters can submit at no penalty

---

## 12. Testing Strategy

### Philosophy
- Game logic lives in `services/` and is pure (accepts `EraConfig`, returns a value)
- Unit tests require no DB or running server — just import `game_config` and `services`
- Integration tests spin up a test DB (via `pytest` fixtures + SQLAlchemy)
- CI runs the full suite on every push and blocks merge on failure

### Test Structure
```
/backend/tests/
├── unit/
│   ├── test_scoring.py         # compute_submission_score, compute_vote_budget, compute_level
│   ├── test_era_config.py      # validates ERA_1, ERA_FOO etc. are internally consistent
│   ├── test_level_thresholds.py # level breakpoints fire at correct scores
│   └── test_era_reset.py       # reset logic applied correctly per EraConfig flags
├── integration/
│   ├── test_auth.py            # OAuth flow, JWT creation, /auth/me
│   ├── test_characters.py      # create, level gate, anti-self-vote
│   ├── test_tasks.py           # signup, max cap, level gate
│   ├── test_submissions.py     # create, edit, flag
│   ├── test_votes.py           # cast, update, budget deduction, anti-self-vote
│   └── test_admin.py           # task approval, era reset endpoint
└── conftest.py                 # shared fixtures: test DB, test client, seeded characters
```

### Example Unit Tests

```python
# tests/unit/test_scoring.py
from game_config import ERA_1, EraConfig
from services.scoring import compute_vote_budget, compute_level, compute_submission_score

def test_vote_budget_era1_base():
    assert compute_vote_budget(score=0, era=ERA_1) == 100

def test_vote_budget_era1_with_score():
    assert compute_vote_budget(score=50, era=ERA_1) == 200  # 100 + 2*50

def test_level_0_at_start():
    assert compute_level(score=0, era=ERA_1) == 0

def test_level_1_threshold():
    assert compute_level(score=9, era=ERA_1) == 0
    assert compute_level(score=10, era=ERA_1) == 1

def test_level_thresholds_are_sorted():
    thresholds = ERA_1.level_thresholds
    assert list(thresholds) == sorted(thresholds)

def test_submission_score():
    assert compute_submission_score(avg_stars=3.0, task_point_value=10) == 30.0


# tests/unit/test_era_config.py — config sanity checks
from game_config import ERA_1, CURRENT_ERA

def test_all_factions_have_valid_multipliers():
    for slug, faction in ERA_1.factions.items():
        assert 0 < faction.point_multiplier <= 2.0, f"{slug} multiplier out of range"

def test_level_thresholds_count():
    # Must have exactly 9 entries (levels 0–8)
    assert len(ERA_1.level_thresholds) == 9

def test_current_era_is_defined():
    assert CURRENT_ERA is not None
    assert CURRENT_ERA.config_key != ""

def test_max_signups_positive():
    assert ERA_1.max_task_signups > 0

def test_vote_budget_multiplier_positive():
    assert ERA_1.vote_budget_multiplier > 0
```

### Config-Driven Test Principle
Tests that validate game rules should **import the config and assert against it**, not hardcode magic numbers. If a config value changes, the test either still passes (the rule held) or fails immediately and tells you exactly what broke.

```python
# Good — validates the rule using config values
def test_level_1_threshold():
    threshold = ERA_1.level_thresholds[1]
    assert compute_level(score=threshold - 1, era=ERA_1) == 0
    assert compute_level(score=threshold, era=ERA_1) == 1

# Bad — fragile, breaks silently if threshold changes
def test_level_1_threshold():
    assert compute_level(score=10) == 1
```

### GitHub Actions CI

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: worldzero
          POSTGRES_PASSWORD: test
          POSTGRES_DB: worldzero_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Run migrations
        run: alembic upgrade head
        working-directory: backend
        env:
          DATABASE_URL: postgresql://worldzero:test@localhost/worldzero_test
      - name: Run tests with coverage
        run: pytest --cov=. --cov-report=term-missing --cov-fail-under=80
        working-directory: backend
        env:
          DATABASE_URL: postgresql://worldzero:test@localhost/worldzero_test
```

Coverage threshold starts at 80% and should increase over time.

---

## 13. Media Handling

**v1 — Local filesystem:**
- Files saved to `/media/{character_id}/{submission_id}/`
- FastAPI serves via static file mount
- Store relative path in DB

**v2 — Cloud (migration path):**
- Swap write logic for S3/Cloudinary upload
- `file_path` becomes a full URL
- No schema changes required (by design)

---

## 14. Project Structure

```
/
├── backend/
│   ├── main.py
│   ├── game_config.py            # EraConfig, FactionConfig, all named eras, CURRENT_ERA
│   ├── models/                   # SQLAlchemy models
│   ├── routers/                  # auth, characters, tasks, submissions, votes,
│   │                             #   relationships, messages, admin
│   ├── schemas/                  # Pydantic request/response schemas
│   ├── services/                 # scoring, media, auth, level-up, era-reset, vote-budget
│   │                             # (all accept EraConfig param; default to CURRENT_ERA)
│   ├── db.py
│   ├── config.py                 # env vars, secrets, app settings (not game rules)
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── conftest.py
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── auth/
│   └── public/
│
├── media/                        # gitignored
├── alembic/
├── .env                          # gitignored
├── .github/workflows/test.yml    # CI
├── CLAUDE.md
└── docker-compose.yml
```

Note: `config.py` holds environment variables and secrets (DB URL, OAuth credentials, JWT secret). `game_config.py` holds game rules. These are intentionally separate files.

---

## 15. CLAUDE.md (for Claude Code)

```markdown
# World Zero — Agent Instructions

## Project
A community game built with FastAPI (Python) + React. Players create Characters (public personas),
complete real-world tasks, post proof ("praxis"), and earn points through community star-rating votes.

## Identity Model (critical)
- Account = private login identity (Google OAuth). Never exposed publicly.
- Character = public game persona. Multiple per Account (level-gated at level 3).
- All game logic uses Character IDs. Votes enforce account-level anti-self-voting.
- Never expose account_id or email in public API responses.

## Config Architecture (critical)
- game_config.py is the single source of truth for all game rules.
- EraConfig defines mechanics for one era: task limits, vote budget formula, level thresholds,
  faction rules, and reset behaviour.
- CURRENT_ERA is the one variable that controls live game mechanics.
- The DB Era table stores config_key to record which era was active — it does not own rules.
- All service functions accept `era: EraConfig = CURRENT_ERA` for testability.

## Stack
- Backend: FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- Frontend: React, React Router, Axios
- Auth: Google OAuth2 via Authlib → JWT (provider-agnostic)
- Media: Local filesystem (v1), relative paths only
- Testing: pytest + pytest-cov, GitHub Actions CI

## Python conventions
- async/await throughout all FastAPI routes
- Pydantic schemas for all request/response bodies
- SQLAlchemy models in models/, business logic in services/
- Never put business logic in route handlers
- Services accept EraConfig parameter; never import CURRENT_ERA inside a service function body

## Key business rules (all driven by CURRENT_ERA / EraConfig)
- Max task signups: era.max_task_signups (default 20)
- Task level gate: character.level >= task.level_required to sign up
- Submission level gap: can submit up to era.task_submit_level_gap levels above own level
- Vote budget: era.vote_budget_base + floor(era.vote_budget_multiplier × score)
- First vote cast costs 1 from votes_available; updates are free
- Cannot vote if voter_account_id == submission author's account_id
- Character creation beyond first requires level >= 3

## Testing
- Unit tests: no DB required, test services directly with EraConfig instances
- Integration tests: use test DB via conftest.py fixtures
- Tests assert against config values, not hardcoded magic numbers
- Run: pytest --cov=. --cov-fail-under=80 from /backend

## Database
- PostgreSQL via docker-compose
- All migrations via Alembic only
- Run: alembic upgrade head after pulling

## Running locally
- Backend: uvicorn main:app --reload from /backend
- Frontend: npm start from /frontend
- DB: docker-compose up -d
- Tests: pytest from /backend

## Do NOT
- Put secrets or game rules in the same file (config.py = secrets, game_config.py = rules)
- Hardcode magic numbers from EraConfig in service logic
- Write sync SQLAlchemy in async routes
- Store absolute media paths
- Expose account_id or email in public API responses
- Put business logic in route handlers
```

---

## 16. Build Order (Recommended)

1. **Docker + DB + Alembic** — PostgreSQL, all models migrated, `game_config.py` written and reviewed
2. **CI scaffold** — GitHub Actions wired up; empty test suite passes before any real code
3. **Auth** — Google OAuth → JWT, Account + OAuthProvider, `/auth/me`
4. **Character creation** — CRUD, level-gate enforcement, unit tests
5. **Roles + Admin scaffolding** — Role/AccountRole, admin middleware
6. **Tasks API + seed data** — real tasks to develop against
7. **CharacterTask signup** — signup/drop, era-driven max cap, unit + integration tests
8. **Submissions API** — create, edit, media upload, flag
9. **Votes API** — cast, update, budget deduction, anti-self-vote, score + level-up trigger; unit tests cover all EraConfig permutations
10. **Frontend: Feed + Task Detail**
11. **Frontend: Submit Proof**
12. **Frontend: Character Profile + Leaderboard**
13. **Relationships + Messages**
14. **Admin views** — task approval, flagged queue, Era reset
15. **Polish** — mobile, loading states, error handling

---

## 17. Out of Scope (v1)

- Meta tasks (DB schema included; UI and enforcement deferred)
- Duels (Vote.duel_vote_for column present; full flow deferred)
- Faction multiplier enforcement (FactionConfig values present; application deferred)
- Task Vision (Journeymen), Double Dipper (Analog)
- Cloud media storage
- Email notifications
- Native mobile apps
- Random Events system
- Villain faction

---

## 18. Deployment Architecture

### Overview

The production stack sits behind this request path:

```
Browser → worldzero.org (GoDaddy DNS)
  → Render (handles HTTPS/SSL automatically)
    → React build   (static site, served as CDN)
    → FastAPI app   (web service, Docker container)
    → PostgreSQL    (Render managed database)
    → /media        (Render persistent disk, v1)
```

### Platform: Render

**Why Render for v1:** Handles SSL, DNS verification, container orchestration, and managed Postgres with minimal ops overhead. Docker-based deploys mean the same `docker-compose.yml` used locally translates directly to production. Migrating to a raw VM (DigitalOcean, AWS EC2) later is straightforward since everything is containerised.

**Render services required:**

| Service | Render Type | Notes |
|---|---|---|
| FastAPI backend | Web Service (Docker) | Runs from `/backend`, exposes port 8000 |
| React frontend | Static Site | Built from `/frontend`, served via Render CDN |
| PostgreSQL | Managed Database | Render Postgres add-on; automatic backups |
| Media storage | Persistent Disk | Mounted at `/media` on the backend service (v1) |

### Environment Variables (Production)

Stored in Render's environment variable dashboard — never in code or committed files.

```
# App
SECRET_KEY=<random 64-char string>
ENVIRONMENT=production

# Database
DATABASE_URL=<provided by Render Postgres>

# Auth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://worldzero.org/auth/google/callback

# Media
MEDIA_ROOT=/media
MEDIA_BASE_URL=https://worldzero.org/media
```

`config.py` reads all of these via `os.environ` (or `pydantic-settings`). The app fails to start if any required variable is missing — no silent misconfigurations.

### Connecting worldzero.org (GoDaddy → Render)

1. Deploy your app on Render — Render gives you a `*.onrender.com` URL
2. In Render dashboard: add custom domain `worldzero.org` and `www.worldzero.org`
3. Render provides a DNS target (a CNAME value)
4. In GoDaddy DNS settings:
   - Add `CNAME` record: `www` → `<render-cname-value>`
   - Add `A` record (or `ALIAS`): `@` → Render's IP (or use Render's ANAME/ALIAS if GoDaddy supports it)
5. Render automatically provisions and renews an SSL certificate via Let's Encrypt
6. DNS propagation takes up to 1 hour; HTTPS works automatically once propagated

### Continuous Deployment

GitHub Actions runs tests on every push (see Section 12). On a successful push to `main`, Render auto-deploys via a connected GitHub integration. The flow:

```
git push origin main
  → GitHub Actions: run tests + coverage check
    → (if passing) Render: pull new image, run alembic upgrade head, restart service
```

Database migrations run automatically as a pre-deploy step. If the migration fails, Render aborts the deploy and keeps the previous version live.

```yaml
# render.yaml (infrastructure as code — commit this to the repo)
services:
  - type: web
    name: worldzero-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: worldzero-db
          property: connectionString
    disk:
      name: media
      mountPath: /media
      sizeGB: 10
    buildCommand: ""
    startCommand: "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"

  - type: static
    name: worldzero-frontend
    buildCommand: npm run build
    staticPublishPath: ./frontend/build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html   # enables React Router client-side routing

databases:
  - name: worldzero-db
    databaseName: worldzero
    plan: starter
```

### Production Dockerfile (backend)

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Scaling Path

Render's starter tier is sufficient for alpha/beta. When traffic grows:

| Concern | Solution |
|---|---|
| Media storage filling up | Migrate to S3/Cloudinary (v2 — no schema changes required by design) |
| DB query slowness | Upgrade Render Postgres plan; add indexes via Alembic migration |
| Backend memory/CPU | Upgrade Render web service plan or enable horizontal scaling |
| Global latency | Add Cloudflare as CDN in front of Render (free tier, 5-minute setup) |

### Backups

- **Database:** Render Managed Postgres includes daily automated backups with 7-day retention on paid plans. For a community game with irreplaceable player data, enable this from day one.
- **Media files:** Render persistent disks are not automatically backed up. Before switching to S3 (which has built-in redundancy), set up a weekly cron job to copy `/media` to a secondary location.

### Google OAuth: Production Setup

Google OAuth requires explicit authorisation of your production domain. Before going live:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorised JavaScript origins:** `https://worldzero.org`
4. Add to **Authorised redirect URIs:** `https://worldzero.org/auth/google/callback`
5. Update `GOOGLE_REDIRECT_URI` environment variable on Render to match

The app will reject OAuth callbacks from unregistered URIs — this is a security feature, not a bug.

### Pre-Launch Checklist

- [ ] `ENVIRONMENT=production` set on Render
- [ ] `SECRET_KEY` is a fresh random value (not the dev key)
- [ ] Google OAuth redirect URI updated for production domain
- [ ] Custom domain verified in Render + DNS records set in GoDaddy
- [ ] SSL certificate provisioned (Render does this automatically)
- [ ] Database backups enabled on Render Postgres dashboard
- [ ] Run `alembic upgrade head` confirmed in deploy logs
- [ ] Smoke test: create account, create character, sign up for a task, submit praxis, cast a vote
- [ ] `/admin` route confirmed inaccessible to non-admin accounts
