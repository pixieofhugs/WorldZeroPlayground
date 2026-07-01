# ADR-0025 — The active character is the actor for every write path

**Status:** Accepted
**Date:** 2026-07-01
**Relates to:** EPIC #275 (multi-life creation), ADR-0019 (invite gate is account-pooled), issue #293

## Context

An account owns one or more characters ("lives" in the UI). `POST /me/active-character`
lets a player carry a different life, and `resolve_active_character`
(`services/character.py`) honours `account.active_character_id` — so `/auth/me`
correctly reports the carried life as "you". FieldDesk (`/`) makes stepping into a
life (`enterLife` → switch) the entry action before anything else.

But **write paths never got the memo.** `get_current_character`
(`dependencies.py`), the dependency behind **43 write call sites** across 11
routers, selects the *oldest* active character by `created_at` and ignores
`active_character_id`. Its read-side mirror `get_current_character_optional` (used
for viewer-relative flags like `can_vote` / `can_flag` / `is_member`) shares the
bug. So after switching lives, task signup, praxis edits, invites, votes, and
profile edits all still act as the account's **first** life — and profile edits of
the switched-to life 403 ("Cannot edit another character").

PR #291 pinned this with three same-account write tests marked
`xfail(strict=True)` (`test_multi_character.py`). EPIC #275's locked decision #4
deliberately scoped "editing existing characters" *out*, deferring the
whole-write-path question. This ADR settles it.

The feature's intent (per Molly): a second character is a **sock puppet** — it
should have its **own independent identity for everything**, *except* the
account-scoped anti-cheat guards that stop a player using alts to cheat.

## Decision

**The active character (`account.active_character_id`, via
`resolve_active_character`) is the actor for every authenticated write path and
the viewer for every read-time, viewer-relative field.** A life is an
independent character in all respects except the account-scoped anti-cheat
guards below.

- **One resolver.** `get_current_character` and `get_current_character_optional`
  both route through `resolve_active_character`. The oldest-by-`created_at`
  selection is deleted; the fallback when `active_character_id` is null becomes
  **newest active** (matching `/auth/me`), so writes always act as whoever the UI
  says is active. Single-character accounts are unaffected.
- **Edit/delete/avatar is carried-character-only.** The existing
  `current_character.id != character_id → 403` guard stays, now resolved against
  the active character: you may edit/delete only the life you are stepped into.
  Avatar upload (`POST /{id}/avatar`), today an account-wide check, is converted
  to the same guard so the three profile mutations stay consistent. Managing
  another life means switching to it first (FieldDesk already does this). We do
  **not** add an account-wide edit path — that would be the one place lives aren't
  independent, muddying the model.

**Account-scoped anti-cheat guards (the only exceptions to independence):**

- **Anti-self-vote** — already enforced account-scoped (`services/vote.py`): a
  character cannot vote on a praxis authored by any character sharing its account.
  Preserved as-is.
- **Anti-self-flag and anti-gang-flag** — flagging is currently only
  *character*-scoped (a puppet can flag a sibling's praxis; puppets can stack
  flags on one third-party praxis). Making these account-scoped is real work on a
  different seam (`flag_praxis` / `can_flag_praxis`) and is **deferred to a
  dedicated sibling issue**, not #293.
- **Third-party vote stacking is allowed.** Multiple lives each voting on the same
  *third-party* praxis is not blocked: votes are per-character with their own
  scarce budget, diluted across the pool — a far weaker exploit than flag-ganging,
  and blocking it would nerf the core scoring mechanic. If it shows up in real
  data it becomes its own tuning issue.

## Consequences

- One-line reroute in both resolvers flips the actor for all 43 write sites and
  both read sites; the three `xfail(strict)` markers in `test_multi_character.py`
  are removed (they xpass, and strict-xfail gates the fix).
- A player edits/deletes only the carried life; switching is the precondition for
  managing another. No new ownership predicate.
- The multi-life anti-cheat surface is **not** fully closed by #293 — the flag
  gang-up is a known open gap tracked in the sibling issue. Until it lands, a
  puppet can still flag a sibling's or a rival's praxis.
- "Life" remains the player-facing and code term (`active_character_id`,
  `resolve_active_character`, FieldDesk "lives"); "sock puppet" is the design
  register for the anti-cheat intent. No renames.
