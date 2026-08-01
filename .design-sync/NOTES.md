# Design-sync NOTES — World Zero Frontend Kit

World Zero's frontend is a Vite **app**, not a published component library, so this
sync uses the `package` shape in **synth-entry / barrel** mode. Read this before any
re-sync.

## What is and isn't in this repo (#1328)

**The CLI that consumes this directory is not committed.** It lives in `.ds-sync/`,
which is gitignored (`.gitignore:26`), and `.design-sync/node_modules` is a symlink
into it (`.gitignore:30`). So a sync run is **not reproducible from a clean checkout** —
you have to install that tool separately first. What IS committed is everything the
kit is built *from*: the previews, `_state.tsx` / `_fixtures.tsx`, `config.json`, the
generators, and the `frontend/.ds-kit/` barrel + provider.

**`previews/` is typechecked in CI.** `frontend/tsconfig.design-sync.json` covers
`previews/` plus `frontend/.ds-kit/`, and the `frontend` job runs it as
`npm run typecheck:design-sync`. It sits in `frontend/` rather than here because
TypeScript resolves bare imports by walking up from the importing file, and
`frontend/node_modules` is the only install in the repo.

Two consequences worth knowing before you touch a preview:

- A preview whose props drift is now **a red build for everyone**, not a silent
  floor card at the next sync. That is the point — but it means a PR that changes a
  hook-state interface has to update `_state.tsx` in the same PR.
- The check is deliberately scoped to `previews/`, NOT to `.design-sync/**`.
  `docs/agents/design-fidelity.md` reuses `.design-sync/<epic>/` for ephemeral
  vendored design bundles that the epic's last PR deletes; those must stay out of CI.

When this guard was added, **70 errors across 23 files** were waiting in a directory
nothing had ever compiled — including a `mockCollaboration.score` the scoring formula
cannot produce, and an `EditPraxisState` builder 28 fields behind.

## How the build is wired (non-obvious pieces)

- **Barrel entry**: `frontend/.ds-kit/index.tsx` (committed) named-re-exports all 86
  components so the IIFE assigns each to `window.WZ.<Name>`. The repo's components are
  `export default`, and esbuild's `export *` drops defaults — hence the explicit barrel.
  Regenerate it from `componentSrcMap` if the scoped set changes (a small node one-liner
  built it; see git history / `_srcmap.json` was the scratch source).
- **Preview provider**: `frontend/.ds-kit/provider.tsx` (committed, `cfg.provider = DSProvider`).
  Wraps previews in `MemoryRouter` (react-router-dom v6 hooks throw without a Router) and
  initializes i18next. **Preview-only auth mock**: guarded by `window.__dsPreview` (set only
  inside the preview harness, never in a shipped design), it resolves `GET /auth/me` to a mock
  authed UA user so auth-gated UI (vote rungs, comment composer, signup buttons, NavBar) renders
  its real state instead of a login gate; every other request rejects like the offline app. It
  also sets `i18n.options.saveMissing=false` so a missing copy key renders the key instead of
  throwing (dev-mode i18n throws and blanks the whole card).
- **cssEntry = `frontend/.ds-kit/kit.css`** (GENERATED, gitignored). Built by
  `node .design-sync/gen-kit-css.mjs` (committed) = **Tailwind-compiled** `src/index.css`
  (the app uses `@tailwind` utilities that the converter would otherwise copy verbatim as
  no-ops — every `rounded-full`/`flex`/`object-cover` would break) **+** a Google-Fonts
  `@import` harvested from `frontend/index.html` (the faction webfonts load via a `<link>`
  there, not `@font-face`, so `[FONT_MISSING]` → wire them as a remote `@import` → `[FONT_REMOTE]`).
- **node_modules is a junction** to the main repo's install (worktree convention). That install
  predated the i18n epic, so `i18next` + `react-i18next` were installed manually
  (`npm install --no-save i18next@^26 react-i18next@^17`). A fresh clone may need this again.

## cfg.overrides (all cardMode)
- Backdrops (8) + popups (3): `cardMode:single` + `viewport` — they are `position:fixed`
  full-page / modal overlays.
- NavBar: `cardMode:column` (full-width top bar). Filters (FilterFactionTabs/LevelNodes/Stamps):
  `cardMode:column` (wider than a grid cell).

## Preview-authoring conventions (for re-sync / new components)
- Previews import components from `'worldzero-frontend'` (named), types via `import type` from
  `../../frontend/src/...` (erased at build), and shared fixtures from `./_fixtures`.
