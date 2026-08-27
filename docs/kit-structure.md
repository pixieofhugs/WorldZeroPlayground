# The faction kit

What the kit is shaped like, and the handful of things about it that the code
cannot say out loud. Everything the code *can* say lives in
`frontend/src/factions/` — read that first and treat this file as the commentary.

## The shape

**20 dispatched surfaces × 9 faction identities.**

A **surface** is a place where a faction may look like itself: a task card, a
vote widget, a comment voice, a whole page. The list is
`SURFACE_KEYS` in `frontend/src/factions/manifest.ts`, and it is exhaustive by
construction — a `satisfies` clause makes the array and the `FactionManifest`
interface check each other, so a surface cannot exist without appearing in both.
Each surface has exactly one dispatcher, which calls `surfaceMap('<key>')` and
hands the result to `resolveVariant`.

An **identity** is a faction slug. All nine ship a manifest
(`frontend/src/factions/index.ts`), `na` included since #2530 — see below.

Do not maintain those two numbers here. Count them with
`SURFACE_KEYS.length` and `FACTION_MANIFESTS.length`; this section exists to
say what the numbers *mean*, not to cache them. (They were 21 and 9 when this
file was written, which is worth stating only because the epic that commissioned
it went in believing the second number was 10. The first is 20 since ADR-0078
retired `mobileFactionPage` — a surface count falls when a collapse lands, and
that is the only reason it may fall.)

## Why a bespoke component per faction, and not a props-driven skin

The obvious design is one component that takes a palette and a few flags. It was
rejected, and the reason is worth keeping: the factions do not differ by
parameter. Coven's task card and Ephemerists' task card do not share a layout
with different colours poured in — they share a *slot contract* and disagree
about nearly everything else, down to which elements exist. A props-driven skin
would have grown one flag per disagreement until the flags were a worse language
for describing a card than JSX already is.

So the kit is: **a shared library of parts, plus one bespoke component per
faction per surface.** The shared part is real and load-bearing — a skin
composes `DuelSealSheet`, `ScoreStamp`, `FeedItemSlot`, the card-footer classes —
but the composition itself is hand-written per faction. When two skins genuinely
converge, the fix is to lift the shared thing into the library, not to merge the
skins behind a flag.

Every manifest field is optional, so a faction that declares nothing still
renders correctly everywhere, including on surfaces that do not exist yet. An
undeclared surface is not a hole: the surface map simply has no row under that
slug, and `resolveSlug` reads `na`'s row instead. **That is a lookup in the
ninth manifest, not a fallback mechanism behind the manifests** — `na` declares
all twenty surfaces itself (`frontend/src/factions/default.ts`), which is why
there is only one way a surface gets drawn.

## `Default` ≡ `na` ≡ Unaffiliated is one identity

Three names, one thing. `na` is the slug an unaffiliated player carries;
`Unaffiliated` is what the copy calls them; `Default*` is what their components
are named. There is no separate "default faction" and no fallback-that-isn't-a-
faction. ADR-0039 settles it: `na` resolves to the neutral `--faction-default-*`
set — a spectrum, not a hue — and never borrows another faction's colour.

**The naming rule: an na component is `Default*`, never `Na*`.** The name says
which identity the component draws; it has never meant "the thing reached when
lookup fails".

### `na` ships a manifest, and four of its rows are not `Default*.tsx` files

`na` used to be the one faction with no manifest, reached instead by a second
mechanism — a `Default*` handed to `pickVariant` as a third argument, spelled
out by hand at ~20 dispatchers. **#2530 retired that.** `frontend/src/factions/default.ts`
declares all twenty na surfaces the way the other eight declare theirs, and
`defaultManifest.test.tsx` fails the build if a key is missing.

`Default*` still names an **archetype, not necessarily a module of that name**.
Four rows point somewhere other than a matching `Default*.tsx`:

| Surface | What the row points at | Why |
|---|---|---|
| `backdrop` | `WatercolorBackground` in `components/layout/` | the site's watercolour ground *is* the designed neutral; a `DefaultBackdrop.tsx` would be a re-export with a nicer name |
| `sigil` | `DefaultSigilAdapter`, a named export of `components/sigil/FactionSigil.tsx` | co-located with its dispatcher, reached by a `.then()` that picks the export |
| `comment` | `DefaultComment`, a named export of `components/comments/CommentThread.tsx` | same |
| `duelSeal` | `DefaultDuelSealConfirm`, a named export of `components/duel/DuelSealConfirm.tsx` | same |

Co-location is not a bypass: the manifest is the only thing that reads those
three exports.

