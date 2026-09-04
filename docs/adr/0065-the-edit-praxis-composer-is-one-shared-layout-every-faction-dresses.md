# ADR-0065 — The edit-praxis composer is one shared layout every faction dresses

**Status:** Accepted
**Date:** 2026-07-29

**Relates to:** #1179 (epic), #1180 (this ADR's issue)
**Extends:** ADR-0061 (praxis detail is one shared page every faction dresses)
and ADR-0057 (task detail pages carry no faction voice) — the same doctrine,
a third surface
**Parallel to:** ADR-0056 (task cards), ADR-0058 (task detail), ADR-0063
(praxis detail) — the same mobile-twin collapse, a fourth surface
**Supersedes ADR-0035 for edit praxis** — ADR-0035's form-factor split stands
for every other mobile surface; only the composer is unified here
**Unaffected:** ADR-0059 (submitting a collab or duel part holds the composer)
— this ADR changes who draws the surface, not when it is drawn

## Context

The edit-praxis composer is the last of the five big per-faction surfaces to be
rebuilt to a v2 design. Task cards, praxis cards, task detail and praxis detail
have all been through it, and all four settled into the same shape: **one
bespoke component per faction, composing a shared library.**

The composer already has that structure and has had it for some time.
`frontend/src/pages/editPraxis/archetypes/shared.tsx` exports the layout blocks
(`Breadcrumb`, `TaskMetaInline`, `TitleCounter`, `ErrorBanner`,
`ArchetypeFrame`, `RainbowTitle`, `RainbowUnderline`, `formatAutosave`,
`formatClock`) and `archetypes/controls.tsx` exports the behaviour-bearing
controls (`TitleField`, `BodyTextarea`, `BodyPreview`, `ModePicker`,
`PublishButton`, `SaveDraftButton`, `InviteSearch`, `FilePicker`,
`DropButton`). Every one of those controls already takes a `*Skin` prop, so a
faction dresses a control without forking it.

So the seam this epic needs is not missing. What is missing is the dress: the
eight `archetypes/*EditPraxis.tsx` files were never rebuilt to the v2 designs,
because epic #1071 built only the composer's *behaviour* (ADR-0059/0060, the
waiting surface, save-draft, the confirm dialog) and deferred the frames by
name — "per-faction frames are a follow-up wave if it reads flat once live".
That wave was never filed. Epic #1179 is it.

**The design is authored as one component, and that is not the build shape.**
Project `c491945e-4fd5-44e7-a861-0be1fce955a0` ships one `edit-praxis.jsx`
holding a nine-row `SKINS` table keyed by slug, with nine `.dc.html` canvases
importing it at different `faction` / `platform` props. That is authoring
convenience, exactly as the praxis-detail designs were, and it must be read as
the dress spec for eight components rather than as an instruction to collapse
eight files into one. Faction identity in that table lives entirely in six
ornament seams (masthead, ground, rule, points mark, hero mark, submit
treatment) plus per-skin token, font and radius fields — all of which are dress.

Two further facts shaped the decision. First, the design's own header states
the copy rule outright: *"COPY IS FACTION-NEUTRAL. Each faction brings its own
ornament."* Today's composers do not — they carry heavy voice
(`HOW ARE YOU WALKING?`, `w/ friends`, `witch duel`, `FIELD NOTES`,
`TITLE · WHAT WHIMSY AROSE?`). Second, the design takes a `platform` prop
rather than shipping a second component, while the tree still splits the
composer by form factor: `pages/EditPraxis.tsx` branches on
`formFactor === "mobile"` and dispatches through a second manifest surface,
`mobileEditPraxis`, into eight files under `pages/editPraxis/mobileArchetypes/`.
That is sixteen files maintained against eight designs.

## Decision

### 1. One composer layout, one component per faction

The eight `pages/editPraxis/archetypes/*EditPraxis.tsx` files **stay** and are
rebuilt to their designs over the existing `archetypes/shared.tsx` +
`archetypes/controls.tsx`. This is ADR-0061's ruling for praxis detail,
restated for the composer: **the layout contract and the API contract are
shared; only dress changes.**

A skin brings frame, type, ornament and motion. It does not fork a control, it
does not change what the composer submits, and it does not vary the order or
presence of the layout's regions.

### 2. One responsive component, no mobile twin

- `EditPraxis.tsx` stops branching on `formFactor === "mobile"`; it always
  dispatches through the `editPraxis` manifest surface.
- Each archetype calls `useFormFactor()` internally for its own size set and
  conditional ornament — the shape ADR-0056, ADR-0058 and ADR-0063 established
  for the three surfaces before it.
- `mobileEditPraxis` retires from `FactionManifest` and from `SURFACE_KEYS`,
  along with every faction registration of it, and
  `pages/editPraxis/mobileArchetypes/` is deleted. This follows ADR-0063's
  terms rather than ADR-0056/0058's: the retirement is outright and immediate,
  not a dormant revert path, because all nine designs were committed before a
  single archetype was rebuilt. The mobile skins are **superseded by a
  committed design**, not held open pending one.

**This licence is scoped to the edit-praxis surface.** ADR-0056 and ADR-0058
each closed themselves to exactly that — "unifying another surface needs its
own experiment and its own ADR" — which is why ADR-0063 exists for praxis
detail and why this ADR exists for the composer rather than either being an
amendment. ADR-0065 licenses no further collapse. The next surface needs its
own record, the same way.

