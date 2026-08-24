# ADR-0061 — Praxis detail is one shared page; every faction dresses it

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1085 (epic), #1087 (ADR-0062, the sibling behaviour change)
**Extends:** ADR-0057 (task detail pages carry no faction voice) — same doctrine,
a second surface
**Tension with:** ADR-0016 (per-faction surfaces share one data contract;
archetypes own only presentation) — gains a second per-surface exception
**Amends:** ADR-0006 (comments are neutral chrome below every archetype) — on
this surface the thread is a layout region the archetype mounts, not chrome the
dispatcher appends; see "Comments are the third region" below

## Context

Praxis detail today ships bespoke skins for the `CORE_SIX` factions (coven,
snide, ephemerists, singularity, everymen, ua) plus a mobile-only bespoke skin
for wow; together with the shared Default (na / Unaffiliated) skin that is
seven factions already carrying their own praxis-detail vocabulary.
Albescent is frozen as a wrapper over Default (ADR-0046/0048), not a skin of
its own, so it does not add an eighth.

Each of those seven invented its own words for identical slots. In
`frontend/src/locales/en/praxis.json` the body-content heading alone is six
near-synonym keys naming one slot — `theAccount` (default, ephemerists) /
`theWork` (everymen) / `whatIDid` (coven) / `theConfession` (snide) /
`processLog` (singularity) / `theProcess` (ua) — and the media/evidence
heading repeats the pattern: `evidence` (ephemerists, snide) / `proofOfWork`
(everymen) / `keepsakes` (coven) / `artifacts` (singularity) / `thePlate`
(ua). Twelve near-synonym keys for two slots that read identically on every
skin.

The Unaffiliated redesign (project `bebdf7c7-6a54-42ea-b3b4-6d908a506f84`) is
the first of these seven to rebuild; the other six are committed to its
layout and API contract (epic #1085).

## Decision

**Praxis detail is one shared page. A faction skin brings dress and no
copy.**

- A single neutral `detail.*` block; every archetype reads the same keys.
  Where a design's word differs from the domain noun in `CONTEXT.md`, the
  domain noun wins.
- The layout is the contract: main column + aside + comments region,
  collapsing to one stacked column on mobile.
- **The neutral rule covers the page's own slots and stops at the speaker's
  voice and the vote's vocabulary.** Comment rows dispatch on
  `comment.author.faction_slug`, not the page's — a Snide player's comment
  reads Snide on a Coven praxis. `comments.<faction>.*` and the seven
  `*Comment` skins are **out of scope** and must not be swept later by
  inference from this ADR.
- The same test applies to vote tiers. `frontend/src/components/vote/voteReframes.ts`
  defines a per-faction `VoteReframe` — Ephemerists' `apocryphal → canonical`,
  rendered in roman numerals, the Everymen's `Fair → Legendary`, and five
  more archetypes' own ladders — and a reframe is the **vote surface's**
  vocabulary, not the page's: the same "whose voice is this?" test the
  comment carve-out passes. A bare numeral tells the reader strictly less
  than the tier word does, so flattening one to the other would be a loss of
  meaning, not a gain in consistency. `voteReframes.ts` and the
  `votes:<faction>.*` labels it resolves are **out of scope** and must not
  be swept later by inference from this ADR. (This is a clarification of
  the standing neutral rule, not a reopening of the amendment below — that
  amendment proposed voice on content slots; this documents a boundary that
  was always meant to sit outside the neutral rule, the way comments always
  did.)

### Comments are the third region (amending ADR-0006)

ADR-0006 called the comment thread "neutral chrome below every archetype", and
`PraxisDetail.tsx` mounted it there, outside whatever the archetype drew. The
layout contract above makes comments a **region of the page**, beneath the main
column and the aside and inside the page's own surface — so the **archetype**
mounts the thread and the **layout** draws its section head, passing
`showHeading={false}` so one list carries one heading (the #1029 trap).

Nothing about ADR-0006's substance changes: the thread is still neutral, still
never blanket-themed, still gated to a `visible` praxis. Only its mount point
moves, and the gate moves with it — into the shared `PraxisDetailComments`
slot — so a faction skin cannot forget it. This is the same move task detail
made in #1030.

## Consequences

- A praxis page reads identically across all nine factions and differs only
  in dress.
- The per-faction `detail.<faction>.*` blocks are deleted as each archetype
  goes.
- A future faction skin cannot introduce copy on this surface, only dress.
- Extends ADR-0057's doctrine to a second surface. ADR-0016's
  presentation/voice boundary now carries two per-surface exceptions.

## Alternative rejected

**Voice returns with each design.** Argued seriously at grill: a praxis is
somebody's account of a thing they did, and "The Confession" over a Snide
write-up does more work than a task page's labels ever did. Rejected because
the seven designs are already locked to one layout and one contract —
leaving copy free re-grows the catalog being deleted, and the nine
task-detail designs proved that per-design "neutral" wording fragments even
when nobody intends voice.

## Amendment (2026-07-28) — written, then withdrawn the same day

An amendment titled *"voice returns to the content slots; chrome stays
neutral"* was written into this ADR on 2026-07-28 and **withdrawn the same
day by owner ruling**, before any voiced pass shipped. It is recorded here
rather than silently deleted so the record stays honest.

**What it said.** Raised by the eight skin issues (#1117–#1123, #1140), each
of which specifies its faction's words for the same six or so slots: content
slots (write-up, proof, members, metatasks, duel, comments, vote, voters)
would carry the skin's voice, while the report card, steward bar, moderation
banners and errors stayed neutral and shared.

**Why it was withdrawn.** The amendment conceded its own cost in writing —
that the near-synonym headings this ADR's Context enumerates would re-grow,
"this time as a deliberate, designed set rather than accreted drift". The
owner ruled that the Alternative rejected above stays rejected: a designed
set of near-synonyms is still the catalog this ADR exists to delete. The
Decision and Consequences above are restored to their unnarrowed wording.

### The standing rule

**One shared neutral `detail.*` block. A faction skin brings dress and no
copy — frame, type, ornament, motion.** No `detail.<faction>.*` block on this
surface, for any faction, including the eight skins built under epic #1085.

### What is kept

The per-faction vocabularies are **recorded, not built**. Each skin issue
(#1117–#1123, #1140) keeps its faction's words verbatim under its *Voice*
heading, so a later voiced pass — should one ever be ruled — has the words
already, without re-deriving them from the designs.

### The correction that followed

The ruling landed as a comment on each skin issue after four skins had
already merged against the withdrawn amendment: `detail.coven.*` (#1152),
`detail.ephemerists.*` (#1156), `detail.snide.*` (#1159) and `detail.wow.*`
(#1160). Those four blocks were deleted and their archetypes repointed to the
shared neutral keys; no neutral key needed adding, because every voiced slot
already had a neutral twin that `DefaultPraxisDetail` reads. Albescent,
Singularity and Everymen were built neutral and were untouched.

### Relations, restated

- **ADR-0057** (task detail carries no faction voice) is extended without
  qualification: both surfaces carry neutral copy and faction dress.
- **The comments boundary is unchanged and still out of scope.** Rows
  dispatch on `comment.author.faction_slug`; `comments.<faction>.*` and the
  seven `*Comment` skins are not touched by this ADR, by the withdrawn
  amendment, or by the correction that undid it, and must not be swept by
  inference from any of the three.
- **The vote-tier boundary is the same shape and out of scope for the same
  reason.** `voteReframes.ts` and the `votes:<faction>.*` labels it resolves
  are not touched by this ADR, by the withdrawn amendment, or by the
  correction that undid it, and must not be swept by inference from any of
  the three.
