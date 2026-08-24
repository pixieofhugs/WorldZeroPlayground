# ADR-0068 — Taunts are a subscription the recipient's foe edge creates

**Status:** Accepted
**Date:** 2026-07-30

**Relates to:** ADR-0031 (backend emits keys; the catalog owns taunt wording),
ADR-0077 (a block is its own record — superseding ADR-0009, which this ADR was
written against), the 2026-07-30 architecture audit
(which found the taunt write path had never been wired)
**Builds on:** the one-way **relationship edge** model (CONTEXT.md) — a foe
declaration is directional and instant, with no acceptance handshake

## Context

The taunt feature shipped its entire read side — the `taunt_message` table, the
`foe_taunt` feed source, the per-faction copy catalog, deterministic variant
selection, feed rendering across every chassis — and no write path. Nothing has
ever called `generate_taunt`; the table has been empty since it was created.
Wiring the write path forces the question the read side never had to answer:
**when does a taunt fire, and whose declaration makes someone a valid target?**

Foe edges are one-way. If A declares B a foe, three delivery rules were
possible: the achiever needles everyone *they* declared (sender-driven), the
achievement reaches everyone who declared *the achiever* (recipient-driven), or
some mutual/either-direction blend.

## Decision

**Declaring a foe subscribes you to that rival's taunts.** A taunt from sender
S reaches recipient R only when R holds an **active foe edge → S**. A block
between the pair silences it in both directions (ADR-0077; ADR-0009 while the
block still rides on the edge, where either blocked edge is what wins). Era transitions
and admin recalculations are silent: taunts arise only from organic play.

Three triggers, each hooked where the fact it reports is produced:

1. **`score_overtake` — the lead flips.** Detected at score recalculation by
   comparing the pair's ordering before and after: whenever the lead in a foe
   pair flips, the new leader taunts the character who fell behind. Passive
   flips count — if your score drops and a rival is now ahead, the scoreboard
   fact is true regardless of who moved. The rule is self-deduplicating: the
   same pair cannot fire again until the lead flips back.
2. **`level_up` — any level increase** in an organic recalc. No high-water
   mark: a character who dips below a boundary and re-crosses it did level up
   again. If oscillation ever proves spammy, add the mark then.
3. **`praxis_complete` — every transition into `submitted`**, one taunt per
   praxis member (collab members each reach their own subscribers; duels fall
   out the same way). Resubmission after an unsubmit fires again — accepted, to
   avoid adding a praxis reference to the taunt row solely for dedup.

The **activity feed is the only delivery surface**. The consumer-less
standalone `GET /taunts` route, its service query, and the unused frontend
client are deleted with this wiring. Taunt rows survive era reset (they are
era-neutral history and simply age out of the feed).

## Consequences

- **Spam control is structural, not throttled.** Your feed only needles you
  about rivals you chose; dropping the foe edge unsubscribes you. No rate
  limits, caps, or cooldowns are needed at current scale.
- The sender never opts in and never sees the taunt — being achieved *at* is
  not an event for the achiever. This is deliberate: a taunt is the
  recipient's rivalry talking, voiced by the sender's faction.
- A sender-driven variant ("needle everyone I declared") was rejected because
  recipients never consented and foe-declaration would become a broadcast
  tool; mutual-only was rejected because it makes taunts nearly extinct.
- The overtake hook must check **both directions** on a recalc of X: X rising
  past characters who subscribed to X, and X falling behind characters X
  subscribed to (where the other party is the sender).
- After an era reset everyone is tied at zero, so the first organic scores
  produce a small volley of first-lead taunts among rivals. Accepted — an era
  opening with your rival striking first is the feature working.
