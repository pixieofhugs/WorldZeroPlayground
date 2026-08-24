# Collaborations are co-owned by all members

**Status:** Accepted
**Date:** 2026-06-25

## Context

A collaboration is one shared praxis with many members. The service pinned the
mutating actions — edit body/title, reopen, kick — to `created_by` only, while the UI
exposed them to *any* member. The result was shipping drift: a collaborator who clicked
"Edit" or "Reopen" on the *Shared Document* got a 403, and the kick button appeared to
everyone but worked for no one but the creator. For a thing literally called shared
work, the single-owner model also just reads wrong.

## Decision

A collaboration is **co-owned by all its members**. Every member may:

- **edit** the shared title/body/media,
- **invite** other eligible players (already the rule),
- **reopen** a pending/published collab back to drafting,
- **kick** any other member (including the original creator),
- **leave** (remove their own membership).

`created_by_id` survives only as a historical "who started it" fact; it carries **no
special powers** in a collab. The service relaxes edit/reopen/kick from creator-only to
any-member, which also erases the UI/service drift (the UI already assumed co-ownership).

Membership-changing actions (kick, leave) and edits reset `has_submitted` and cancel any
pending-publish window — consistent with "a change means we're not done" (ADR-0012).

Accepted risk: any-member kick allows a kick-war or booting the creator. In a small,
private, invite-only group of cooperating players this is low-stakes and symmetric with
"anyone can invite." We chose one coherent rule ("co-owned means co-owned") over a
special-case carve-out for kicking.

## Scope

Collab only. A solo praxis has one member. A duel is two independent `type=solo` praxes
(ADR-0011), each owned by its own author — co-ownership does not apply.
