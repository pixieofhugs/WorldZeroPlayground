# ADR-0026 — The UA comment adopts the gilt-salon identity

**Status:** Accepted
**Date:** 2026-07-02

**Supersedes:** the UA-palette clause of [ADR-0018](0018-comment-voice-reuses-task-card-atoms.md)
**Relates to:** ADR-0006 (comment system; still owns model/dispatch), the gilt-salon UA rebrand (PR #361), issue #377

> **Amended by the UA identity redesign (#788 / #850).** The *gilt salon* named
> below is retired. The decision the salon was reached *for* — that the UA
> comment wears UA's own faction identity rather than a stale pre-rebrand
> letterhead — still stands; only the identity it wears has changed. See
> [Amendment — the marginal note](#amendment--the-marginal-note-2026-07-20).

## Context

[ADR-0018](0018-comment-voice-reuses-task-card-atoms.md) gave each faction's comment voice its
task-card skin. For UA it made one deliberate, scoped call: **"UA wears the new orange/gold look
here; the rebrand at large is out of scope."** `UAComment` was styled inline with seven hardcoded
hex values (ivory `#f9f2e2`, gold `#c9a23c` / `#ecd089`, orange `#c8601a`, bronze `#b07a3a`, ink
`#2a1a10`) because the `--faction-ua-card-*` tokens were then stale purple — so inlining hex was
correct at the time.

That premise is now false. The **gilt-salon UA rebrand landed globally (PR #361)**: task card,
task detail, praxis-read, edit-praxis, feed frame, and backdrop all render UA as the gilt salon on
`--ua-*` tokens. `UAComment` was the last surface still on the pre-rebrand orange letterhead, so in
a mixed thread the UA bubble read as the old look while the rest of the app was the salon.

This is exactly the **"separate follow-up"** ADR-0018 anticipated.

## Decision

- **Reskin `UAComment` to the gilt salon on `--ua-*` tokens only** — a `--ua-gilt` museum frame
  around a `--ua-paper` plate, `--ua-ink` text, `--ua-gold` rule, `--ua-orange` accent (eyebrow /
  mentions / composer button), timestamps in `--ua-sub`. Zero hex. Mirrors `UaFeedFrame` /
  `UAPraxisDetail` and the design's `FactionCommentBox` UA archetype.
- **Only ADR-0018's UA-palette / "rebrand out of scope" / inline-hex decision is reversed.**
  Everything else in ADR-0018 stands: the task-card fidelity bar, the seven archetypes (incl.
  Albescent), timestamp dialects, single-voice composer, mentions-as-plain-text, and
  `FactionAvatar` composition (ADR-0006). The invariant slots (author · body · timestamp+edited)
  and both read + composer modes are unchanged.

## Consequences

- UA reads consistently as the gilt salon across every surface, including mixed comment threads.
- Residual hardcoded hex remains in `WowComment` (3), `EphemeristsComment` (1), and
  `SingularityComment` (1) — a low-priority `var(--*)` sweep, out of scope here.
  `AlbescentComment`'s hex rolls into the `albescent → ua` alias removal (#232).

---

## Amendment — the marginal note (2026-07-20)

**Relates to:** #788 (UA identity redesign), #850 (copy deck), #851 (UA desktop
archetypes), `.design-sync/BRIEF-ua-identity.md` §6

The UA identity redesign retires the gilt salon entirely — UA becomes a quiet,
minimal, sun-bleached **practice** with a real dark mode, and **no gold
anywhere** (gold moved to Warriors of Whimsy). The `--ua-gilt` / `--ua-gold`
family this ADR named is being deleted, not migrated. Leaving this ADR
unamended would have it prescribing a museum frame in a colour the app no
longer declares.

### What changes

The UA comment surface is **the marginal note**: a quiet note written in the
margin of the work.

- **rag paper** ground,
- **one dashed orange rule**,
- **an ensō dot**,
- **no ornament, and no gold** — no museum frame, no gilt rule.

### What does not change

- The **invariant slots** stay exactly as [ADR-0016](0016-per-faction-surfaces-share-one-data-contract.md)
  fixes them: author · body · timestamp+edited. Both read and composer modes
  survive. A faction archetype owns presentation only; it cannot change what
  data the surface receives or which slots it fills.
- **Faction dispatch** is unchanged: the **posted row takes the *author's*
  faction**, and the **composer takes the *current character's***.
- Everything ADR-0026 kept from [ADR-0018](0018-comment-voice-reuses-task-card-atoms.md)
  still holds — the seven archetypes, timestamp dialects, single-voice composer,
  mentions-as-plain-text, `FactionAvatar` composition, and zero hex (the note is
  built from `--faction-ua-*` tokens, not literals).

### Why amend rather than supersede

The *reason* ADR-0026 exists — the UA comment must not be the one surface still
wearing a stale identity while every other UA surface has moved on — is precisely
what the redesign re-asserts. Only the identity being adopted has changed. Cutting
the ADR would delete that reasoning; replacing the salon in place keeps it.
