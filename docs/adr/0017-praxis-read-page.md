# The praxis read page is a per-faction archetype surface with an interactive vote caster

ADR-0005 enriched the praxis **card** (the register-row, list view) and explicitly
deferred the **Praxis Read** page — `/praxes/:id`, one sealed praxis in full: account
body, evidence specimens, the **interactive** vote caster, and the full slot set. This
ADR settles that page.

The scaffolding already exists: `pages/PraxisDetail.tsx` is a hook + dispatcher +
`DefaultPraxisDetail` surface (mirrors TaskDetail / EditPraxis, per ADR-0002).
`ARCHETYPE_BY_SLUG` is empty, so every faction currently renders the Default layout.

## Decisions

### 1. Per-faction archetype seam — explicit, separate, generic-until-designed

The read page is a task-scoped surface (it themes to `praxis.task_faction_slug`), so it
gets a bespoke archetype per faction like every other surface. Rather than build all of
them at once, the seam is set up so each faction can be swapped in independently with a
one-line change:

- **`EphemeristsPraxisDetail` is built for real** — it is the only faction with a
  complete, pixel-level read-page canon (`ephemerists-praxis-read.jsx`). Registered in
  `ARCHETYPE_BY_SLUG['ephemerists']`.
- **Every other faction points at `DefaultPraxisDetail` (the generic page)** until its
  own read-page design lands. Swapping one in = add an archetype file + one map row.
- **A design-status table tracks the gap** (below) so it is always visible which factions
  still need a designed read page + a built archetype. SNIDE and Singularity have
  *Completed-Praxis card* kits but not full read-page designs yet — they are gaps, not
  builds.

This is the same staged move ADR-0005 made for the card (one shared enriched body now,
bespoke per-faction designs tracked as follow-ups).

## Design / build status (the gap tracker)

**Update 2026-06-25 (grilling):** all seven read-page designs now exist (the
*Factions praxis pages* handoff bundle). The build is sequenced **foundation-first**
(this issue: `PraxisOut` delta + shared behavior module + ephemerists), then each
faction lands as its own archetype PR. Albescent is promoted to a **first-class
identity on this surface** (no longer a `ua` alias here) — see decision 7 below.

| Faction | Read-page design exists? | Archetype built? | Issue |
|---|---|---|---|
| ephemerists | ✅ `ephemerists-praxis-read.jsx` | ▶ foundation | #163 |
| everymen | ✅ bundle | ❌ → Default | #207 |
| wow | ✅ bundle | ❌ → Default | #208 |
| snide | ✅ bundle | ❌ → Default | #205 |
| singularity | ✅ bundle | ❌ → Default | #206 (+ build `SingularityVote`) |
| ua | ✅ bundle | ❌ → Default | #209 (+ build `UaVote`) |
| albescent | ✅ bundle (always-light) | ✅ first-class everywhere | #231 read page; **#232 done** — promoted on all surfaces; `albescent → ua` alias dropped |
| aged_out | ❌ (inherits `ua`) | ❌ → Default | stays a `ua` alias |

### 2. A shared slot module owns the behavior slots; archetypes own presentation

Mirror the card: `pages/praxisDetail/shared.tsx` holds the faction-agnostic,
behavior-bearing slots that every archetype MUST render identically and may never
re-implement per faction:

- admin moderation bar
- withdrawn / failed banners
- owner actions (edit / withdraw / resubmit)
- flag block

