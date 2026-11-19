# Characters start unaffiliated; faction membership is gated by account-pooled invitation

**Status:** Accepted
**Date:** 2026-06-25

New characters are no longer forced into UA. Every character is **born unaffiliated**
(`faction_slug = "na"`), and UA is demoted to an ordinary, invite-able faction with no
starter privilege. A character may **join, switch to, or be born into** faction X iff the
**account** holds an `InvitationLetter` for X in the current era on *any* of its characters —
one account-scoped predicate applied identically at character creation and mid-life, with
**level decoupled from joining** (a level-1 character can be born into a faction a sibling
already holds an invite for). The lone first character's "wait" is just the degenerate case:
the only invite an account can hold is one it earns itself, via task work.

## Considered Options

- **Forced UA start + per-character level-3 graduation** (the prior design): kept UA as a
  privileged starter and gated faction choice at level 3 per character. Retired — it
  conflated *eligibility* (have you earned a faction?) with *incentive* (should you commit?),
  and forced a starter faction nobody chose.
- **Task-completion as the join gate** (sibling has done ≥1 faction task): considered, but a
  lower, fuzzier bar than the invite it would replace. Rejected in favour of reusing the
  existing `InvitationLetter` as the single source of truth — task completion is *how* an
  invite is earned, not a parallel gate.

## Consequences

- Joining is one account-scoped `EXISTS` query against `InvitationLetter` joined to the
  account's characters — no new model, no creation-vs-switch special-casing.
- Invites are era-scoped, so the account-pooled start resets each era.
- "Everyone starts in UA" and the `aged_out` forced-graduation mechanic are fully retired.
- Incentive to ever leave unaffiliated comes from the invite, not force. *[2026-11-19, #3426: this line cited ADR-0020's scoring penalty, which was never built; see the amendment]*

## Amendment (2026-11-18, #3427): the join gate reads more than letters

"One account-scoped `EXISTS` query against `InvitationLetter`" understates the
gate (#2385, #2218). `get_account_invited_faction_slugs`
(`backend/services/character.py`) is the union, across the account's characters,
of: current-era letters; each character's current faction; and current-era
defection history (letters are deleted on defection, #2218). Sentinel slugs are
excluded, and Albescent is added back if the account earned it. A new life may be
born into any faction in that set.

A **per-character rejoin refusal** sits on top, in `faction_service`: a character
that left a faction this era may not rejoin it, unless that faction has
`can_always_rejoin`. The owner ruled the code right, so this is the rule. Invites
remain era-scoped.

## Amendment (2026-11-19, #3426)

ADR-0020 is Reversed and was never built (#452 flattened cross-faction modifiers to 1.0x): there is no unaffiliated penalty, so scoring gives no incentive to leave. No later ADR replaced it, so the status stays Accepted.