- `.design-sync/previews/_fixtures.tsx` (committed) provides typed World Zero mocks:
  `makeTask/taskFor`, `makeCharacter/characterFor`, `makePraxis`, `mockUser`, `mockComments`,
  `mockCollaboration`, `mockCredential`, `makeFeedItem/mockFeedItems`, `FACTION_SLUGS`, `noop`.
- **Backdrops** need a containment wrapper: a `<style>` rule `.bd-scope > div{position:absolute
  !important;inset:0!important}` re-scopes their inline `position:fixed` to fill the card (see
  any `previews/*Backdrop.tsx`). Without it the atmosphere attaches to the viewport and the
  element-screenshot is blank.

## Known render warns (triaged legitimate — not new issues on re-sync)
- `SnideMasthead` is a thin header strip (wordmark + acid underline) — renders slim by design.
- LevelPill / small avatars / sigils are intentionally tiny; previews compose several per cell.
- `[FONT_REMOTE]` on the faction families — expected (loaded via the Google-Fonts `@import`).
- esbuild prints `Duplicate key "invitation"` for `factions.json` — see Re-sync risks.

## Re-sync risks (what can silently go stale)
- **`AlbescentInvitation` is graded needs-work** — NOT a sync defect. `frontend/src/locales/en/
  factions.json` defines `albescent.invitation` TWICE (JSON keeps the last), so the component's
  wordmark/letterhead/terms slots render raw i18n keys. Flagged as a separate task
  (spawn task "Fix duplicate albescent.invitation key in factions.json"). Once fixed, a re-sync
  flips it to good with no preview change.
- **`FactionBackdrop`** (the dispatcher) reads its slug from `BackdropContext`, which the barrel
  does NOT export — in isolation the slug is always null, so its preview shows the neutral
  global watercolor default. The 7 faction backdrops (leaves) cover the themed skins. To preview
  themed dispatch, the barrel would need to export the Provider + `useFactionBackdrop` hook.
- **`CommentThread`** fetches its own comments (network disabled in previews) → shows the
  composer/empty state. The 7 faction comment voices are the populated-thread showcase.
- **`MediaGallery`** image thumbnails 404 offline (no real image server); layout/players render.
- **Generated, gitignored, regenerate before every build**: `frontend/.ds-kit/kit.css` +
  `frontend/.ds-kit/index.compiled.css` (run `gen-kit-css.mjs`). If `src/index.css`, the app's
  Tailwind config, or the `index.html` font `<link>` changes, regenerate.
- The preview auth mock's `MOCK_USER` is inlined in `provider.tsx` — if `CurrentUser`'s shape
  changes, update it or the provider won't type-check.

