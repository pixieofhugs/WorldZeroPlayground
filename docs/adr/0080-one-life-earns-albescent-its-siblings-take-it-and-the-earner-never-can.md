# ADR-0080 — One life earns Albescent, its siblings take it, and the earner never can

**Status:** Accepted
**Date:** 2026-08-22

**Supersedes:** [ADR-0021](0021-albescent-unlock-is-account-collective.md) — entirely. Both of its
rulings (account-collective, and level/coverage decoupled) are reversed here, and its coverage
measure is replaced.
**Relates to:** #2399 (this re-cut), #698 (which enforced ADR-0021 against the code, in the ADR's
favour), [ADR-0022](0022-faction-invite-trigger-drops-pledge.md) (invitations are earned by work
— the premise that makes ADR-0021's second rejection false), [ADR-0027](0027-albescent-is-a-secret-society.md)
(secrecy — untouched), [ADR-0042](0042-era-as-ruleset-config-owns-rules-db-owns-history.md) (era reset)

## Context

ADR-0021 made the Albescent unlock **account-collective**, with two **independent** gates: some life
on the account at `era.albescent_level_required`, and — pooled across every life — one completed task
for each of the seven joinable factions. It explicitly rejected the same-character binding as "too
punishing", and explicitly rejected invitation-possession as coverage because "invites are a lower
bar than completed work and would cheapen Albescent's 'done everything' meaning".

Two things have changed since.

**The second rejection rested on a premise ADR-0022 has made false.** ADR-0021's own coverage bar was
*one completed task per faction*. Under ADR-0022 an invitation is not a lower bar than that: it costs
`era.invitation_task_threshold` completed tasks **plus** `era.invitation_point_threshold` points, per
faction — two tasks and 50 points in Era 1. Coverage-by-invitation is therefore **strictly harder**
than the bar ADR-0021 set, not cheaper. The sentence that rejected it was true when written and is
not true now.

**Albescent had become a destination rather than a life.** Under ADR-0021 the character who reached
level 8 was precisely the character who walked into Albescent — at the top of the ladder, with
nothing left to climb, holding the faction that inherits every other faction's perk. The perks
arrived after the game they were for was over.

There is also a mechanical problem ADR-0021 never had to face. Invitation letters and
`FactionDefectionHistory` rows are era-scoped, and `apply_era_reset` (ADR-0042) returns every
character to `na` at level 0. Nothing an era-scoped predicate reads survives a reset, so an unlock
defined as a *live computation* silently un-earns itself the moment an era turns over.

## Decision

**Albescent is a New Game+ faction.** One life earns the door for the whole account; that life may
never walk through it; any *other* life below the ceiling may, ungated by its own progress.

1. **Earn — both halves on the SAME character.** One life, in the current era, that is at
   `era.albescent_level_required` **and** has been invited to or has been a member of all seven
   joinable factions. This is exactly the binding ADR-0021 rejected. It is restored because the
   ladder should be climbed by somebody, not assembled from parts.

2. **Coverage = invitation letters ∪ current faction ∪ `FactionDefectionHistory` rows**, for that one
   character, in that era. All three arms are load-bearing and no new table is needed:
   - A character is never invited to the faction it *currently holds* (`_deliver_earned_invitations`,
     #1425), and `defect_to_faction` **deletes** the letter when you walk out (#2218). A live-letter
     count is therefore structurally incapable of reaching seven for anyone who has ever joined
     anything — membership counting is what makes the rule reachable at all.
   - The letter delete can never cost coverage: the same transaction that deletes a letter writes a
     defection row for that identical slug.
   - `FactionDefectionHistory` is append-only and survives an era reset by its own docstring.

3. **Take — any life on the account below the ceiling**, at character creation or via the standing
   letter, ungated by that life's own level, faction history or coverage. The account already paid.

4. **Never the earner — a character AT `era.albescent_level_required` may not take Albescent.**
   Refusal copy: **"Available only for New Game+"**. This is **the only maximum-level gate in the
   game**; every other level test in the codebase is a floor. It is enforced in `defect_to_faction`,
   which is the only surface it can bite on — a newly created life is level 0.

5. **The unlock is a stamped, sticky, monotonic `account.albescent_unlocked` column**, set once and
   never unset, the same shape as `albescent_revealed`. It is **stamped**, not derived, because after
   an era reset there is nothing left to derive it from — see Context. Written in
   `recalculate_character_stats`, after invitation delivery, which is the one place where both halves
   of the earn rule move. It **survives era resets**: *"getting to level 8 is very hard. This is a
   thank you to players who have put in that effort."*

6. **No backfill.** The column defaults to false for everyone, including accounts that passed the
   ADR-0021 gate. That gate answered a different question; importing its answer would grandfather a
   rule that no longer exists.

7. **Level-8 Albescent characters are evicted to `na`** when this ships — a separate line from ruling
   6, because defaulting a column to false moves nobody out of a faction. Ruling 4 makes their state
   unreachable, and production held exactly one such row.

## Considered options

- **Keep ADR-0021.** Rejected: it produces the destination-not-a-life outcome above, and #698 proved
  that leaving a superseded ADR standing gets the code reverted to it by the next audit.
- **Derive the unlock live, as ADR-0021 did.** Rejected: era-scoped inputs, so the unlock un-earns
  itself at every era reset. This is the one part of the design that is not a taste call.
- **Coverage by completed praxis (ADR-0021's measure).** Rejected: it cannot see membership at all,
  so it asks a different question from "has been a member of", and it is now the *easier* bar of the
  two (see Context).
- **A new table recording faction coverage.** Rejected: the three existing sources already answer it
  exactly, and a fourth would need its own reset semantics.
- **Let the level-8 earner take Albescent too, and gate only siblings.** Rejected by the owner: it is
  the outcome this ADR exists to end.

## Consequences

- ADR-0021's `_account_covers_every_faction` (a pooled submitted-praxis query) is deleted;
  `can_start_as_albescent` becomes a column read and no longer computes anything.
- `/auth/me` gains `albescent_level_required` so the standing letter can name which lives may still
  answer it, rather than duplicating the number as a frontend literal.
- Albescent becomes a **character-creation option** for an unlocked account, decided in
  `get_account_invited_faction_slugs` alongside the other seven. The creation-time Albescent refusal
  (`FACTION_ALBESCENT_NOT_AT_CREATION`) is retired; an un-earned account now gets the ordinary
  "you don't hold an invitation" answer, which also happens to preserve ADR-0027's secrecy by not
  confirming the faction exists.
- **Albescent is empty in production** after the eviction, and stays empty until the affected account
  covers its seventh faction (`ua`). This was ruled acceptable, explicitly, and is not to be papered
  over with a conditional migration or a coverage check.
- ADR-0027 secrecy is **untouched**: the letter may name Albescent and still must never link to
  `/factions`.
