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
- Incentive to ever leave unaffiliated now comes from scoring, not force — see ADR-0020.
