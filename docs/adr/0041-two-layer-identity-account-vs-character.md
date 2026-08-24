# ADR-0041 — Two-layer identity: Account (private anchor) vs Character (public persona)

**Status:** Accepted
**Date:** 2026-07-17

**Relates to:** ADR-0025 (the active character is the actor), CONTEXT.md ("Account", "Character")

> Harvested from the retired `SPEC-architecture.md §3` during the 2026-07-17 docs
> consolidation. The decision predates the ADR corpus; this records it so it
> survives the spec's deletion.

## Context

The single most-cited architectural distinction in the project. It is invisible
in any one model file (both `Account` and `Character` look like ordinary tables),
so a reader has to be *told* which layer owns what — and, critically, that
anti-abuse is enforced one layer up from where actions happen.

## Decision

Identity is two layers:

- **Account** — the private credential + anti-abuse anchor. Owns the OAuth
  principal and email. **Never** appears on a public surface (`account_id`,
  `email` are private). One account owns one or more **Characters**.
- **Character** — the public in-game persona (`username`, `display_name`, level,
  score, faction). **Every** game-facing row (praxis, vote, comment, task signup,
  relationship) FKs to a Character, never to an Account.

**Anti-abuse operates at the account level, not the character level.** Because
one account can own many characters, fraud checks compare `account_id`s:
anti-self-vote rejects a vote when `voter.account_id == author.account_id`; the
account is the unit of the multi-character cap, the invite gate (ADR-0019/0022),
and the Albescent unlock (ADR-0021). See ADR-0025 for how the *active* character
is chosen as the actor.

**Auth is provider-agnostic.** Google OAuth2 is the only v1 provider, but the
layer is written against an OAuth2 abstraction (an `oauth_providers` row), so
adding a provider is a new handler + a row — **no schema change**.

## Considered and rejected

**Character-level fraud checks** — trivially defeated by alt characters on one
account (the "sock puppet" problem). The whole reason the anchor is the Account
is that a player controls all characters under it.

**Google-specific auth code** — would make a second provider a schema-and-rewrite
job instead of a config change.