`avatar` and `feedFrame` were on this list until #2530 — both were functions
defined inside their own dispatchers, and both are now modules
(`components/avatar/DefaultAvatar.tsx`, `components/feed/DefaultFeedFrame.tsx`),
extracted unchanged so the manifest had something to point at. They are designed,
shipped and rendering — `DefaultAvatar`'s conic spectrum ring was drawn in #1127,
`DefaultFeedFrame`'s spectrum spine in #1148 — and a test pins the feed frame as
the Unaffiliated chassis rather than a passthrough (#1194).

This section is here for one reason: **the absence of a `Default*.tsx` has been
read as a hole in the na kit by four separate audits.** It is a file-layout
observation. If you are about to file "the na kit is missing a backdrop", it is
not — read `default.ts`, which is now the one place that answers the question.

## Albescent's partial coverage is the steady state, not a gap

Albescent declares a minority of the 21 surfaces, and that is correct and
deliberate. It is a secret society hiding in plain sight (ADR-0027), so it must
be indistinguishable from an unaffiliated player unless you already know what you
are looking at.

- **ADR-0046** freezes it: new surfaces fall through to na rather than getting an
  Albescent skin by default.
- **ADR-0048** unfreezes it *per surface, as designs land* — and every row it
  gains is `Default` **plus a flourish** (a drifting spectrum wash, a turning
  prism ring), never a repaint in its own colours. A repaint would put it back in
  the spectrum and un-hide it.

So the count rises one design at a time and is never expected to reach 21. **This
has been re-derived as a coverage gap at least twice.** It is not one. The
per-surface reasoning is in the docblocks in `frontend/src/factions/albescent.ts`,
which is the only place that stays current.

## Responsive or split by form factor

**The rule, and it covers all 20 surfaces: a surface is one responsive component
per faction unless its `SURFACE_KEYS` entry is prefixed `mobile`.** The key name
*is* the status, so this document does not keep a 20-row table that would be
wrong the day a surface lands. Grep the prefix.

A skin that needs to know the viewport reads `useFormFactor()` internally, or
composes a chassis that does — `DuelSealSheet` is the pattern: the skin declares
its ground and its card, the chassis picks modal-over-scrim or full-bleed sheet.

**One key carries the prefix today**, and it is not a twin:

- **`mobileFieldDesk` — not a twin, and not debt.** The phone home is a
  *different screen*, not a narrow rendering of the roster: `pages/FieldDesk.tsx`
  shows the account's roster of lives on a laptop and the carried life's home on
  a phone. Different content, different job. Do not write it up as a split to be
  collapsed, and do not "finish" it by building a desktop counterpart.

`mobileFactionPage` was the other one until ADR-0078 (#1314) — the last twin, and
the one that closed the epic's collapse programme. It is worth knowing *why* it
was the last, because the reason was not size: the two registries held two
different CONTENT SETS rather than two renderings of one. On a phone every
faction showed generic chrome in a faction dress — no manifesto, no spotlight, no
bespoke join flow — so that collapse could not be output-neutral, and it needed
an owner ruling rather than an engineering judgement.

Every collapse was licensed by its own record, one surface at a time —
ADR-0056 (task cards), ADR-0058 (task detail), ADR-0061/0063 (praxis detail),
ADR-0065 (the composer), ADR-0067 (praxis cards), #1319 (character profile),
#1313 (the duel seal), ADR-0078 (faction detail). ADR-0035 still governs what
remains. **A licence to collapse one surface is not a licence to collapse the
next**; each record says so in terms, and ADR-0078 says in terms that it does not
reach `mobileFieldDesk`.

## The two ways a faction silently loses a surface

Both fail the same way — the faction renders its `Default*` skin, everything
compiles, every test passes, and nobody notices for weeks. They are worth knowing
because "it looks like na" is indistinguishable from "it *is* na" at a glance.

1. **A manifest that is not in `FACTION_MANIFESTS`.** Adding a faction is two
   edits — the module, and one line in `frontend/src/factions/index.ts`. Only the
   second one is load-bearing at runtime, and omitting it is not a type error.
2. **An entry read at module-evaluation time.** Dispatchers and archetypes import
   each other, so `factions/index.ts` sits in a real ES-module cycle. This is why
   every manifest entry is a thunk (`taskCard: () => UaTaskCard`) rather than a
   bare reference: a bare reference is read while the modules are still
   evaluating, lands on an uninitialised binding, and captures `undefined`
   forever. **This is how UA lost its heraldic sigil during the #782 refactor.**
   The thunk type now makes the seam correct by construction — do not "simplify"
   it away, and do not turn `surfaceMap()` into a module-level const for the same
   reason.

`manifestsStayLazy.test.ts` and `addAFaction.test.tsx` guard both, and the second
proves the add-a-faction path end to end with a fake faction.

## Publishing the kit

`.design-sync/` publishes a subset of these components as a design kit.
`config.json`'s `componentSrcMap` **hardcodes source paths**, so any file move
must update it in the same PR or the next sync republishes a stale path. Verify
the whole map resolves before syncing rather than trusting review to catch one
line:

```sh
python -c "import json,os; m=json.load(open('.design-sync/config.json'))['componentSrcMap']; print([k for k,v in m.items() if not os.path.exists('frontend/'+v)] or 'all paths resolve')"
```

`.design-sync/NOTES.md` covers the rest, including the part that surprises
people: **the CLI that consumes this directory is not committed**, so a sync run
is not reproducible from a clean checkout. `previews/` *is* committed and is
typechecked in CI (`npm run typecheck:design-sync`), so a preview whose props
drift is a red build for everyone.

## Where the source of truth lives

| Question | Answer |
|---|---|
| Which surfaces exist? | `SURFACE_KEYS`, `frontend/src/factions/manifest.ts` |
| Which factions exist? | `FACTION_MANIFESTS`, `frontend/src/factions/index.ts` — all nine, `na` included |
| Which faction dresses which surface? | that faction's `frontend/src/factions/<slug>.ts` |
| What does a surface's prop contract look like? | the field's type in `manifest.ts` |
| Why does a surface look the way it does? | its ADR in `docs/adr/` |

Deliberately absent: a faction × surface coverage matrix. The manifests are that
matrix, they are one grep away, and a prose copy is wrong the day a surface
lands. If you want the numbers, read them out of the code.
