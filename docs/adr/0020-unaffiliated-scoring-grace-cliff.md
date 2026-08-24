# Unaffiliated characters score full until a level-3 grace cliff

**Status:** Reversed
**Date:** 2026-06-25

> **⚠ Status (2026-07-17 audit): NOT BUILT / SUPERSEDED.** The grace-cliff penalty
> was never implemented — `unaffiliated_task_modifier` and
> `unaffiliated_penalty_level` exist nowhere in the backend, and
> `compute_faction_multiplier` (`services/scoring.py`) takes no level and applies no
> penalty. #452 flattened cross-faction modifiers to 1.0×, reversing this direction.
> Historical decision, not current behaviour.

Because characters now start unaffiliated and are never *forced* to join a faction
(ADR-0019), the incentive to commit comes from scoring. An unaffiliated (`na`) character
scores full **1.0×** through level `era.unaffiliated_penalty_level − 1` (a frictionless
onboarding grace period). From `era.unaffiliated_penalty_level` (3 in Era 1) on, **faction-
owned tasks** score `era.unaffiliated_task_modifier` (0.8× in Era 1) while neutral (`na`)
tasks stay 1.0×. The penalty is a **persistent state** — applied whenever the character is
both at/above the cliff level and unaffiliated — not a one-time deduction (points recompute
from votes continuously).

## Considered Options

- **Full 1.0× forever while unaffiliated**: simplest, but makes "never join a faction" the
  optimal scoring strategy and guts the faction system. Rejected.
- **Penalty from level 1**: punishes onboarding before a player has any realistic path to an
  invite. Rejected in favour of the grace period.

## Consequences

- Two new `EraConfig` fields: `unaffiliated_task_modifier` (0.8) and
  `unaffiliated_penalty_level` (3). Kept separate from `faction_graduation_level` so the
  "invites start arriving" and "you're taxed for not committing" levers tune independently,
  even though both default to 3.
- `compute_faction_multiplier` must take the character's **level** (today it takes only
  slugs) to apply the cliff.
- Neutral (`na`) tasks remain full-points for everyone, so frictionless work is always
  available regardless of faction state.
