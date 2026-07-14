# Player profile: one faction-agnostic contract; badges are a code registry evaluated on read

Issue #459 (foundation of the player-profile epic; the seven faction skins are #460).
Design source: `player-profile-contract.json` + `guidelines/player-profile-contract.html`
in the "World Zero Design System" cloud project.

## Decision 1 — one profile contract, skin derived client-side from faction, never stored

A player profile is a **public** view of one character. Every profile renders
the **same locked sections in the same order** — ① identity + progression
(the shared `CredentialCard` pinned as the header), ③ badges (hidden when
empty), ⑤ praxis (the faction `PraxisCard`, FDL laurel on the top entry by
base+vote points) — plus the two kept features the design predates: proposed
tasks (faction `TaskCard`) and friend/foe (faction-skinned). ② About is
skipped until a long-form field exists. There is no self-edit affordance on
the profile.

Only the **skin** changes per faction, and the skin is **derived client-side
from `faction_slug`** by `FactionProfileBody`
(`frontend/src/pages/characterProfile/`), following the existing
`pickVariant` / `FACTION_*_BY_SLUG` dispatch pattern. Nothing
archetype-specific is stored, and the payload carries no skin fields.

Consequence: adding a faction's profile needs only its kit tokens + one
registry row + one skin component — zero new profile fields, zero backend
change. Until a row is registered, every slug falls back to the fully-built
default (spectrum-band / unaffiliated) skin, so every player gets a correct
profile from day one.

## Decision 2 — badges are a code registry evaluated on read

Badges (deliberately not "achievements") are **code-defined** in
`backend/badges.py`: a module-level registry of frozen `Badge` dataclasses,
each `(key, name, condition)` where `condition: Callable[[BadgeContext],
bool]`. They are **evaluated on read** in `services/badge.py` — no table, no
`earned_at`, no award events, no admin grants (all future work, if ever).
A badge either holds right now or it doesn't; a new badge is one registry
entry.

- The payload is `{ key, name }[]` on `CharacterOut.badges`, populated
  **only** by the single-character `GET /characters/{id}` — list serializers
  leave it empty (no N+1 sibling queries).
- The **image is not in the payload**: the frontend maps `key` to a bundled
  SVG (`frontend/src/components/badges/badgeArt.tsx`), exactly like faction
  sigils.
- `BadgeContext` is built from **explicit queries** (`Character.account` is
  `lazy="raise"` and must stay un-loaded); `account_id` / `email` never leave
  the backend — only the resolved badge list does.

Seed pair (both key off one account owning multiple characters, ordered by
`(created_at, id)`): `sock_puppeteer` on the account's earliest character,
`sock_puppet` on every later one. A solo-account character has neither.

## Rejected

- **Stored/awarded badge subsystem** (table + `earnedAt` + admin grant): the
  design's model, deferred — on-read conditions cover the seed pair and keep
  the blast radius to one module.
- **Badge icon or skin hints in the payload**: presentation is
  faction/frontend-owned, per the component-constants rule every other
  surface follows.
- **`role` / standing field**: the game has no membership-rank system; the
  header shows faction + level. Design copy assuming ranks was dropped.
