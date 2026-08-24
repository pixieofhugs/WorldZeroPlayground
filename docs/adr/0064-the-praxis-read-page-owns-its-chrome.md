# ADR-0064 — The praxis read page owns its chrome (duel + comments become layout slots)

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1085 (epic), #1126 (this ADR's issue), #1088 (comments moved
into the archetype), #1090 (the duel rail replaced by the aside card)
**Depends on:** ADR-0059 (submitting a collab or duel part holds the
composer) — the run-up narration this ADR drops from detail only has
somewhere to land because ADR-0059 already built the composer's waiting
surface
**Amends:** ADR-0006 (comments are neutral chrome below every archetype) —
comments become a layout region the archetype mounts, not chrome the
dispatcher appends

## Context

Two blocks used to be mounted by the dispatcher, outside the faction
archetype, in `PraxisDetail.tsx`:

- **The duel rail** — `DuelCrossLink`, above the archetype. Introduced by
  #313 and grown to a full rail by #718, on the grilled #310 decision that it
  is *"a mechanism, not a per-faction identity statement"*: one shared
  faction-tokened component dropped above every archetype, inheriting the
  **opponent's** tokens so the foreign element looked foreign.
- **The comment thread** — `CommentThread`, below the archetype at
  `max-w-2xl`.

Both predated the page having a layout worth speaking of. The v2 designs gave
it one: a three-region grid — main column, 330px aside, comments spanning
both — and all eight place the duel panel **in the aside** and the comments
**inside the grid**. A `max-w-2xl` thread hanging under a 1240px two-column
page was precisely what the redesign fixed.

Two objections from #718 no longer applied. It had declined the design's
two-pane duel workspace because *"no praxis-detail surface has a two-column
layout and mobile forbids one outright"* — this design introduced the two
columns, and stacks them on mobile. And it had kept the full lifecycle rail
because the read page was the only home for the duel's run-up; ADR-0059
moved that to the composer.

## Decision

**The praxis read page owns its chrome. The duel panel and the comment
thread are slots in the archetype's layout, not dispatcher mounts.**

- `PraxisDetail.tsx` no longer mounts `DuelCrossLink` or `CommentThread`.
  `DefaultPraxisDetail` renders both, in its own regions (#1088, #1090); the
  dispatcher's own header comment now spells out that nothing is mounted
  around the archetype any more.
- The layout contract every faction skin inherits therefore has two required
  slots: **duel** (aside) and **comments** (full width, beneath both
  columns) — the latter via the shared `PraxisDetailComments`
  (`pages/praxisDetail/shared.tsx`), which carries the `visible` gate so a
  skin cannot forget it.
- `DuelCrossLink` and the twelve `*DuelRail` components are **deleted**
  (#1090; confirmed on disk — no `*DuelRail` component remains, only
  comments citing the retirement). The read page's duel panel is now
  `DuelCard` (`pages/praxisDetail/DuelCard.tsx`), the compact card the
  designs drew: one label, two rows, one footer verdict line, with three
  readings and no card at all on one status:
  - **live** (`settled`) — the leader-by-margin sentence, phrased so the
    winner still floats with the votes until era close (ADR-0011/0052);
    nothing here may read as decided.
  - **won by default** (`forfeited_by_character_id` set) — the forfeiter's
    row dims to an em-dash; their total is *absent*, not losing, because the
    tally stops deciding the duel once a side forfeits.
  - **final** (`resolved`) — the frozen pair, or the no-contest line where
    the duel never became votable before era close.
  - **`declined`** draws nothing — the duel link dropped and the praxis is
    an ordinary `type=solo` praxis (ADR-0011), so there is no duel to read
    out. **`pending` / `active`** also draw nothing here; the run-up is
    reachable only through the composer's waiting surface (ADR-0059), which
    is why that ADR is listed as a dependency above rather than a sibling.
- `CommentThread` is rendered by the archetype with `showHeading={false}`;
  the layout draws the section header in the faction's own voice. The
  thread's own prop docstring already warned against two headings for one
  list.
- **Comment rows are unaffected.** They dispatch on
  `comment.author.faction_slug`, not the page's, and keep their own skins
  (ADR-0061).

## Consequences

- A faction that has not authored a praxis-detail skin still gets both
  slots, because it falls through to `Default*` — partial registration stays
  the normal case (the same zero-registration state ADR-0063 records for
  `praxisDetail` itself).
- The run-up states the rail used to narrate (`pending`, `active`, next-step
  line, stakes tiles, cast roster) have exactly one home: the composer's
  waiting surface (ADR-0059). Nothing renders them twice.
- `components/duel/shared.tsx` lost its rail consumer — the per-`DuelStatus`
  `NextStepLine` — but **keeps** the duel seal and forfeit confirms
  (`SealActions`, `useDuelSealCopy`, and the twelve `*DuelSealConfirm.tsx` /
  `*MobileDuelSealConfirm.tsx` skins), verified present on disk before
  anything in that file was touched.
- Retires the #310 "chrome above the archetype" mechanism for this surface
  only. Other dispatcher-mounted chrome is untouched.

## Alternative rejected

**Keep both mounted outside and drop the design's placement.** Cheaper —
nothing to build, and seven future designs would inherit the rail free.
Rejected because it leaves a full-width duel band above a two-column page
and a narrow comment thread below it, and because the rail's remaining job
after ADR-0059 was one state, which the card covers in a third of the
space.
