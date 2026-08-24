# ADR-0075 — A verified email is one Account, whatever provider vouches for it

**Status:** Accepted
**Date:** 2026-08-14

**Relates to:** ADR-0041 (the *shape* of identity: Account vs Character), CONTEXT.md
("Account"), #1769 (this ADR), #1771 (the verified-email check moves to the linking
seam), #1772 (a second provider)

## Context

ADR-0041 settled the **shape** of identity: a private Account owning public
Characters, with the provider identity held in a row rather than a column, so
that adding a provider is a handler plus a row and not a schema change. What it
did not settle is **trust between providers** — what happens when two of them
hand us the same email. Does the second sign-in find the existing Account, or
mint a new one beside it?

The system has answered that since v1, but only in code. A player arriving from a
second provider whose email an Account already holds is signed into that Account.
Nothing announces it, and no surface exists to arrange, inspect or undo it.

That answer deserves a record on all three of the usual grounds. It is **hard to
reverse** — once two provider identities point at one Account and Characters,
praxis, votes and score have accrued underneath, there is no clean unlink. It is
**surprising** read as raw mechanics: "a stranger's provider account can sign
into mine when the emails match" sounds like a defect. And it is a **real
trade-off** with a real alternative, which was considered and turned down. The
check that makes it safe currently reads as an unexplained precaution, and the
next person to add a provider has nothing to consult.

## Decision

**A verified email from any configured provider resolves to the existing Account
holding that email.** Silently — no confirmation step, no notification, no
"connect your accounts" interstitial. The email is the identity; providers are
routes to it.

### Why this is safe

Taking over an Account this way requires holding an account, at some provider we
accept, whose email is the victim's *and* which that provider has verified.
Provider verification asserts exactly one thing: the holder receives mail at that
address.

Anyone who receives mail at the victim's address can already run a password reset
at the victim's original provider and take the Account by that route. So the
security of auto-linking **equals inbox control** — which is already the floor
for every provider in the system, not a new floor this decision sets. It adds no
attack surface. Refusing to link would not protect an Account whose inbox is
compromised; it would cost the attacker one extra step and cost every honest
player a wall.

### The invariant

**Never link on an unverified or absent email.**

This is the load-bearing half of the decision, and it is stated separately from
the mechanism on purpose. The safety argument above is *entirely* a claim about
what provider verification buys. A provider that hands over an email it has not
verified — or hands over none — drops the requirement from inbox control to
typing a string, and the argument collapses with it.

So accepting a provider with weaker email guarantees is a decision that must come
back to **this ADR**, not a config change that passes as adding a row.

The invariant guards the **email-matching branch** specifically. A provider
identity the system has seen before is recognised by that identity, and needs no
email claim to be recognised again; gating recognition on a claim that may be
absent buys no security and locks out returning players. The check belongs where
an email is about to be treated as proof of who someone is — nowhere earlier.

## Consequences

**Good — sign-in behaves the way a player expects.** The same email is the same
Account, whichever button they pressed. No settings page to find first, no
dead-end error, no support path for "I clicked the wrong button and now I have
two accounts and half my history".

**Good — adding a provider stays the cheap thing ADR-0041 promised**, with
exactly one question attached to it: does this provider verify email? That
question is now on the record, with the reason the answer matters.

**Bad — the link is invisible.** A player cannot see which providers reach their
Account, and cannot detach one. Accepted while every accepted provider carries
the same guarantee: there is nothing to inspect and nothing surprising to
explain. It stops being acceptable the day that guarantee stops being uniform.

**Neutral — the Character layer is untouched.** Linking happens wholly at the
Account layer. Which provider walked in has no bearing on Characters, their
score, faction or history, and no public surface can observe it either way
(ADR-0041).

## Considered and rejected

**Explicit linking** — a "connect a provider" surface in settings, with sign-in
refused when a new provider's email collides with an existing Account. Rejected:
it buys no real security, because the threat it defends against already holds
inbox control and can take the Account by other means. Its costs are concrete — a
settings page to build and maintain, plus a dead-end error shown to a player
whose only intention was to sign in, on a path where they cannot serve themselves
out of it.

**A visible connected-accounts list** — read-only, showing which providers reach
this Account. Rejected as speculative *now*, not as wrong. While every provider
shares one guarantee it displays a fact with no decision attached. It becomes
worth building the day a provider with a weaker guarantee is accepted — arriving
alongside whatever else that acceptance requires, and this ADR is what should
send that reader here.

**Match on provider identity alone; never match on email** — mint a fresh Account
per provider. Rejected: it turns a second provider into a way to *lose* your
history rather than a way to reach it, and it hands the merge problem to the
player, and eventually to us, at the point where two Accounts already own
Characters.
