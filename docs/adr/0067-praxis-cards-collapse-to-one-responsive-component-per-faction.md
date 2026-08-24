# ADR-0067 — Praxis cards collapse to one responsive component per faction

**Status:** Amended by ADR-0069
**Date:** 2026-07-30

**Relates to:** ADR-0056 (the same move for task cards), ADR-0035 (the split this
supersedes for one more surface)
**Supersedes ADR-0035 for praxis cards** — ADR-0035 stands for every other mobile
surface; only the praxis-card surface is unified here.
**Superseded in part by ADR-0069** — the Consequences section below names the
profile and the duel seal as keeping their distinct mobile archetypes. Both were
collapsed on 2026-07-30. The reasoning here stands as written; only that
inventory has moved on.

## Context

Mobile praxis cards lived on a `mobilePraxisCard` manifest surface: a dispatcher
(`praxisCard/mobile/MobilePraxisCard.tsx`), nine bespoke mobile cards, and a
556-line `mobile/shared.tsx` slot library, all distinct from the desktop
`praxisCard` surface's nine files and their own slot library. ADR-0035
established that split deliberately.

The two libraries drew the same anatomy from the same fields. Byline, task
reference, title, excerpt, roster, mode chip, media gallery, voted-by marker and
vote footer each existed twice, and the pairs had already drifted into agreeing:
`MobileVoteFooter` and `PraxisVoteFooter` were the same `VoteUI` call with the
same `points`-suppression comment above them; `MobileModeChip` and
`PraxisModeChip` both branched on `isDuelPraxis`; both bodies composed the same
`ScoreStamp` and the same `MetaTaskSeal` in the same position. Three test files
carried mobile cases that asserted, against the second implementation, exactly
what their desktop case asserted against the first.

The mobile card was also a strict SUBSET: it had no admin overlay, no
`PraxisStats` meta line, no footnote and no vote rule. A phone showed less, not
something different.

ADR-0056 had already run this experiment on the task card and the owner's QA
verdict accepted the unified card. The owner ran the same test here — across task
cards, praxis cards, the task and praxis pages, comments, updates and the
edit-praxis composer — and ruled that the separate components are not needed.

## Decision

Retire the `mobilePraxisCard` surface. Each faction's praxis card is ONE
responsive component, under `components/praxisCard/desktop/`. The mobile praxis
feed renders the shared `<PraxisCard>` — the same dispatcher the desktop feed
renders.

Deleted: the dispatcher, all nine mobile cards, `mobile/shared.tsx`, the manifest
field, its `SURFACE_KEYS` entry and all eight faction registrations. There is no
dormant revert path in the tree — the same choice ADR-0056 made after its
experiment succeeded, and for the same reason: a second implementation kept
"just in case" is the drift this record exists to prevent.

## The geometry, and why the container changed

`frameBase` carries the card's width as `flex: 1 1 394px` with `minWidth: 280`.
On a 375px viewport that resolves to exactly one full-width card per row, and to
a grid on anything wider — the card was already responsive; nothing about it
needed rewriting. This is why no per-form-factor size set was required, unlike
ADR-0056, where the task card's conic ring and numerals genuinely had to shrink.

What did change is the mobile feed's list container. It stacked its cards in a
`flex-direction: column`, which is the one arrangement the shared frame cannot
take: on a column axis `flex-basis` sizes the card's HEIGHT, so a 394px basis
would have become a 394px-tall floor under every card. The list is now the same
wrapping flex row the desktop feed uses, which produces the identical
single-column stack on a phone by letting the basis do its job.

## What a phone gains

The mobile card's absences were not a design position, they were unbuilt work.
Rendering the shared card on a phone adds the admin overlay, the `PraxisStats`
meta line, per-archetype footnotes and vote rules — the same pattern ADR-0056
recorded, where the unified task card carried capabilities the mobile-only cards
never had.

## Consequences

- A faction's praxis card is one file. Adding or changing one is a single
  archetype under `components/praxisCard/desktop/`, not two files in two trees
  with two slot libraries.
- The `mobilePraxisCard` surface no longer exists. `SURFACE_KEYS` no longer
  advertises a surface nothing dispatches, and a faction cannot register against
  it.
- `MobilePraxisFeed.tsx` SURVIVES. The phone's page chrome — the stacked header,
  the full-width search, the sigil row, the chip rows — is genuinely different
  from the desktop filter bar, and this record says nothing about it. Only the
  cards inside it changed. The same shape as ADR-0056, which kept `DefaultTasks`
  and rewired it onto the shared `<TaskCard>`.
- `surfaceDispatch.test.ts`'s per-slug registration row moved from
  `mobilePraxisCard` to `praxisCard` rather than being deleted: the same eight
  slugs, now proving dispatch on the only card surface left.
- ADR-0035's reasoning still governs every OTHER mobile surface — field desk,
  faction page, profile and the duel seal keep their distinct mobile archetypes
  and their `mobile*` surfaces. **The unification licence granted here is scoped
  to praxis cards and does not generalise.** Unifying another surface needs its
  own record, the same way ADR-0056, ADR-0058, ADR-0065 and this one each did.
- The evaluation window is closed. A second praxis-card implementation
  reappearing is drift, not an experiment.
