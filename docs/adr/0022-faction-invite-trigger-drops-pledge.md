# Faction invite is earned by 2 tasks + 50 points; pledge-allegiance gate dropped

**Status:** Accepted
**Date:** 2026-06-25

A character earns its own `InvitationLetter` for faction X (current era) by completing
**2 tasks for X** and **50 points from X's tasks** — both faction-scoped and measured
per-character. The prior third condition — a *"Pledge allegiance to X"* praxis with ≥2 votes
and no flags — is **dropped**. This resolves a long-standing drift between the
`InvitationLetter` docstring (level ≥ 3, score ≥ 20) and `SPEC-game-rules.md` (2 tasks +
50 pts + pledge); both are superseded by this rule.

## Why

The invite is now *the* gate on faction membership (ADR-0019). Gating it behind a praxis that
needs ≥2 community votes makes onboarding depend on other players showing up to vote —
fragile, and expensive to build. A purely mechanical, self-contained, per-character trigger
(2 tasks + 50 points) is predictable and removes the community-availability dependency.

## Consequences

- Invite delivery becomes a per-character count/sum check against the character's completed
  X-tasks — no vote-state or praxis-type coupling.
- The `InvitationLetter` docstring and the `SPEC-game-rules.md` invitation section both need
  updating to this rule (kill the level≥3/score≥20 and the pledge variants).
- Earning stays **per-character**; account-pooling applies only later, at the *join* gate
  (ADR-0019).
