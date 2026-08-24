# ADR-0016: Per-faction surfaces share one data contract; archetypes own only presentation

**Status:** Accepted
**Date:** 2026-06-24

## Context

World Zero renders many UI surfaces per faction (SPEC-faction-ui-profile §1: task
card, praxis card, edit-praxis editor, vote control, comment, activity-feed card, …).
Each faction ships a bespoke **archetype** of a surface — a drastically different look
(S.N.I.D.E. ransom clipping vs Everymen union poster).

CONTEXT.md already seeds the boundary with **Content slot**: "the slots are fixed across
all factions; only their presentation varies by archetype." But that was stated as a
card detail, not enforced as a law — and it erodes one archetype at a time. The two
failure modes:

1. **An archetype reaches for different data** than its siblings — fetching its own,
   or being handed raw slot values a sibling doesn't get. Now the "surface" means
   different things per faction, and a page can't reason about what it shows.
2. **Which slots exist drifts per faction** — one archetype renders a field another
   omits, so the surface has no stable contract.

The edit-praxis editor showed both latently: three controls (`InviteSearch`,
`FilePicker`, `MetatasksList`) were extracted as shared components that read their data
from the one `EditPraxisState` contract, while four (title, body, mode, publish) stayed
inline — structurally identical across all seven archetypes, but each re-binding state by
hand, i.e. one bespoke edit away from drift.

## Decision

**Every per-faction surface has exactly one data contract — its content slots — and every
archetype of that surface consumes it identically. Archetypes own only presentation.**

1. **One contract per surface.** The set of slots a surface renders (e.g. edit-praxis:
   title · body · mode · media · invites · metatasks · publish/save; a card: title ·
   points · faction flavor · …) is fixed for all factions. A surface exposes its contract
   as one value (a state object / props type), e.g. `EditPraxisState`.
2. **Shared, slot-owning controls.** Each slot is rendered by a **shared control that owns
   its own binding** — it reads the slot from the contract itself. The archetype passes
   only `{contract, skin}`; it is **never handed raw slot values and never fetches its own
   data.** This makes "same information" structural, not conventional: an archetype
   *cannot* feed a slot different data.
3. **Presentation is unconstrained.** An archetype supplies **skin** (colors/fonts/ornament
   via CSS vars) and **arrangement** (order, grouping, the wrapping frame). Two archetypes
   may look nothing alike. Arrangement is the surface's identity (SPEC §1 #3) and stays
   per-archetype — *not* flattened into a fixed scaffold.
4. **Faction-specific content is catalog copy, not a structural difference.** Faction-voiced
   text (flavor lines, vote-tier labels, at-cap messages) is a *slot* whose words come from
   the copy catalog (ADR-0010) keyed by the **contextual faction** (§2), resolved by the
   control via `t()`. The slot is invariant; only the words differ.

### Enforcement

- A new piece of data → added to the **contract**, so *every* archetype gets it. Never a
  prop on one archetype.
- A new faction → a **skin + arrangement**, never a new or missing slot.
- Reviews reject: an archetype fetching its own data; a control receiving raw values
  instead of the contract; a slot present in one archetype and absent in another.

## Consequences

- Pages can reason about a surface uniformly — "the edit-praxis editor always exposes these
  slots" — regardless of faction.
- Adding a faction is a presentation task (skin + arrangement), testable as "renders all
  contract slots," not "re-implements the form."
- Tests assert each archetype consumes only the contract and renders the required slots;
  no per-archetype data-shape tests.
- Applies to all SPEC §1 surfaces. Immediate consumers: the edit-praxis control extraction
  (title/body/mode/publish join the already-shared three), the vote reframe registry
  (#194), the comment archetype (ADR-0006), the activity-feed frame.
- Complements **ADR-0002** (a page is a composition of surfaces) — this governs what each
  surface *is*; 0002 governs how surfaces compose into a page. And **ADR-0010** (copy
  catalog) is the mechanism for slot #4.

## Alternatives considered

- **Per-archetype data access (status quo by omission).** Rejected: each archetype
  re-binding or fetching data is exactly the drift this ADR prevents; "surface" stops
  meaning one thing.
- **One fixed-arrangement scaffold per surface** (archetypes become frame skins over a
  fixed layout). Rejected: it maximizes code reuse by flattening **arrangement**, which is
  the per-faction identity §1 #3 protects. The contract is shared; the *layout* is not.
- **Leave it as a CONTEXT.md note.** Rejected: a note doesn't stop erosion. The invariant
  needs to be citable law a future archetype author is held to.
