# Albescent unlock is account-collective, with level and coverage decoupled

**Status:** Superseded by ADR-0080
**Date:** 2026-06-25

> **Status: SUPERSEDED 2026-08-22 by
> [ADR-0080](0080-one-life-earns-albescent-its-siblings-take-it-and-the-earner-never-can.md)
> (#2399).** Both rulings below are reversed: the unlock is earned by ONE
> character satisfying BOTH halves, coverage is measured by invitation letters ∪
> current faction ∪ defection history rather than by completed praxes, and the
> result is a stamped sticky column rather than a live computation. A character
> at `era.albescent_level_required` may no longer take Albescent at all.
>
> ADR-0080 records why: the "Considered Options" rejection of invite-possession
> below rested on a premise ADR-0022 has since made false — an invitation now
> costs two completed tasks **plus** 50 points per faction, so it is a *harder*
> bar than the one-completed-task-per-faction coverage this ADR set, not a
> cheaper one.
>
> **Do not restore this ADR's rule from the code.** The reverse already happened
> once: the 2026-07-17 audit found `can_start_as_albescent` implementing the
> same-character option this ADR rejected, and #698 resolved it in this ADR's
> favour. The same-character binding is now the ruling, and this document is
> history.

> **Superseded history — the rule below is no longer in force.**

Albescent becomes a selectable starting/joining faction for an account when **two
independent conditions** both hold across the account (not on a single character):

1. **Level** — *some* character on the account is at level ≥ `era.albescent_level_required`
   (8 in Era 1). Any one character; need not be the one that did the coverage.
2. **Coverage** — pooled across *all* the account's characters combined, there is **≥1
   completed task** (submitted, non-hidden praxis) for **every** non-sentinel faction
   (`na`, `aged_out`, `albescent` excluded; **UA included**, since UA is now an ordinary
   faction per ADR-0019).

Coverage is measured by **task-completion**, deliberately *not* the invite-possession gate
used for ordinary faction joins (ADR-0019) — Albescent is the one place the bar is "the
account has actually done the work in every faction."

## Considered Options

- **Both conditions on the same character** (the prior `can_start_as_albescent`): required
  one character to be both level-8 *and* personally cover every faction. Rejected — too
  punishing and conflated two unrelated achievements; the account is the natural unit.
- **Coverage via invite-possession**: would have unified with the join gate, but invites are
  a lower bar than completed work and would cheapen Albescent's "done everything" meaning.

## Consequences

- The level check and the coverage check become two separate account-scoped queries; the
  same-character coupling in today's code is removed.
- Including UA in coverage means the demotion of UA (ADR-0019) flows through here too.
