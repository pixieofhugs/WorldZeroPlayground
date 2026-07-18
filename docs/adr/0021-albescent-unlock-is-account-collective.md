# Albescent unlock is account-collective, with level and coverage decoupled

> **⚠ Status (2026-07-17 audit): CONTRADICTED BY CODE.** `services/character.py`
> (`can_start_as_albescent`) currently requires level ≥ threshold **and** full
> coverage on the *same* character — the option this ADR explicitly **rejected**.
> Either the code is a standing bug or this decision was abandoned; tracked as a
> code-cleanup follow-up, not resolved here.

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