## [2026-07-15] Mobile page-archetypes added (86 → 140 components)
The mobile-native epic (#494 graph) landed 54 full-screen mobile page skins across 9
surfaces; this sync added them all. What changed here:

- **componentSrcMap 86 → 140**; barrel `index.tsx` regenerated (+54 named default re-exports
  under `pages/<surface>/mobileArchetypes/`). `overrides` gained 54 entries — every mobile
  archetype is `cardMode:single` + `viewport:"390x760"` (they're full phone screens).
- **Fork `source-kit.mjs`** (`cfg.libOverrides`): added `pages`,`mobilearchetypes` to `GENERIC_DIR`
  so the 54 group by SURFACE (`fielddesk`/`tasks`/`taskdetail`/`praxisdetail`/`editpraxis`/
  `factiondetail`/…) instead of one flat `mobilearchetypes` bucket. Recreate the fork symlink
  on a fresh clone: `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` (it imports bare `ts-morph`).
- **Provider now mocks `GET /factions`** — `DefaultFactionsDirectory` self-fetches (no props);
  without the mock its preview shows the offline-error state. The `/auth/me` mock was already there.
- **`_state.tsx`** (NEW, committed) — 10 surface STATE builders the mobile previews consume:
  `fieldDeskState / tasksState / taskDetailState / praxisDetailState / editPraxisState /
  factionDetailState / createCharacterState / editCharacterState` (all take a slug) + `profileProps(slug)`
  + `playersProps`. 8 surfaces take a single `{state}` prop → previews are slug-swaps (content
  flavors automatically via the slug-aware `_fixtures`); 3 singletons take custom props.
- **`_fixtures.tsx` additions**: `factionOuts`, `makeFactionConfig`, `gameFactionConfigs`,
  `makePraxisCard`, `praxisCardsFor`.

### Grading insight (don't re-panic next sync)
All 86 existing components showed as `changed`/`pendingGrade` but their **renderHash was byte-identical**
(0 of 86 changed) — the epic only moved their upstream source fingerprint (`sourceKey`), not the emitted
files or the render. When renderHash is unchanged vs the anchor, re-grading is a formality (grade good).

### Upload optimization used this run
Uploaded only genuinely-changed files (bundle, README, CSS, the 54 mobile components + their `_preview`)
= 274 files, NOT all 708. The 86 existing components + `_vendor` were provably byte-identical on the
remote (their `sourceHashes` matched the anchor exactly; `styleSha` matched → CSS unchanged), so re-sending
them was pure waste. `deletePaths` was `[]` — the hand-uploaded design handoffs (`mobile-system/`,
`templates/`, `screenshots/`, `design_handoff_*`, `uploads/`) are NOT converter output and stay untouched.

## Re-sync risks (mobile)
- **State-builder drift**: each mobile archetype renders from a hook-state interface (`FieldDeskHomeState`,
  `TaskDetailState`, `EditPraxisState`, …). If one gains a new REQUIRED field, its `_state.tsx` builder must
  be updated or the preview won't compile → drops to floor card. `EditPraxisState` is the largest (~47 fields).
- **`source-kit.mjs` fork**: on re-sync, diff `.design-sync/overrides/source-kit.mjs` against the bundled
  `lib/source-kit.mjs` and re-apply the 2-string GENERIC_DIR change if upstream moved.
- **Provider `/factions` mock**: inlines the 7 live slugs; if `FactionOut` gains required fields or the slug
  set changes, update the mock in `frontend/.ds-kit/provider.tsx`.
- **Mobile viewport**: `390x760` single-card shows the top fold of long screens by design — not a defect.

---

## [2026-07-30] Re-sync after two months of drift (126 → 268 components)

The repo had moved a long way since the last sync. What this run had to repair, and
what a future run should know:

### The component map was rebuilt, not patched
- **22 map entries pointed at deleted files.** ADR-0056 collapsed the mobile/desktop
  split for editPraxis / praxisDetail / taskDetail / tasks: the per-faction
  `mobileArchetypes/*Composer` and `*TaskList` skins are GONE, replaced by unified
  responsive `archetypes/*` components that call `useFormFactor()` themselves.
  `LevelPill` (→ `LevelGem`, #736), `CollaborationCard` and `UACrest` were deleted upstream.
- **8 components were case-renamed**: `UAAvatar`→`UaAvatar`, `UABackdrop`→`UaBackdrop`,
  `UAComment`→`UaComment`, `UAFactionHero`→`UaFactionHero`, `UAFeedFrame`→`UaFeedFrame`,
  `UATaskCard`→`UaTaskCard`, `UAVote`→`UaVote`, `SNIDETaskCard`→`SnideTaskCard`.
  **Windows `fs.existsSync` is case-insensitive** — a dead-path check will NOT catch these.
  Compare against a `readdirSync` of the parent instead.
- **~150 net-new components** were added: the praxis-card stack (desktop/mobile/scoreStamp),
  metatask seals, duel seal confirms, faction sigils, the feed row system, the unified page
  archetypes, the layout shell, the players views, and Coven + Albescent throughout.

### Two barrels now, not one — and the second one is why props exist at all
`gen-barrel.mjs` (committed) emits BOTH from `cfg.componentSrcMap`:
- `frontend/.ds-kit/index.tsx` — the runtime entry (unchanged purpose).
- `frontend/index.d.ts` — the TYPES entry, pointing at a `tsc`-emitted `frontend/ds-types/` tree.

**Why this matters more than it sounds.** Before this run, ALL 268 emitted `<Name>.d.ts`
files said `[key: string]: unknown` — the design agent had NO API contract for any World
Zero component, and had never had one. `lib/dts.mjs` resolves props either from a named
`<Name>Props` interface or from the component's declaration in the package's types entry
(`pj.types`, else `index.d.ts`). This is an app; it publishes neither. Wiring the types
entry took it to **17** props-less, and those 17 genuinely take no props (backdrops,
watchers, NavBar/Sidebar/MobileTabBar/SiteFooter/WatercolorBackground).

Both artifacts are GENERATED and gitignored. Regenerate before every build:

    cd frontend && node_modules/.bin/tsc -p tsconfig.json \
      --declaration --emitDeclarationOnly --noEmit false --outDir ds-types --skipLibCheck
    cd .. && node .design-sync/gen-barrel.mjs

**Gotcha:** the converter globs `<pkgDir>/**/*.d.ts`, which SKIPS dot-directories. The
tree must live at `frontend/ds-types/`, not `frontend/.ds-kit/types/`.

### The ensō asset — a product bug the sync surfaced
`Enso` paints through `mask-image: url(/factionMarks/enso.webp)`, an ABSOLUTE path the app
serves from `public/`. Nothing serves it inside the design system or inside a design built
from the kit, so every UA mark (`UaSigil`, `FactionSigil('ua')`, the UA score mark) rendered
**blank** — in the DS *and* in any design an agent builds with it. `gen-kit-css.mjs` now
inlines the 31 KB webp as a data URI with `!important` (it must beat the component's inline
style). If another app-served asset appears under `frontend/public/`, it needs the same
treatment — grep for `url(/` in `src/`.

### Fork widened
`.design-sync/overrides/source-kit.mjs` GENERIC_DIR now also carries
`archetypes, desktop, mobile, skins, blocks, waiting`. Without them, 42 unified page skins
collapsed into one flat `archetypes` group and the praxis-card stack split into
meaningless `desktop`/`mobile` buckets. Groups now read by SURFACE.

### Preview contracts that had silently rotted
Every one of these compiled fine and rendered wrong or not at all — esbuild does not
type-check previews, so a stale prop is invisible until the render check runs:
- **task cards**: `displayPoints` → `basePoints` + `multiplier` + `inProgressCount` (v2).
  The dispatcher defaults the last two; the faction LEAVES require them.
- **feed frames**: #1194 added the chassis seam — `kicker`, `time`, `tag`, `archive` are all
  required now. `archive` takes the pre-composed `FeedArchiveButton`, never a rebuild.
- **`TasksState`** gained `taskType/setTaskType`, `query/setQuery`, `hasMore/loadMore`,
  `displayMultiplierFor`.
- **`DefaultFactionsDirectory`** moved off self-fetch onto a `state` prop (the provider's
  `GET /factions` mock no longer reaches it) → new `factionsDirectoryState()` in `_state.tsx`.
- **`ThemeProvider`** is now required by `useTheme()` — added to `DSProvider`. NavBar and the
  shell chrome throw without it.

### Fixture invariants worth not re-deriving
- `makePraxisCard` MUST satisfy `score = (task_point_value + metatask_points) × display_multiplier
  + points_from_votes`. It previously set none of the three terms (type-unsound, but esbuild
  compiles it anyway), so every stamp read `+ 0 from votes` under a total it could not explain —
  and `scoreBreakdown` deliberately keeps that contradiction legible (#1131). Any cell that
  overrides `score` must override `points_from_votes` too.
- The metatask seal reads `metatask_faction_slug`, NOT `primary_faction_slug`. Without it every
  faction's sticker is labelled `UNAFFILIATED METATASK`.
- `FACTION_SLUGS` now includes `coven`. Albescent stays in the list but has **no palette** —
  it resolves to the neutral default (deliberate, #783).

### Preview-authoring: overlays need containment
Duel seal confirms are `position: fixed; inset: 0` and escape the preview root exactly like the
backdrops do — an element screenshot clips them no matter how tall the viewport is. Each one is
staged inside a `.duel-scope` box whose child is re-scoped to `absolute !important`. Reach for
this recipe for ANY new overlay; do not try to solve it with `viewport`.

### Known render warns (this run, all triaged legitimate)
- `FeedArchiveButton` — a small icon button; its PNG is under the 5 KB blank threshold by nature.
- `WowSigil` takes no tint (its gold is baked in), so a colour-sweep cell would not vary — its
  second cell is a card-sheet ground instead.
- 62 components still show the deliberate floor card. They are fully importable and now fully
  typed; only their preview art is unauthored.

## Re-sync risks (2026-07-30)
- **`.render-check.json` and the review sheets are wiped by every full `package-build.mjs` run.**
  Capture AFTER the final build, or you grade against sheets that no longer match the bundle.
- **A `viewport`/`overrides` edit is not "presentation-only"** — `preview-rebuild.mjs` refuses it
  with `[CONFIG_STALE]`. Run the full build for those.
- `frontend/index.d.ts` sits at the app root while a sync runs. It is gitignored, but if the app's
  own tsconfig ever includes it, expect duplicate-identifier noise — delete it after syncing.
- No `_ds_sync.json` anchor was saved this run, so the diff could not derive `deletePaths`; the
  upload's deletes were reviewed by hand from `list_files`. The freshly uploaded anchor makes the
  NEXT sync incremental again.
- Grades live in the gitignored `.cache/`; what makes them durable is the uploaded anchor.
- Preview grading this run: 12 review sheets inspected individually (at least one per family,
  across 8 factions) plus the tiled contact sheets for the rest, with validate clean at 267/268.

## [2026-07-30, second pass] Re-synced again after 16 more commits on main

- **ADR-0067 deleted the whole mobile praxis-card family** (10 components: the 9
  faction skins + the `MobilePraxisCard` dispatcher) — "the praxis card stops being
  drawn twice". `Rubric` and `VoteStamps` went too. 268 → 258.
- **Ephemerists and Cozy Coven each stopped wearing two identities** (#1207/#1208,
  #1209): the codex surfaces moved onto the Valley plate, the coven.exe surfaces onto
  the candlelit slip. These were RE-SKINS, not deletions — the components stayed, so
  the change lands in `_ds_bundle.js`, not in the per-component card files.
- New: `EphemeristsSigil`, `SidebarHandle`.

### ~~UNFINISHED~~ — RESOLVED by the 2026-07-30 third pass (below)
The feared 70-component drift washed out at the emitted-file level: the driver's diff
found only 7 components whose `.d.ts`/`.prompt.md`/`.html` actually differed from the
anchor. The third pass uploaded the FULL build (all 1,203 files, idempotent), so any
remote lag is repaired regardless.

## [2026-07-30, third pass] Post-#1360 drift + recovery of the orphaned durable set

**The 258-sync durable set was ORPHANED in git.** Commits 8b035fc5/5201403e (the
126→268→258 re-sync: config, previews, NOTES, gen-barrel.mjs, widened fork) were on a
side lineage of `batch/issue-1319` that never merged; the lineage that DID merge (#1360,
squashed as 9852cd0c) carried a stale 126-entry config and overwrote main with it. This
run recovered the whole set via `git checkout 5201403e -- .design-sync frontend/.ds-kit`
and commits it on `claude/design-sync-renames-deletes-e84788`. **Until that lands on
main, any sync from a plain main checkout re-hits the stale-config trap.**

What this pass changed:
- **Removed** `DefaultProfile` + `WowProfile` (mobile profile skins retired by #1360 —
  character profile is responsive-only `*ProfileBody` now). Config, barrel, previews,
  remote files, and the conventions header all updated.
- **Added** `FeedBankFullModal` (fixed-overlay → `single` 460x600), `SidebarColumn`
  (`column`), `CanSignUpEmpty` — the only new files in scoped families since the 258
  baseline. All three ship as floor cards; authorable on any later re-sync.
- **Deleted 5 orphaned `_preview/Albescent*.js`** on the remote (FeedFrame, PraxisDetail,
  TaskCard, TaskDetail, Vote) — 268-era compiled previews whose components are now
  auto/floor cards. They were invisible to anchor diffs (the anchor never knew them);
  found by comparing `list_files` against the final `ds-bundle/`. `deleted:14` of 17 —
  the 2 `_preview/*.css` and 1 js were already absent (expected not-found continue).
- Diff verdict: 256 unchanged / 0 renderHash-changed / 3 added / 2 removed; capture
  worklist empty; nothing to re-grade. Render check full: 259 total, the only `bad` is
  the known FeedArchiveButton 4.8KB icon (blank-threshold artifact).
- Uploaded via atomic full-writes (1,203 files), sentinel-fenced, anchor written last.
  Remote now byte-mirrors the build; fresh anchor makes the next sync incremental.

## [2026-07-30, fourth pass] The rename/organize wave (#1395-#1407), same day
Main moved again mid-session: #1404 renamed *Home->*FieldDesk, UnaffiliatedVote->DefaultVote,
MetaTaskSeal->MetataskSeal (CASE-ONLY - existsSync cannot see it, the readdir check in
.design-sync/.cache/apply-renames.mjs can); #1399/#1403 collapsed the 14 duel-seal files to 8
responsive ones (7 *MobileDuelSealConfirm deleted, DuelSealSheet created); #1407 split
components/cards/ into taskCard/factionHero/sigil/factionCard/selectCard (+factionMarks moves)
and moved the metatask pickers under components/metataskSeal/. Map 253 now. #1404/#1407 also
maintained .design-sync ON MAIN against the stale 126 map - merged here, kept the 258-line
config, re-applied their renames. Diff verdict: 8 added / 14 removed / 0 renderHash-changed;
5 FieldDesk renames + 2 render-churn canaries re-graded good. Upload 2: full writes (1,172),
232 regroup deletePaths (216 deleted, 16 _preview/*.css not-found - expected), fresh anchor.
Remote verified as an exact mirror both directions.
