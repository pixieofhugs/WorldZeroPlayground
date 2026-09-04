# ADR-0092 — The side-by-side duel reader is one responsive component per faction

**Status:** Accepted
**Date:** 2026-09-04

**Relates to:** ADR-0056 (task cards), ADR-0058 (task detail), ADR-0061 / ADR-0063
(praxis detail), ADR-0065 (the composer), ADR-0067 (praxis cards), ADR-0069 (the
character profile and the duel seal), ADR-0078 (faction detail) — the same shape,
surface by surface. **ADR-0035 remains the counter-example** and is not touched.
**ADR-0089** is why an archetype that passes nothing still wears its faction.
**ADR-0011 / ADR-0052** are why this page shows a standing rather than a verdict.
**ADR-0088** is the redaction hazard it had to answer.

Issue: #1084 (part of #1071). Design:
`Duel Side-by-Side Reader.dc.html`, turn 2, vendored at `.design-sync/duel-1084/`
for the life of the epic and deleted by this issue's PR.

## Context

Reading a settled duel meant two page loads. Each side is its own praxis with its
own detail page, joined by a link, so comparing the two entries meant holding one
in your head while the other loaded. #1084 asks for one frame that holds both.

`factions/manifest.ts` says in terms what adding a surface like this costs:

> each of those collapses is licensed by its own record … Every one of those
> licences is scoped to its surface and says in terms that it licenses no further
> collapse: **the next surface needs its own record, the same way.**

This is that record. It also corrects the manifest's own comment — *"The duel
ITSELF is not dispatched"* — which was true when it was written and stops being
true here. The duel CARD is still not dispatched.

## Decision

**One responsive component per faction.** The reader is a chassis
(`pages/duelReader/shared.tsx`) that owns the only `useFormFactor()` call on the
surface, plus thin per-faction archetypes that supply dress and never a
breakpoint. There is no `mobileDuelReader` surface and no phone twin registry.

Four claims come with it, and each is pinned by a test rather than left to
prose (`pages/duelReader/__tests__/duelReaderFrame.test.tsx`):

### 1. Both widths render the same information, in the same order

Disc, name, sigil, figure, title, filed line, proof, body, caster, link out —
twice, in that order, at 375px and at 1280px. Nothing is dropped for a phone and
nothing is added for a desktop.

### 2. The phone difference is one BEHAVIOUR, not one layout

Desktop draws the two entries side by side. The phone stacks them and opens
exactly one, so the two entries are never half-read at once and the standing
stays in view above both. A collapsed header keeps a **full row** — disc, name,
figure, sigil — so the comparison survives the collapse, and the only thing
behind a closed panel is that entry's own title and body.

Which one opens is an owner ruling (2026-09-01): **whoever is behind.** The
standing above has already told the reader who leads, so opening the leader
argues the case the page just said was winning; opening the trailer means the
reader reads the case they have not been sold. It is anti-bandwagon, on a surface
whose whole premise is that voting is open and nothing is decided.

"Behind" is undefined in four of the situations this surface draws, so the ruling
has a tail, ruled the same day and implemented in `pages/duelReader/openSide.ts`
with a test per row:

| situation | opens |
|---|---|
| `settled`, one side ahead | the side that is **behind** |
| `settled`, exact tie | the arrived-from side |
| `resolved` | the arrived-from side |
| forfeit | the arrived-from side |
| no-contest | the arrived-from side |
| deep link, no arrived-from side | the challenger |

A forfeit is checked **before** the standing: a forfeited side still carries a
`points_from_votes` the surface draws as an em-dash, so "behind" stops meaning
anything. `resolved` and forfeit fall back rather than opening the loser because
the ruling's reason is anti-bandwagon *while voting is open* — once the era has
closed there is nothing left to cast, and opening the loser every time would read
as editorial rather than fair.

That whole tail collapses to one value in the code (`arrivedFrom ?? 'challenger'`),
which is exactly why it needs the table: a build that implements only the head
silently opens the challenger on every resolved duel and nothing goes red.

### 3. The vote gate lives in one file

Each column carries its own `VoteUI` against its own praxis id, dispatched on the
**task's** faction, and it hides itself on the entry the viewer wrote — so a
duellist reading this page sees **one** caster, not two.

`resolved` **removes** both casters rather than disabling them. The era has
closed, the figures are the frozen `*_final_points`, and there is nothing left to
vote on; a dead control is not the same statement as no control.

Both of those are one predicate, `casterVisible` in `pages/duelReader/reader.ts`,
and it is read twice inside a single column — once by the plate's heading and
prompt, once by the widget. #1429 is precisely what happens when those two halves
are derived separately: the widget hid itself and eight archetypes went on
drawing an empty "Cast your vote" plate over the hole. **It may not live in two
files.**

### 4. ADR-0035's mobile field desk stays the counter-example