**Amended 2026-09-01 (#2992): the CHASSIS crossed to the character forms, and is
now the general rule.** The paragraph above is about the mobile-twin collapse —
"unifying another surface" means retiring another `mobileX` seam — and that
scoping stands unchanged. It was being read as scoping the composer's shared
LAYOUT BLOCKS too, and those left this surface without an amendment: #2346 and
#2351 built Create Character on `ComposerPage` / `ComposerSheet` /
`ComposerSection` / `ComposerFooter`, and #2537 did the same for Edit Character.
Seven faction kits shipped that way; only the `na` kit and its Albescent wrapper
did not, and #2992 brought them in on the owner's ruling that *"all factions read
from the same chassis"*. So `shared.tsx` is the expected substrate for a
composer-shaped form on any surface, and a new kit that hand-authors a sheet, a
section and a footer is the thing that now needs a reason.

What is still not licensed is unchanged and is stated below under *What this ADR
does not do*: folding the archetypes into a single component with a runtime skin
table. Mounting shared blocks is not that.

### 3. The composer carries no faction voice

Copy on this surface goes neutral: one shared block of keys, every archetype
reading the same ones. Where a design's word differs from the domain noun in
`CONTEXT.md`, the domain noun wins. This is the ADR-0057 / ADR-0061 doctrine
extended to a third surface, and it is what deletes the per-faction composer
vocabularies listed in Context.

**The neutral rule stops at the speaker's voice.** Comment skins are untouched.
A comment row dispatches on `comment.author.faction_slug`, not the page's — a
Snide player's comment reads Snide inside a Coven composer's thread, because a
comment is the author speaking and the composer is the page. `comments.<faction>.*`
and the per-faction `*Comment` skins are **out of scope** and must not be swept
later by inference from this ADR. The same carve-out ADR-0061 made, for the
same reason.

### 4. Albescent registers nothing

There is no `AlbescentEditPraxis` today and none is added. Albescent registers
neither `editPraxis` nor `mobileEditPraxis` and falls through to
`DefaultEditPraxis`, **which is the na kit** (ADR-0039/0048) — not a generic
neutral placeholder.

The design supports this directly: in `SKINS`, `albescent` and `default` are
the same `chrome: 'spectrum', aurora: true` with identical fonts, differing
only in a card ground of `#FDFBF5` against `#FBF8F0`. That is not a skin. So
this epic is **seven skin issues, not nine**.

## What this ADR does not do

**It does not unify the archetypes.** CLAUDE.md's "each faction has its own
card archetype; don't unify" stands, and this surface keeps one file per
faction. Nothing here licenses folding the eight composers into a single
component with a runtime skin table, whatever the design file's authoring shape
suggests. The only collapse recorded here is the **mobile twin** — the same
collapse ADR-0056, ADR-0058 and ADR-0063 already made three times.

**It does not touch ADR-0059.** The composer still holds after you submit; the
waiting surface still exists and still governs when the post-submit state is
shown. What changes is that the waiting surface stops being faction-neutral
chrome and is drawn through each faction's dress, closing #1071's deferred
wave. Who draws the surface, not when it is drawn.

## Consequences

- Future composer work is 7 designs and 7 components, not 14 and 14.
- The per-faction composer copy blocks are deleted as each archetype goes.
- A future faction skin cannot introduce copy on this surface, only dress.
- `editPraxis` remains a registered manifest surface with partial registration
  — slugs that do not register it fall through to `DefaultEditPraxis`. That is
  override-only working as documented (#782), the same partial-registration
  doctrine ADR-0046/0048 rely on. `mobileEditPraxis`, by contrast, is retired
  outright: there is no partial-registration story for a surface that no longer
  exists, and no future issue should try to re-register it.
- ADR-0016's presentation/voice boundary gains a third per-surface exception,
  after task detail (ADR-0057) and praxis detail (ADR-0061).
- The deleted mobile archetypes are live consumers of the i18n catalog. As
  ADR-0058 documented for task detail, a key held alive only by a dormant or
  doomed mobile file will read as "in use" to a sweep run before the deletion
  lands. Sweep after the retirement, not before.

## Alternatives rejected

**Build the design as it is authored — one `EditPraxis` component with a
`SKINS` table.** It is the smaller diff and it matches the design file
literally. Rejected because it is a different architecture from the four
surfaces that are working, it reintroduces the unification CLAUDE.md forbids,
and it turns every future faction change into an edit to a file all nine
factions share. The praxis-detail designs were authored the same way and were
correctly read as a dress spec for eight components; this is that precedent,
applied.

**Keep the mobile twin.** Rejected on ADR-0063's reasoning: the mobile files
are the thinner ones (337–586 lines against the desktop archetypes' 545–860),
so the split already bought less than it cost, and the design draws one page at
two widths rather than a structurally different page on a phone. Holding the
files dormant on ADR-0056/0058's terms was considered and rejected for the same
reason ADR-0063 rejected it — nine committed designs leave nothing to revert
to, and dormant files are paid for by the i18n sweep and the style ratchet for
no live option on the other end.

**Let voice return with each design.** Rejected for the reason ADR-0061 gives
at length, including in the amendment it wrote and withdrew the same day: a
deliberately designed set of near-synonyms is still the catalog the neutral
rule exists to delete. The composer's slots — title, body, mode, proof, submit
— read identically on every skin.
