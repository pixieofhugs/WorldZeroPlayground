# ADR-0076 — A base-only score reads as a bare total

**Status:** Accepted
**Date:** 2026-08-15

**Supersedes:** the **votes row** clause of **ADR-0047** — and only that clause.
**Relates to:** ADR-0047 (the conditional score stamp), ADR-0049 (the logic /
presentation seam that gives all nine skins one selector), ADR-0053
(`scoreBreakdown` as the only resolver), #1131 (the base row's own suppression),
#1826 (this ADR), #1829 (the implementation)

## Context

ADR-0047 states the score stamp's row policy as one rule: **a row exists when it
tells the viewer something the total mark does not already say.** Four of the
five rows obey it — base is hidden when it would only restate the total (#1131),
the multiplier is hidden at ×1.0, metatask at 0, and the habit bonus at 0
(#1617).

The votes row was made the deliberate exception. ADR-0047 records the reasoning,
re-affirmed on 2026-07-20 against a design that drops the line at zero:

> an absent row cannot say "nobody has voted yet", and that is information the
> card owes the viewer.

That is a real argument and it should be read at full strength before it is
overturned. A missing row is genuinely ambiguous: silence could mean "nobody has
voted yet" or "this surface does not show votes at all", whereas `+ 0 from votes`
can only mean the first. The owner was offered "hide base *and* `+0 from votes`"
at #1131 and declined the second half on exactly those grounds, which is why the
empty state has been the total mark plus a zero tally ever since.

Two things have since made that call look worse than it read on paper.

The first is that the empty state is the **commonest state on the site**. A
freshly submitted praxis, before anyone votes, under `era_1`'s neutral ×1.0, is
base-only — so the sheet that ADR-0047 keeps honest is mostly a sheet whose only
line of working is a zero. It is also what the composer's waiting surface shows
the moment you submit, where a praxis is base-only *by definition* and voting has
not opened yet.

The second is that the codebase already argues both sides internally.
`SingularityScoreStamp` prints `VOTES +00` and then, eight lines later, refuses
to print `+00` for the habit row because *"the read-out omits a register the era
never wrote to rather than printing `+00`"*. Two neighbouring rows, opposite
rules, the same zero.

## Decision

**A score readout with no votes shows the total alone. With votes it shows base,
votes and total.**

Concretely, in `scoreBreakdown` terms: `votes` becomes `number | null`, null at
zero, exactly like `mult`, `meta` and `habit` already are. Nothing else about row
selection changes. Because `votes > 0` is one of the terms that breaks
`baseRestatesTotal`, the two halves of the ruling fall out of the one change:

| state | reads |
|---|---|
| base only | the total mark and its unit caption, nothing else |
| base + votes | `Base 12` / `+ 4 from votes` / `16.0` |
| base + metatask, no votes | `Base 12` / `Metatask +5` / `17.0` |

The third row is not an oversight. A metatask un-suppresses the base row because
the total no longer restates it, and the votes term stays absent because there
are no votes — owner-ruled correct.

### Scope

**This ADR governs the votes row inside a score readout and nothing else.** It is
not a general "one figure, said once per surface" principle and must not be cited
as one. In particular it does not touch:

- the `base` / `mult` / `meta` / `habit` half of the policy, which already
  suppresses at its neutral values and is correct;
- task cards or task detail, which reach the same shape through a second,
  independent gate (`isNeutralMultiplier`, `showWorthBreakdown`) and are not
  consumers of `scoreBreakdown`;
- a base figure printed *outside* the stamp, which is #1131's territory, not this
  ADR's.

### Where the rule lives

In `scoreBreakdown(praxis)` and nowhere else — ADR-0049 and ADR-0053 already make
that the single row-selection authority for all nine skins, and this change is a
fifth null in a function that already returns four. Each skin decides only what a
row looks like, and now gates the votes line the same way it already gates its
multiplier chip.

## Consequences

- The most-mounted state of the stamp loses its only line of working, so **the
  separating rule each skin draws between the working and the total mark must go
  with it** — a braid, hairline, perforation or bordered plate with nothing above
  it is worse than the row it replaced. Every skin gates its rule on whether any
  working line survives; `base !== null` is that predicate, since a null base
  coincides with every other term being absent.
- The ambiguity ADR-0047 named is accepted, not solved. A viewer who wants to
  know whether anyone voted reads the vote UI, which is on every one of these
  surfaces and states it directly.
- Five load-bearing code comments arguing the ADR-0047 position are deleted and
  replaced by a pointer here (`scoreBreakdown.ts`, `DefaultScoreStamp`,
  `UaScoreStamp`, `EphemeristsScoreStamp`, `SingularityScoreStamp`). Leaving them
  standing is how the line gets reinstated by a future reader.
- The design's own `SCORE STAMP · CONDITIONAL STATES` section drew the votes row
  hidden at zero. The deviation ADR-0047 declared against it is withdrawn; the
  skins now match the sheets they were built from.
