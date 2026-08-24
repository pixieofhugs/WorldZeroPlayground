# ADR-0009: Blocks are mutual and visible

**Status:** Superseded by ADR-0077
**Date:** 2026-06-24

> **Superseded in full by [ADR-0077](0077-a-block-is-its-own-record-not-a-status-on-a-friend-foe-edge.md)**
> — a block is its own record, not a status on a friend/foe edge.
>
> This ADR asked whether a block is visible and whether it is permanent, and took
> the *carrier* as given. That carrier is what broke: because `blocked` is a
> status on a declared edge, a block cannot exist without one — so B, in the
> motivating case below, holds no edge to A and has nothing to block. ADR-0077
> moves the block onto its own record and reverses both answers reached here. A
> block is now **silent to the blocked party**, and unblock deletes that record
> rather than restoring an edge.
>
> The argument below is preserved as written. It is the record of what was
> decided in June 2026 and of what ADR-0077 had to answer; it is not the live
> decision.


## Context

A relationship is a single directed **edge** (`from → to`, `type` friend|foe,
`status` active|blocked). A two-character dyad is at most two independent edges.
The felt label — "Mutual Friends", "Rivals", "Targeted" — is the **display
status**, computed per-viewer by `compute_display_status` and never stored (see
CONTEXT.md).

Either party may `block` an edge; only the declarer may `delete` it. Block is
the **target's** only lever against an incoming declaration they cannot delete
(B is declared a foe by A; B can't remove A's edge, so B blocks it).

Two questions had no recorded answer:

1. **Is a block private or visible?** Most social platforms hide a block from
   the blocked person. The relationship/feed code today is silent on the display
   side: the feed (`_get_related_ids`) filters `status = active` so a blocked
   edge stops driving activity and taunts, but `compute_display_status` ignores
   `status` entirely and labels off `type` alone. So after a block, the feed
   says "ties cut" while the relationship list still cheerfully says "Rivals" —
   an unintended leak, and an *accidental* answer of "block is invisible to the
   label."
2. **Is a block permanent?** `block_relationship` only ever sets `blocked`;
   there is no unblock path, so a mis-block can only be cleared by the declarer
   deleting the whole edge.

## Decision

A block is **mutual and visible**, and **reversible**.

- **Blocked wins the display status.** If *either* edge in a dyad has
  `status = blocked`, the display status is **`Blocked`** for **both** parties,
  overriding any type-derived label. `compute_display_status` takes edge
  **status**, not just type. `Blocked` joins the `RelationshipDisplayStatus`
  literal.
- **Visible by design.** The blocked person is *meant* to know. This falls out
  naturally: the edge that got blocked is the *declarer's* own edge, so it
  surfaces in their own (outgoing) relationship list as `Blocked`. We do not
  hide it.
- **Reversible.** An `unblock` action restores `active` (re-deriving the
  type-based label), so a block made by mistake can be undone without losing the
  edge or its `created_at`. Either party may unblock, symmetric with block.
- Block remains **per-edge** in storage — a dyad has no stored entity to hang a
  "dyad block" on — but reads as a **dyad-level** `Blocked` because *either*
  blocked edge is sufficient.

## Consequences

- The feed/label leak is closed: `Blocked` is the one place `status` reaches the
  display layer, so feed and label finally agree.
- A blocked party sees `Blocked` rather than a stale "Rivals"/"Mutual Friends" —
  the signal is intentional game texture, not an accident.
- We diverge from the common "silent block" convention; this is deliberate and
  should not be "fixed" toward invisibility without revisiting this ADR.

## Alternatives considered

- **Silent block (hide from the blocked party).** Rejected: the platform is a
  small, banter-driven game where knowing you've been blocked is part of the
  social texture, not a safety hazard. The usual privacy rationale (harassment
  de-escalation at scale) doesn't apply here.
- **Block reads as *absent* everywhere** (a blocked edge labels as `none`, so
  the dyad just looks un-declared). Rejected: it hides the block from the
  blocked party and silently rewrites a Rival into a stranger — strictly less
  information than `Blocked`, and still leaks differently (the blocker's own
  list would forget why).
- **Permanent block (no unblock).** Rejected: a mis-tap shouldn't be
  irreversible, and forcing a `delete` to clear a block conflates "I changed my
  mind about blocking" with "I'm retracting my declaration."
