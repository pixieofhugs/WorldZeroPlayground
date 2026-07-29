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

*(Narrowed by the Amendment below, 2026-07-28: "and no copy" now binds only
the page's moderation and system chrome. Content slots carry the skin's
voice. Everything else in this Decision stands unchanged.)*

- A single neutral `detail.*` block; every archetype reads the same keys.
  Where a design's word differs from the domain noun in `CONTEXT.md`, the
  domain noun wins.
- The layout is the contract: main column + aside + comments region,
  collapsing to one stacked column on mobile.
- **The neutral rule covers the page's own slots and stops at the speaker's
  voice.** Comment rows dispatch on `comment.author.faction_slug`, not the
  page's — a Snide player's comment reads Snide on a Coven praxis.
  `comments.<faction>.*` and the seven `*Comment` skins are **out of scope**
  and must not be swept later by inference from this ADR.

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
  *(Narrowed 2026-07-28 — see the Amendment. A skin may introduce copy in the
  page's content slots; it still cannot touch the chrome.)*
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

## Amendment (2026-07-28) — voice returns to the content slots; chrome stays neutral

Raised by the seven skin issues (#1117–#1123), each of which specifies its
faction's words for the same six or so slots. This amendment is additive:
nothing above is deleted, and the two statements it narrows carry a dated
pointer to here.

### The rule

**Content slots carry the skin's voice. Moderation and system chrome do
not.**

- **Voiced** — the page's content slots: the body/write-up heading, the media
  or proof heading, the crew/members heading, the metatasks heading, the duel
  heading, the comments heading, the post button, and the vote/voters labels.
  A skin registers its own block for these.
- **Neutral, shared, unchanged** — the **report/flag card**, the **steward
  bar**, the **moderation banners** (crown, flagged, failed) and the
  **errors**. In the catalog these are `detail.flag.*`, `detail.admin.*`,
  `detail.banners.*` and `detail.errors.*`: one set of words, read by every
  skin, in every faction's dress. All eight faction designs draw them this
  way — the report card is deliberately outside the costume, with its own
  neutral token set.

### What this narrows

Only the blanket "no copy". The Decision's "a faction skin brings dress and no
copy" and the Consequence "a future faction skin cannot introduce copy on this
surface" now apply to **system chrome alone**. The layout contract, the single
shared API contract, and the comments boundary are untouched.

### Why — and what the original argument keeps

The rejected alternative above ("Voice returns with each design") was rejected
because free copy re-grows the deleted catalog and because per-design
"neutral" wording fragments. **That argument is not overturned; it is where
the line is now drawn.** It is exactly true of chrome, and chrome is where it
matters most: a report card, a steward action or a failure notice is the
*platform* speaking, and it has to read identically everywhere or it stops
reading as the system at all. Fragmenting those words costs trust, not
flavour.

What the amendment accepts instead is the rejected alternative's *premise*,
limited to content: a praxis is somebody's account of a thing they did, so
naming that account is the faction's line to speak. This is the same boundary
this ADR already drew for comment rows — **the neutral rule stops at the
speaker's voice** — applied one step out. A comment row is the author
speaking; a content slot is the faction's page speaking about a member's
work; the chrome is the platform speaking. One question ("whose voice is
this?"), three consistent answers.

The cost is taken knowingly: the near-synonym body and media headings this
ADR's Context complains about will re-grow, this time as a deliberate,
designed set rather than accreted drift. That set is the deliverable of
#1117–#1123, not a side effect.

### Relations, restated

- **ADR-0057** (task detail carries no faction voice) is still extended, but
  now only for chrome. The two surfaces legitimately differ: a task is the
  system's posted assignment, a praxis is a member's account of doing it.
- **The comments boundary is unchanged and still out of scope.** Rows
  dispatch on `comment.author.faction_slug`; `comments.<faction>.*` and the
  seven `*Comment` skins are not touched by this amendment any more than they
  were by the original Decision, and must not be swept by inference from
  either.