The archetype owns only the **presentational** slots (masthead, finding headline,
account body, evidence, vote caster). The content-slot invariant (ADR-0002, guarded by
#151) extends to the read page.

**The invariant slot set** every read archetype surfaces, regardless of faction skin:

1. **Identity/status** — title/finding, task link ("re:"), grade/level, solo-vs-collab
   mode, sealed date, moderation status
2. **Author byline** — avatar + display name + link, themed to the *author's* faction
   (actor-scoped, per CONTEXT.md)
3. **Account body** — the full `body_text` (markdown)
4. **Evidence** — the media specimens
5. **Vote caster** — interactive `VoteUI` + rating summary/distribution
6. **Points earned** — vote-weighted score
7. **Behavior slots** (shared module) — admin bar, banners, owner actions, flag block

### 3. The score readout is the point economy, not a rating distribution

The voting section shows **task points + vote total**, not a per-tier rating histogram:

- **Points from the task** — `task_point_value` (the base the task is worth; already on `PraxisOut`).
- **Total from votes** — the vote contribution already surfaced today as the
  "points earned from votes" number (`votes.total_score`).
- These sum to the praxis `score`
  (`(task_point_value + meta) × multipliers + total_stars`, per `scoring.py`).

Explicitly rejected: a `star_distribution` / `ConcordMeter` histogram. It would need a new
backend aggregation and it is not the story this page tells — the page is about *points
earned*, not *how the rating is spread*. The faction reframe ramp still appears as the
**interactive caster** (`<VoteUI>` in cast mode); it just isn't rendered as a distribution.

**Backend impact: none for scoring** — both numbers already exist on `PraxisOut`.

> Amended 2026-07-31 (#1382): this sentence used to read "`PraxisOut` / `VoteSummary`".
> `VoteSummary` and its `GET /praxes/{id}/votes` endpoint were retired when the vote
> POST began returning the tally it had already computed. Nothing about the decision
> above changes — the numbers were always on `PraxisOut` too, which is why the probe
> turned out to be redundant. Note `VoteSummary` is *also* the name of an unrelated
> React component in `VoteShell.tsx`, which is untouched and still exists.

### 4. Evidence reuses `MediaGallery`; archetype owns only the framing

The evidence slot wraps the existing shared `<MediaGallery>` — it already resolves
file paths and renders image / video / audio, and is never re-implemented per faction.
The archetype owns only the **framing** around it (the "The evidence · N specimens"
section header, faction ornament like the foxing border).

- The canon's `minmax(150px,1fr)` grid (vs MediaGallery's single column) is a layout
  nicety — add an optional `layout?: 'column' | 'grid'` prop to MediaGallery *only when
  the Ephemerists build needs it*, not pre-emptively.
- **Per-item captions deferred** — `media_items` has no caption column; the canon's
  specimen captions are design filler. Adding them is a schema change. Tracked as a gap,
  not built now.

### 5. Comments: reserve a marked slot only — designed and built separately

A comment system is a real, wanted feature but is **out of scope for this page** and is
being designed/built in a separate workstream. The read page only reserves the seam:

- A `{/* Comments slot — actor-scoped surface, see CONTEXT.md; built separately */}`
  marker at the bottom of the invariant layout, so comments drop into a known location
  with no re-layout.
- No comment model, endpoints, or UI are built here.

(Known direction for the separate workstream, from this session: comments will attach to
both **praxes and tasks**; the data-model choice — dual nullable FKs + CHECK vs polymorphic
target — is being settled there, not here.)

### 6. Data `PraxisOut` needs beyond the card

Scoring needs nothing new (decision 3). The remaining slots need three fields on
`PraxisOut`:

- **`task_level_required`** — grade/level slot. `praxis.task` is already joined in
  `build_praxis_out` (it already reads `praxis.task.point_value`), so this is trivial.
  Mirrors the field #159 adds to `PraxisCardOut`.
- **`submitted_at`** — sealed-date slot. The **column + transition** are added by #159
  (chosen over `created_at`/`updated_at`); this page just also exposes it on `PraxisOut`.
- **`created_by_faction_slug`** — the praxis author's *member* faction, for the
  **actor-scoped byline** (the byline themes to the author's own faction, not the task's).
  Net-new: needs an author-character → faction join in `build_praxis_out`. The Default
  page currently themes the byline generically (`factionCssVar(null, …)`); actor-scoped
  theming is what this adds.

Everything else the invariant set needs is already on `PraxisOut` (`type` for
solo-vs-collab, `body_text`, `media_items`, `moderation_status`, `is_withdrawn`,
`can_flag`, `task_title`/`task_id`, `created_by_*`).

### 7. Albescent is a first-class identity on the read surface (grilling 2026-06-25)

> **Amended by ADR-0083 §8.** The **always-light** clause below is retired: the
> Albescent reveal register has a dark half, and a dark-mode reader gets a dark
> letter. Its other half is already dead — the `--faction-albescent-card-*`
> tokens prescribed here were deleted by #783, and Albescent renders as
> unaffiliated everywhere. Singularity's always-dark is untouched; the amendment
> is about the vellum, not about theme-invariant surfaces as a class.

The bundle ships a bespoke **always-light vellum** albescent read page, contradicting the
global `albescent → ua` alias (`FACTION_ALIASES`). Decision: albescent gets its own
read-page archetype **now** —

- Register `albescent` explicitly in `ARCHETYPE_BY_SLUG`; `pickVariant` lets the explicit
  entry beat the alias, so the global alias is untouched and no other surface regresses.
- Add `--faction-albescent-card-*` tokens, always-light (identical values in both the
  light and `[data-theme="dark"]` blocks — same mechanism singularity uses to stay
  always-dark), and add `albescent` to `CSS_KEY`.
- **Promotion across other surfaces** (card, vote, feed, avatar, backdrop, hero) is a
  separate effort (#232) — those have no albescent design and would regress to generic if
  the alias were dropped now. The alias stays until each surface has an albescent variant.

### 8. Metatask panel omitted from archetypes (grilling 2026-06-25)

The seven archetypes target levels 1–6 and **omit the metatask panel** (designs don't
depict it). `DefaultPraxisDetail` keeps its panel as the fallback. A per-faction metatask
UI — each archetype skinning its own — is tracked in #233 (needs updated designs; coordinate
with #196's metatask-model rework).

## Status / tracking

- **Implementation:** GitHub #163 (foundation + ephemerists), then #207 / #208 / #205 /
  #206 / #209 / #231 per faction.
- **~~Depends on #159~~** — landed/closed: `submitted_at` column + transition and the
  `VoteUI` `caster`/`summary` refactor all shipped. **But** `PraxisOut` still lacks
  `submitted_at` / `task_level_required` / `created_by_faction_slug` (#159 only added them
  to `PraxisCardOut`); #163 adds them to `PraxisOut`.
- **Vote variants:** ua (#209) and singularity (#206) have no `VoteUI` variant — built with
  their read pages.
- **Backer ledger:** reserved slot only; filled by #195 (per-voter data already exists via
  `GET /praxes/{id}/voters`).
- **Comments** are a separate workstream — reserved slot only (decision 5, #167).
- **Metatask panel:** omitted (decision 8, #233).
- **MediaGallery `layout` prop** is added only if the Ephemerists build needs the grid.

## Refs

- Builds on ADR-0002 (page = composition of surfaces) and ADR-0005 (praxis card content model).
- Depends on GitHub #159 (vote-reframe caster/summary + `submitted_at` + grade data).
- Reference design: `ephemerists-praxis-read.jsx` (PraxisRead, ConcordMeter, MarkCaster, Specimen).
