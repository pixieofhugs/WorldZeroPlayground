# ADR-0031 — Backend emits copy keys; the frontend catalog resolves them

**Status:** Accepted
**Date:** 2026-07-13

**Relates to:** #451 (this decision), #440 (the react-i18next copy-catalog foundation this rides on), ADR-0010 (the superseded homegrown copy catalog)

## Context

A large share of the game's creative writing originates in backend era config
(`backend/eras/era_1.py`) and is served to the client as finished English:
foe **taunts** and level-up **ranks / unlocks**. (Faction name/description and
task title/description also originate server-side but are out of scope here —
see "Scope" below.)

The frontend text-extraction epic (#440) stands up react-i18next with JSON
resource catalogs, English-only, "lay the rails" — no language switcher yet.
It deliberately scopes to frontend JSX strings only. #451 asks the parallel
question for the backend-authored strings, and the issue framed it as two open
forks: *where do the strings live* and *does the API return a key or a resolved
string*.

Investigation showed the backend "strings" are not homogeneous — they have
three different serving models:

- **Taunts** — templates in config, but rendered server-side with the
  participants' names and **persisted as a finished English sentence** into
  `TauntMessage.message` at send-time (`services/taunt_service.py`). Baked
  English, unreachable for later localization.
- **Ranks / unlocks** — pure config, served live via `/game-config` from
  `CURRENT_ERA.level_profiles`.
- **Faction copy / task copy** — admin-editable (`Faction` DB row) and
  player-authored (`Task` rows, free text) respectively. Not cleanly
  config-owned; localization there is a DB-content problem, not a config-i18n
  one.

## Decision

**The backend emits copy *keys* (plus dynamic params); the frontend
react-i18next catalog owns every actual word and resolves them in the viewer's
locale. The backend grows no locale machinery of its own.**

Consequences by content type:

- **Ranks / unlocks.** The string fields on `LevelProfile` / `LevelUnlock`
  become **one semantic key per item** (`rank_key="ranger"`,
  `LevelUnlock(kind, key="duels")`). `kind` (ability vs sense) stays — it is
  game data, not copy, and abilities must still match real gate constants.
  `/game-config` returns `rank_key` / `key` / `kind`; the frontend resolves
  `t('progression:ranks.ranger')`, `t('progression:unlocks.duels.name')`, etc.
  The words move from `era_1.py` into `frontend/src/locales/en/progression.json`.

- **Taunts.** The template strings move from `era_1.py` into
  `frontend/src/locales/en/taunts.json`, keeping the existing
  `{ faction_slug: { trigger_type: [variants] } }` shape plus a `default`
  faction fallback. The backend stops persisting a rendered sentence and instead
  stores a **structured reference**:
  - `faction_slug` — **new column**, freezes the sender's send-time faction
    voice (senders can defect later).
  - `trigger_type` — already a column.
  - the **names are not stored** — they are derived at read-time from the
    existing `from_character_id` / `to_character_id` FK join (which the read
    path already does), so a renamed character updates naturally.
  - the **variant is not stored** — the frontend picks it deterministically as
    `taunt.id % variantCount`, stable within a locale, requiring zero backend
    knowledge of catalog contents.
  `TauntMessage.message` is dropped. Existing taunt rows cannot be reversed into
  a reference, so the migration **wipes them** (taunts are ephemeral social
  nudges).

**No backend locale negotiation.** Because the backend never resolves a string,
there is no `Accept-Language` handling, no per-locale maps in `era_1.py`, no
second catalog on the Python side. Locale selection is entirely the frontend
i18next concern and stays deferred with #440's language-switcher.

**Drift guard.** The backend is the only layer that can enumerate the full key
set from config, so a **backend test** reads
`frontend/src/locales/en/{taunts,progression}.json` and asserts every key
`CURRENT_ERA` references resolves: every `rank_key`, every unlock `key`
(`.name` and `.desc`), every `(faction_slug, trigger_type)` taunt combo
including `default`. This catches keys that no render-time test exercises (e.g.
a high-level popup) — the gap #440's dev/test missing-key throw leaves open.

## Alternatives rejected

- **Backend resolves a locale string.** Would duplicate i18next + a JSON catalog
  on the Python side and add locale negotiation — a whole parallel system for
  two content types. Two catalogs to keep in sync. Rejected.
- **Backend keeps picking the taunt variant.** Forces a backend variant-count
  map kept in sync with the catalog (and counts can differ per locale). The
  id-modulo pick removes that coupling entirely. Rejected.
- **Positional keys** (`ranks.level_2`, `unlocks.level_2.0`). Off-convention vs
  #440's semantic-nested keys and opaque to translators. Rejected for ~20
  one-time semantic slugs.
- **Preserve existing taunts** behind a nullable legacy `message` column.
  Leaves a permanent dual read-path and un-localizable old rows for ephemeral
  content. Rejected in favor of wiping.

## Scope

**In:** taunts, level ranks/unlocks. **Out (tracked separately):** faction
name/description localization (config vs admin-editable DB dual source of
truth) and task-content localization (DB rows, player-authored free text).
Vote-tier labels are already frontend-owned via #440.

## New vocabulary

- **Copy key / resolution key** — a stable identifier the backend emits in place
  of prose; the frontend catalog maps it to words per locale.
- **Structured taunt reference** — the `(faction_slug, trigger_type)` + FK-derived
  names + id-derived variant that replaces a persisted taunt sentence.
