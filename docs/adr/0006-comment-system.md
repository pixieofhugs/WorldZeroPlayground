# Comments are an actor-scoped, two-mode surface on praxis and tasks

**Status:** Amended by ADR-0061, ADR-0064
**Date:** 2026-06-25

Comments are in scope for Era 1 (vault design doc, "Open Design Questions"). This records
the data model, moderation, faction-resolution, and dispatch wiring. Design/lore (each
faction's comment *voice* and ornament) is canon in the vault (ADR-0001); this ADR owns the
wiring.

Builds on ADR-0002 (a page is a composition of independently-themed surfaces; content slots
invariant, presentation per-faction) and ADR-0005 (a surface's per-faction archetype can carry
more than one render mode — vote caster vs. summary).

## Decisions

- **Attach to both praxis and tasks** — modelled as one `Comment` row with two nullable FKs
  `praxis_id` / `task_id` and a DB `CHECK (num_nonnulls(praxis_id, task_id) = 1)`. "A comment
  belongs to exactly one of {praxis, task}" is a database invariant, not a convention. No
  polymorphic `target_type/target_id` (loses FK integrity), no two tables (doubles every path).
  Mirrors how `Vote`/`Flag` already hang off the praxis with partial constraints.

- **Flat, not threaded.** No `parent_id` in Era 1. Reply semantics come from **`@mention`**.
  Ordered **chronological ascending** (conversation-style). `parent_id` is an additive nullable
  column if real threading ever earns its place.

- **Content slots are invariant; only the archetype varies** (ADR-0002). Every faction's comment
  renders the same logical slots — **author identity · body · timestamp+edited** — drawn however
  the faction likes (SNIDE ransom scrawl, Ephemerist marginalia). The **author-identity slot is
  itself the actor-scoped avatar/badge surface** (composes the `FactionAvatar` dispatcher).
  Guarded by the same parametrized dispatcher-map test as ADR-0002 (issue #151), extended to walk
  `COMMENT_COMPONENTS`.

- **Faction resolution is actor-scoped, live, per row + composer** (confirms the prior decision,
  CONTEXT.md / ADR-0002):
  - A posted **comment row** themes to *that comment's author's* member faction.
  - The **composer** themes to *the current character's* member faction.
  - Resolved **live** from `character.faction_slug` at render — **no snapshot column**. A
    defector's old comments re-theme to their new faction, matching the avatar/badge surface.
    `author_faction_slug` is an additive column *then* if the "frozen voice" ever bites.

- **One per-faction surface ("Comment", surface #14), one dispatcher, two render modes.**
  `COMMENT_COMPONENTS: Record<slug, Component>` + `DefaultComment`, resolved via `pickVariant`.
  `mode="row"` (read-only, keyed on `comment.author.faction_slug`) and `mode="composer"` (input,
  keyed on `currentCharacter.faction_slug`). **The call site picks the slug; the component is the
  same archetype** — a faction's comment voice is defined once and used for both reading and
  writing (mirrors ADR-0005's one-ramp-two-modes). The **`CommentThread` container is neutral
  chrome, not a per-faction surface** — a thread is multi-faction, so no single faction owns it;
  it lays out rows + one composer and never blanket-themes (ADR-0002).

- **Edit: author only, body only.** Sets `is_edited` (`Boolean`, `server_default="false"` — a
  marker, not a timestamp; the "edited" slot needs only the fact). No history, no edit window.
  `is_edited` is deliberately not derived from `updated_at`, which also moves on moderation.

- **Delete is soft, two-axis, reusing the praxis moderation machinery:**
  - **Author delete** → `is_withdrawn = true` (boolean, like `Praxis.is_withdrawn`).
  - **Admin hide** → `moderation_status = hidden` (reversible hold).
  - **Admin delete** → `moderation_status = deleted` (terminal tombstone). Requires adding
    `deleted` to the shared `ModerationStatus` enum (one `ALTER TYPE … ADD VALUE`; praxis never
    uses it). Reusing the shared enum keeps one moderation vocabulary, per the same-machinery goal.
  - **Public list filter:** `is_withdrawn == false AND moderation_status == visible`.
  - The comment surface renders only on a **visible praxis** (withdrawn/hidden → no thread);
    tasks are commentable while **active**.

- **Not votable.** Voting is the praxis *scoring* mechanism; comments are not game content.

- **Flagging reuses the `Flag` table with the same two-target pattern.** `Flag.praxis_id` becomes
  nullable, add nullable `Flag.comment_id`, `CHECK (num_nonnulls(praxis_id, comment_id) = 1)`.
  Self-flag rejected (mirrors `flag_praxis`). When a comment's flag count reaches
  `era.comment_flag_review_threshold`, set `moderation_status = flagged` → it surfaces on the
  moderator review page (alongside flagged praxes). Praxis keeps its implicit threshold of 1 (not
  retrofitted).

- **`@mention` notifies via the activity feed.** The feed is a read-time aggregator with no events
  table, so mentions must be queryable by recipient. A **`comment_mention` join table**
  (`comment_id`, `mentioned_character_id`, `UNIQUE` pair) is written on comment create and
  **reconciled on edit**. Resolution is by **`username`** (unique handle); an unresolved `@handle`
  stays plain text. A new feed item type **`comment_mention`** (a `_fetch_comment_mentions`
  sub-query joining `comment_mention → comment → praxis/task`) lands in the `your_stuff` (+ `all`)
  filter with a `_compute_counts` entry. **No self-notify.** Linkify in the body is a separate
  render-time concern.

- **Two new `EraConfig` gates** (config rule → `game_config.py` dataclass + `eras/era_1.py`,
  surfaced on `/auth/me` like the other capability gates):
  - `comment_level_required: int = 2` — min level to post (social layer opens at L2 in the vault).
  - `comment_flag_review_threshold: int = 1` — flags before a comment hits the review queue.
    `# ponytail: hardcoded; compute from active-user count when the site grows.`

## Data the model needs

**`Comment`** — `id`, `praxis_id?`, `task_id?` (CHECK exactly-one), `created_by_id`,
`body_text` (≤2000 chars, enforced at the API trust boundary), `created_at`, `updated_at`,
`is_edited`, `is_withdrawn`, `moderation_status`.

**`Flag`** — `praxis_id` made nullable, add `comment_id?`, CHECK exactly-one.

**`comment_mention`** — `id`, `comment_id`, `mentioned_character_id`, `UNIQUE(comment_id,
mentioned_character_id)`.

**`ModerationStatus`** — add `deleted`.

**`EraConfig`** — add `comment_level_required`, `comment_flag_review_threshold`.

## Status / tracking

- Not yet built. Implementation tracked in the GitHub issue filed from this design session.
- Per-faction comment *aesthetics* (SNIDE/Everymen/Ephemerists/WoW/Singularity/UA/Albescent
  voices) are vault design work, not specified here.