The field desk is a genuinely different screen rather than a narrow rendering of
the roster (#1320), so there is no one component for the two widths to share.
This reader is the opposite: the phone view is the desktop view with one entry
folded away. Nothing here reopens that decision.

## The ground, and the two sigils

**One ground — the task's faction.** That is what the owner's 2026-08-27 ruling
resolves to on this surface. The ruling is *"the ground of the praxis whose page
hosts it … which is what `DuelCard` already does today"*, and what dresses a
praxis page is `task_faction_slug`. Both duellists share one task, so the ground
is the same answer whichever side the reader arrived from — and it is what the
canvas draws: artboard 2c is in **na** while its two duellists are Coven and
Singularity.

**Each duellist's own faction rides on their `FactionSigil` and nowhere else.**
Without it the two sides are typographically identical and a reader has nothing
but a name to tell them apart. A pill was considered and rejected: the sigil is
the faction's mark and does the same job without adding a labelled chip to a card
already carrying two titles, two bodies and two figures.

The nine role properties are spread on the **chassis**, not on each archetype.
That is not a convenience: a role prefix may not be shared between surfaces
(`utils/__tests__/factionRoleFallbacks.test.ts`), so nine archetypes each
declaring `duel-reader` would be nine surfaces wearing one prefix. One
declaration, in the file that reads it — and since ADR-0089 the map answers for
every slug, so **an archetype that passes nothing still wears its faction.**

## Two hazards, both answered by construction

**An Albescent duellist is a disclosure** (ADR-0088). It needs no redaction
branch here, because `.design-sync/BRIEF-duel-surfaces.md` §0 forbids naming a
faction verbally anywhere in a duel: no duel surface calls `factionName()`, so
the string `isFactionRedacted()` masks is not on the page to begin with. The mark
itself is not a livery — Albescent's labyrinth is painted from the unaffiliated
conic, the same spectrum an unaffiliated player wears.

**The 64px gate is `AlbescentAvatar`'s `RING_TURNS_AT`, not the sigil's.**
`FactionSigil` carries no size gate and scales to any size. The reader's largest
disc is 38px, well clear of a ring that ships **dormant** by owner ruling
(2026-08-23) and whose own header names *"a duel banner"* as the surface that
would light it. Drawing a disc at 64 or above on this surface is a reveal
decision, not a sizing one.

## Bodies on the wire — no backend change

`get_duel_detail` returns name, avatar, faction, `points_from_votes` and
`is_submitted` per side and **deliberately never a praxis body.** #1084 allowed
either fetching both praxes under `can_view_praxis` or growing that payload under
the same guard. The build fetches, by owner decision, and it buys three things:

- the guard is the one that already exists — `GET /praxes/{id}` runs
  `can_view_praxis` and `_duel_side_hidden_condition` (#999) per praxis, so a
  live-incomplete side stays author-only without this surface restating the rule;
- the payload is the one every other reading surface consumes, so the two columns
  render from `PraxisOut` exactly as `praxisDetail` does, rather than from a
  second thinner shape that would drift;
- `DuelDetailOut` does not move, so the generated schema and every existing
  consumer are untouched.

The reader is `settled` / `resolved` only, which is the pair in which both praxes
are submitted and therefore visible to everyone, so the second fetch is not a
permissions gamble.

## What is NOT in scope

**The side view is not rederived.** Owner instruction, 2026-09-01: *"For 2a
please use the normal praxis detail page with an added component. Please do not
rederive from scratch."* The whole change to that half is one hairline row on
`DuelCard` carrying one link out, gated on the rival having cast. The aside is
not widened and the card is not moved.

**Turn 1 of the design is not built.** It put both bodies on one duellist's page
under that duellist's vote, and the design dropped it in its own words as *"a
page that can't decide whose it is."* The split into two views is turn 2's whole
point, and it is what keeps the brief's §6 hard no — no two-pane workspace
re-rendering what the detail page already owns — satisfied: the two panes are on
a different page from the one that owns them.

## Consequences

- One new surface key, `duelReader`, in `factions/manifest.ts` and
  `SURFACE_KEYS`. na and Albescent register; Albescent's row is a
  **pass-through**, because brief §6 bars an Albescent dress on any duel surface
  without an owner ruling and there is none for this one.
- The other seven slugs are absent from the row **and still wear their own
  ground**, because the role map is spread on the chassis. A slug absent here is
  a design not yet drawn, not a decision that it renders na forever — the shape
  `praxisDetail` grew back into after #1089. The derived Coven/WOW bar in
  `surfaceDispatch.test.ts` raises itself the moment five reference factions
  register, so nobody is held to a design nobody has drawn.
- One new route, `/duel/:id`, public like the praxis pages it reads from, with
  `?from=<praxis id>` naming the arrived-from side. It dresses nothing and
  decides which panel opens on a phone.
- One new string, `duelCrossLink.readBothSides`. Everything else on both views is
  shipped catalog copy.

**This licenses no further collapse.** It is scoped to the side-by-side duel
reader. The next surface needs its own record, the same way.
