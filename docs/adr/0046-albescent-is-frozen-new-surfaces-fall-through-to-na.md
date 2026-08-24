# ADR-0046 — Albescent is frozen: new surfaces fall through to NA

**Status:** Reversed
**Date:** 2026-07-18

**Relates to:** #726 (the duel skin this decision parks), #718 (the duel-skin
epic whose per-faction issues this halts one of), ADR-0027 + #390 (Albescent as
an invite-gated secret society), #232 (albescent went first-class and dropped
its `ua` alias), ADR-0039 (what the `na`/default identity actually is)

## Context

Albescent is one of seven factions and, like the others, has accumulated a
bespoke skin on roughly eighteen dispatched surfaces — task card, praxis card
(desktop + mobile), praxis detail, task detail, composer, feed frame, comment
voice, vote UI, avatar, sigil, backdrop, faction hero, faction body, faction
page, profile body, field desk home, select card, credential card.

Every dispatched surface in this codebase is a registry row plus a component
(`FACTION_*_BY_SLUG` / `MOBILE_*_BY_SLUG`, resolved through `pickVariant`). The
registry is a **partial** map by construction: an unregistered slug falls
through to the `Default*` skin, which reads the `--faction-default-*` token set
— the unaffiliated/NA identity (ADR-0039). That fallthrough is not an error
path. It is the designed behaviour, exercised on every surface by `na` itself
and by any faction not yet skinned for a given surface.

Albescent's visual direction is under reconsideration. Continuing to add skins
to a faction whose look is about to change means building work with a known,
short half-life: the duel epic (#718) alone would add four more files, and every
future dispatched surface would add two to four more after that.

The forces:

1. **A half-skinned faction is not a broken faction.** Because the registry is
   partial and the fallthrough is designed, a surface with no Albescent row
   renders correctly — in NA chrome — rather than rendering wrong or crashing.
   The cost of *not* skinning is cosmetic inconsistency, not defect.
2. **Skins are the cheapest thing in the system to defer and the most expensive
   thing to build speculatively.** They carry no logic (see the duel-skin
   contract: slots arrive as already-rendered nodes), so deferring one forfeits
   no correctness — while building one against a look that is about to change
   forfeits the whole file.
3. **Ripping out what already ships is a different, costlier decision.** The
   eighteen existing surfaces work, are already paid for, and are visible to
   players today. Deleting ~20 registry rows would change the live site
   immediately and have to be undone in full when the reskin lands.

## Decision

> **Reversed (2026-07-28).** The hold was conditional on Albescent's visual
> direction being unsettled. That direction landed with the praxis-detail v2
> designs (project `bebdf7c7-6a54-42ea-b3b4-6d908a506f84`), so the freeze no
> longer applies. Albescent registers surfaces like any other faction. See
> #1085.
>
> **One consequence recorded here:** #726 (Albescent duel rail skins, closed
> `wontfix`) **stays closed.** It targeted the duel rail, and ADR-0064 deletes
> all twelve rails — the surface it would have skinned no longer exists. It
> was closed for the freeze; it stays closed for a better reason.

**Albescent is frozen. No new Albescent skins until further notice.**

1. **New dispatched surfaces register nothing for `albescent`.** They ship
   whatever faction skins the surface needs, omit the `albescent:` row, and let
   the existing fallthrough render the `Default`/NA skin. This requires no new
   mechanism — it is the absence of a line.
2. **Existing Albescent skins stay exactly as they are.** They are neither
   deleted nor extended. Bug fixes and site-wide sweeps (token migrations,
   contrast passes, the fontSize/spacing ratchets) still touch them like any
   other file; that is maintenance, not new Albescent work.
3. **No `albescent → na` alias is added.** The faction keeps its own slug,
   tokens and identity. This is a *registration* freeze, not an identity
   merge — the distinction #232 spent a whole issue establishing, and reversing
   it here would cost that work again.
4. **Design work is paused too.** Albescent mockups are not commissioned. Any
   that exist (`AlbescentDuel.dc.html` in the duel design project) are kept as
   reference for the eventual reskin, not as a build target.

**Until further notice** is literal: this ADR is expected to be superseded by a
reskin, not to stand permanently. Lifting it means writing the new look and then
adding registry rows — no code is structured around the freeze, so there is
nothing to unwind.

## Consequences

- **#726 (Albescent duel skins) is parked**, not built. Albescent duels render
  through the Default rail and seal dialog: right branches, right numbers, right
  forfeit warning, NA chrome. The other six faction duel skins proceed.
- **Albescent looks inconsistent, on purpose, and increasingly so.** Its older
  surfaces carry bespoke chrome while anything new is NA. That visual seam is the
  accepted cost, and it is the signal for how much a reskin has to cover.
- **The freeze is free to lift.** Nothing branches on it, no flag encodes it, no
  component was deleted. Lifting it is: draw the look, add the rows.
- **Anyone picking up an Albescent-shaped issue should stop and cite this ADR**
  rather than building. If a new surface's issue lists seven faction skins,
  six is complete.

## Alternatives considered

**Strip the ~20 existing registry rows so Albescent renders as NA today.**
Rejected as too costly for the benefit: it changes the live site immediately,
orphans ~15 component files, and has to be reverted wholesale when the reskin
lands. The inconsistency it removes is cosmetic; the churn it creates is real.
Worth revisiting only if the reskin turns out to be a ground-up rebuild rather
than a restyle.

**Alias `albescent → na` in `CSS_KEY` / the registries.** Rejected. It reaches
the same pixels but does so by dissolving the faction's identity into the
blank-slate state — re-creating exactly the alias problem #232 removed, and
conflating "has no faction" with "has a faction we haven't drawn". `na` means
*unaffiliated*; Albescent players are affiliated.

**Build #726 anyway since the mock exists.** Rejected. The mock is a derived
guess, not a commissioned design (it says so on its face), and the reskin is the
reason the freeze exists. Four files with a known short half-life is precisely
what this ADR is declining to spend.
