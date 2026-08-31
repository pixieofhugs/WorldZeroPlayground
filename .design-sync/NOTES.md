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
  inside the preview harness, never in a shipped design), it supplies `AuthContext` directly
  with a mock authed UA user so auth-gated UI (vote rungs, comment composer, signup buttons,
  NavBar) renders its real state instead of a login gate; requests are not intercepted at all,
  so anything a preview fetches behaves like the offline app. It used to fake `GET /auth/me`
  (and `GET /factions`) through axios' adapter; #1400 retired axios, and `openapi-fetch` binds
  `globalThis.fetch` at client creation — before this module's body runs — so a transport stub
  installed from here would never be consulted. It also sets `i18n.options.saveMissing=false`
  so a missing copy key renders the key instead of throwing (dev-mode i18n throws and blanks
  the whole card).
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

---

## [2026-08-11] Re-sync after ~2 weeks of drift (253 → 252)

First pass in this file's history where **the component map needed no repair**: 0 dead
paths, 0 case-renames. #1404/#1407's habit of maintaining `.design-sync` on main has
held, and the four components deleted upstream since the last anchor
(`FactionSigilRow`, `FilterFactionTabs`, `FilterStamps`, `MobileUpdates`) were already
out of the map. Don't skip the check — just expect it to pass now.

### Three families were a sibling short
`AlbescentProfileBody`, `WowFactionBody` and `EphemeristsMasthead` landed upstream after
the last sync into directories where every other member was already mapped (8 of 9
profile bodies, 7 of 8 faction bodies, 1 of 2 mastheads). Added with the overrides their
siblings use (`single`/`1200x900` for the two page bodies; none for the masthead, like
`SnideMasthead`) plus an authored preview for the masthead. **On any re-sync, diff the
archetype directories against `componentSrcMap` — a new faction skin is a silent gap,
not an error.** The two page bodies ship the floor card, consistent with their families.

### Resolved since last time
- **The `AlbescentInvitation` duplicate-key risk is GONE.** `factions.json` no longer has
  a duplicated `albescent.invitation`; the key was restructured into `sealed`/`letter`.
  The letter renders real copy and the component grades good, exactly as the old note
  predicted. That entry in the 2026-07-15 risk list is dead — ignore it.
- **`i18next` + `react-i18next` are real dependencies now.** The old
  `npm install --no-save i18next@^26 react-i18next@^17` workaround is obsolete; a plain
  `npm ci` in `frontend/` is enough.

### Running this sync inside the Claude Code web sandbox (READ THIS FIRST)
This environment has no browser egress, and that shapes the whole verification step.

- **Do NOT run `npx playwright install`.** `cdn.playwright.dev` is 403 by egress policy,
  and the installer still **exits 0** after failing — it will lie to you. Browsers are
  pre-baked at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is already set).
- **The cached build is `chromium-1194`, which pins playwright `1.56.0`.** The repo's own
  `@playwright/test` is 1.61.1 and pins chromium 1228, which is NOT present. Install the
  matching one for the converter: `cd .ds-sync && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.56.0`.
  (Revision → version map, if the cache ever moves: 1178=1.53, 1181=1.54, 1187=1.55,
  1194=1.56, 1200=1.57, 1208=1.58.)
- **Chromium cannot reach the network at all**, so the kit's remote Google-Fonts `@import`
  in `_ds_bundle.css` hangs ~12.9s per page and then `ERR_CONNECTION_RESET`. Everything
  local loads in ~120ms; the font request is the entire cost. A full 252-preview render
  check therefore takes ~50 minutes.
- **Things that do NOT fix it — don't burn an hour rediscovering this:** `/etc/hosts`
  (chromium uses its own resolver), `--host-resolver-rules` even as `MAP *`, playwright's
  `proxy:` launch option, and shimming the `chrome` / `headless_shell` binaries. The flag
  never reaches the browser process; the container's HTTPS proxy reaches
  `fonts.googleapis.com` fine from curl, but chromium bypasses it.
- **Consequence for grading:** local screenshots render in **fallback fonts**. The shipped
  CSS is untouched and the DS pane loads the real faction webfonts, so this is a
  verification limit, not a product defect — but text wraps differently in the sheets
  (e.g. `EverymenFactionHero` breaking "Everyme/n"), and **typography is the one thing you
  cannot grade in this environment**. Grade layout, tokens, colour and composition.
- **`validate` uses `waitUntil: 'networkidle'` with a 15s cap**, so the ~12.9s font stall
  leaves only ~2s of headroom and a page near the margin fails spuriously. This run
  `AlbescentFeedFrame` tripped `[RENDER] page.goto: Timeout 15000ms` and was fine on
  individual re-check (1325 chars of DOM). **A lone `[RENDER]` timeout here is a flake —
  re-verify it individually before treating it as a defect.**

### Known render warns (this run, all triaged legitimate)
- `FeedArchiveButton` (4.8 KB) and `MediaArt` (4.7 KB) trip the <5KB blank threshold —
  the first is a small icon button by nature, the second is unauthored and paints an
  empty media frame with no src.
- `CommentThread` — `variants render identically`: it fetches its own comments and previews
  have no network, so both cells show the composer/empty state. Long-standing, not new.
- The sigils (`Albescent`, `Coven`, `Ephemerists`, `Everymen`, `Snide`) and `Lotus` report
  `mounts have no text and paint nothing` — they are pure SVG marks with no text node.
- `PointsRoundel`, `ChipRow`, `CovenFeedFrame`, `FeedChassisBand`, `FeedUndoStrip` report
  `mounted text is just "<Name>"` — unauthored, crash-prevention props fill the label slots
  with the component name. Floor tier, not failures.
- `[FONT_REMOTE]` and `[TOKENS_MISSING]` (33 `--tw-*` vars set at runtime by Tailwind) —
  both expected, both non-blocking.

### Grading basis this run
126 of 252 components had a genuinely changed `renderHash` (unlike the 2026-07-15 pass,
where the churn was purely `sourceKey`). All 16 tiled contact sheets cover every component;
8 were read closely across all 8 factions, plus individual review sheets for
`EphemeristsMasthead` (new), `EverymenCard` (override changed), `AlbescentInvitation`
(previously needs-work) and `CommentThread` (warn). 361 cells across 153 components graded
good.

### Re-sync risks (2026-08-11)
- **The render check is time-expensive and slightly flaky here** (above). Budget ~50 min and
  expect to hand-verify the odd `[RENDER]` timeout. If a future environment has browser
  egress, both problems vanish.
- **`EverymenCard` now carries `cardMode: column`** because its three stories are wider than
  a grid cell. If the recruiting poster ever narrows, the override becomes unnecessary.
- The generated inputs still must be regenerated before every build, unchanged from before:
  `gen-kit-css.mjs`, the `tsc --declaration` tree into `frontend/ds-types/`, then
  `gen-barrel.mjs`. All three are gitignored.
- `.design-sync/overrides/source-kit.mjs` is still exactly 2 deltas from the bundled
  `lib/source-kit.mjs` (header comment + relative imports, and the widened `GENERIC_DIR`).
  Upstream has not moved under it.
- The ensō is still the only `url(/…)` app-served asset (`grep -rn "url(/" frontend/src`);
  `gen-kit-css.mjs` inlines it at ~41 KB. A new one would need the same treatment.

### Upload record (2026-08-11)
Atomic full-writes: 1,167 content files + sentinel + anchor, in 5 group-batched calls
(≤256/call, `_vendor` isolated because `react.js` is ~1.1 MB). `deletePaths` 24 → 18
deleted, 6 not-found (the `_preview/*.css` of floor-card components — the expected
continue-past case). Post-upload `list_files` diff: **0 missing**, and the 61 remote
extras are the same hand-uploaded handoffs as ever (`mobile-system/`, `templates/`,
`screenshots/`, `design_handoff_*`, `uploads/`) plus app-generated `_ds_manifest.json`
and `_adherence.oxlintrc.json`. Leave those alone — they are not converter output.

---

## [2026-08-17] Re-sync after the font self-hosting (252 → 268)

Ran from a fresh worktree at `origin/main` dbf723ea with **no open PRs** — despite a
"things are in flight" warning, git was quiet. All the drift was inside the toolchain.

### The fonts moved out from under the generator — READ THIS FIRST
`#1977` self-hosted all 18 families and `#2079` split the faction faces off the critical
path. Consequences, in the order they bite:

- **`gen-kit-css.mjs` hard-failed**: it harvested a Google-Fonts `<link>` from
  `frontend/index.html`, and that `<link>` is gone. The harvest is deleted.
- **`src/fonts.css`** (the shell's 3 families) IS `@import`ed by `index.css`, so the
  Tailwind compile picks it up on its own. **`src/fonts.faction.css`** (the other 15,
  62 rules) is `@import`ed by NOTHING — it rides a faction chunk. The generator now
  appends it explicitly, exactly like `motion.ornament.css`. Skip that and the kit ships
  3 of 18 faces and every faction surface paints a fallback — which reads as "the type
  looks a bit off", not as a missing asset.
- **`extractFonts()` resolves `url()` relative to the stylesheet's OWN directory**
  (`lib/css.mjs` passes `dirname(explicitCss)`), i.e. `.ds-kit/`, NOT `src/`. Step 2c
  rewrites the faces to `../src/assets/fonts/…` for that reason. An unresolvable src is
  dropped SILENTLY, so a wrong path here costs the whole family with no error.
- Result: **83 `@font-face` rules, 46 woff2 copied into `fonts/`, 21 families.** The kit
  is now fully self-contained and previews render in the REAL faces with no network.
  The old `[FONT_REMOTE]` warn is gone for good.

**`_ds_bundle.css fonts: 82 url(s) rewritten, 82 dead @font-face block(s) dropped` is
NOT a failure.** `rewriteBundleFontFaces` drops any block whose url is not bare
`./fonts/…`; our rebased urls are quoted, so its dead-check matches and drops them all.
That is the designed safety net — `styles.css` `@import`s `fonts/fonts.css` FIRST and the
bundle copy would otherwise shadow it. The working faces live in `fonts/fonts.css`
(verified: 82 rules, 0 missing files). Do not "fix" this by unquoting without re-checking
which sheet wins.

**`[FONT_MISSING]` now names only 4 families — Marker Felt, Trajan Pro, Impact,
Trebuchet MS.** These are genuine SYSTEM fonts referenced by `--faction-*-card-font`;
no woff2 exists to ship. Expected, not actionable.

### gen-barrel emitted ZERO typed re-exports (silent, catastrophic)
`tsc`'s `rootDir` is INFERRED from what it actually compiled. Something outside `src/`
is reachable now (there is a `ds-types/e2e/` tree), so rootDir backed up to the package
root and declarations land at `ds-types/src/<stem>.d.ts` instead of `ds-types/<stem>.d.ts`.
The old probe checked one path, found nothing, and wrote `0 typed re-exports` — which
ships `[key: string]: unknown` as EVERY component's API contract, the exact failure the
2026-07-30 pass fixed. `gen-barrel.mjs` now probes both layouts. **Check the
"wrote frontend/index.d.ts: N typed re-exports" line every run; N must equal the map size.**

### A second app-served mask asset appeared
`AlbescentSigil` paints through `url(/factionMarks/labyrinth.svg)` — same trap as the
ensō, nothing serves that path inside a design. `gen-kit-css.mjs` now inlines BOTH from a
`MASK_ASSETS` list (46 KB total). Re-run `grep -rn "url(/" frontend/src` each sync; today
it returns exactly those two.

### Map 241 → 268, and the anchor disagreed with the config in BOTH directions
- **0 dead paths, 0 case-renames** — the third clean run in a row.
- **27 unmapped components had accumulated** in already-mapped directories. The split is
  clean and mechanical: PascalCase file + `export default` (or a same-named export) = a
  real component; lowercase file (`shared.tsx`, `covenSlip.tsx`, `uaAtoms.tsx`,
  `wowLists.tsx`, `controls.tsx`) = an internal helper, correctly excluded. Added:
  SignInOptions, StartHereMark, RosterAvatar (named export), 6 factionMarks
  (CovenCauldron, DefaultPointsRing, EphemeristsRuneStrip, SingularityLamps,
  SingularityProcessLight, SingularityReadout), PendingBadge, CardMasthead,
  RelationshipBlockControl, 3 players pieces, 2 praxes, 2 tasks — plus three genuinely
  NEW families: `ui/FilterBar` (SegmentedRail, OptionPicker), `pages/onboarding`
  (OnboardingCard, IntroCard, AuthCard, TermsCard) and `pages/updates`
  (UpdatesFilterBar, RequestsQueue). Route-level `src/pages/*.tsx`, `src/auth`, hooks and
  `pages/admin` stay OUT of scope, as always.
- **The remote anchor held 252 while main's config had 241** — 14 the config no longer
  maps (Constellation, the 8 `*FactionPage` mobile skins ADR-0078 retired, DefaultPlayers,
  Meadow, RosterTable, SkyCanvas, SkyLegend) and 3 it maps that the anchor never had
  (DesktopPlayers, MobilePlayers, WowCard). **Do not assume config ⊇ anchor.**
- New overrides: the four FilterBars + SegmentedRail get `cardMode: column`, same
  precedent as FilterLevelNodes.

### conventions.md drift (validated, one real error)
`DefaultPlayers` was named as a mobile-only singleton and does not exist — it was retired
with the other form-factor splits; the diff's `removed` list confirmed it independently.
Replaced with the true statement: **players is the one surface still split by form
factor** (`MobilePlayers` / `DesktopPlayers`). All 18 tokens and the other 28 component
names in the header verify against this build.

### Known render warns — ADDITIONS to the standing list
- **`SingularityLamps` (4.9 KB)** and **`SidebarHandle` (4.7 KB)** now join
  `FeedArchiveButton` / `MediaArt` under the <5 KB blank threshold. Both were inspected:
  Lamps is the terminal's three traffic-light dots, SidebarHandle is a single chevron.
  Genuinely tiny, rendering correctly. Not defects.
- `CovenCauldron`, `DefaultPointsRing` report `mounted text is just "<Name>"` — new
  unauthored floor cards, same class as ChipRow/PointsRoundel.
- This build emits **`_preview/<Name>.js` only — no `_preview/*.css`**. 20 of the 84
  deletePaths were therefore not-found; that is the expected continue-past case.

### Windows / local-machine setup (this run ran on Molly's box, not the web sandbox)
- A fresh worktree has NO `frontend/node_modules` and NO `.ds-sync/`. Junction the former
  from the main checkout — **use PowerShell `New-Item -ItemType Junction`; Git Bash mangles
  `mklink /J`'s target into `\C:\…`** and a relative target silently nests.
- Playwright: the box caches **chromium-1228**, which pins **playwright 1.61.1** (the
  repo's own `@playwright/test` version). Install it into `.ds-sync` with
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.61.1`. A full 268-preview render
  check takes ~5 minutes here — the ~50-minute figure in the 2026-08-11 note is a
  web-sandbox artifact (no font egress) and does NOT apply locally.
- **Do not pipe the driver through `tail`** when backgrounding it — the pipe buffers and
  you see nothing until it exits. Redirect to a log file instead.
- `npm run typecheck:design-sync` passed clean before the build — the CI guard is holding,
  no preview prop drift this run.

### Order-of-operations trap that cost a full render pass
Edit `.design-sync/conventions.md` **before** the driver run. The README is stitched at
build time, so a header edit made mid-run means the whole driver (build → validate →
capture, ~5 min over 268 previews) has to run again. Settle config AND conventions first.

### Upload record (2026-08-17)
Atomic path. 1,271 content files in 8 `write_files` calls (component groups of ≤256;
`_ds_bundle.js` alone at 4.5 MB; fonts+vendor together; the 146 previews last), sentinel
fenced at both ends, anchor absolutely last. Deletes 84 → **64 deleted, 20 not-found**
(the `_preview/*` of floor-card components). Post-upload `list_files`: **0 missing**, and
the 64 remote extras are the same hand-uploaded handoffs as ever (`mobile-system/`,
`templates/`, `screenshots/`, `design_handoff_*`, `uploads/`) plus app-generated
`_ds_manifest.json` and `_adherence.oxlintrc.json`. Leave those alone.

**Token cost warning**: `write_files` needs every path spelled twice (`path` +
`localPath`), and 1,271 files is a lot of context. The layout is perfectly uniform —
`components/<group>/<Name>/<Name>.{d.ts,html,jsx,prompt.md}` + `_preview/<Name>.js` — so
read only the `<group>/<Name>` pairs and GENERATE the four paths each. Reading full path
lists doubles the cost for nothing.

## Re-sync risks (2026-08-17)
- **The font wiring is now the most fragile part of this sync.** If `scripts/fetch-fonts.mjs`
  regenerates the sheets, if a family moves between `fonts.css` and `fonts.faction.css`
  (`factionFaceSplit.test.ts` guards that boundary), or if the woff2 land anywhere but
  `src/assets/fonts/`, `gen-kit-css.mjs` step 2a/2c needs updating. Verify after every
  build: `@font-face` count in `frontend/.ds-kit/kit.css` should be 83, and
  `ds-bundle/fonts/` should hold 46 woff2 + `fonts.css`.
- **`gen-barrel.mjs`'s typed-re-export count is the canary for the whole `.d.ts` contract.**
  Anything that changes what `tsc -p tsconfig.json` pulls in moves the emit tree again.
- A new `url(/…)` asset under `frontend/public/` needs adding to `MASK_ASSETS`.
- The three new families (`filterbar`, `onboarding`, `updates`) all ship floor cards —
  authorable previews on any later re-sync, starting points for whoever wants them.
- `AuthCard` renders real but PLACEHOLDER copy ("PLACEHOLDER — the title of the sign-in
  stop"). That is the onboarding component's own unfinished i18n, not a sync defect.

### [2026-08-17, second pass] Main moved 14 commits mid-run — re-synced before the PR

Between the first upload and opening the PR, `origin/main` advanced 14 commits. Re-syncing
caught a rename that would otherwise have shipped stale, so **always re-check `origin/main`
immediately before the PR, not just at the start.**

- **Main maintains `.design-sync/` itself.** Those commits touched `config.json` (renaming
  `VoteSummary` → `VoteError`, following `VoteShell.tsx`'s exports) AND six
  `previews/*FactionHero.tsx` plus `_fixtures.tsx` / `_state.tsx`. **Merge, never
  overwrite** — `git merge origin/main` auto-merged the config cleanly (my 27 additions +
  their rename, still 268).
- **`frontend/.ds-kit/index.tsx` conflicts on every such merge and that is fine** — it is
  GENERATED. Resolve by re-running `gen-barrel.mjs` against the merged config, never by
  hand-editing the conflict markers.
- Diff after the merge: **261 unchanged / 6 changed / 1 added (VoteError) / 1 removed
  (VoteSummary)**, 6 deletePaths. The 6 changed are the `*FactionHero` skins — main's
  wordmark-wrap work. `EVERYMEN` now sets on one line instead of clipping; graded good.
- **Canary fired with `trigger: render_churn`** over 47 components and picked 5 sheets
  (AlbescentPraxisCard, SnidePraxisCard, SnideTaskDetail, EphemeristsFieldDesk, ScoreStamp).
  Spot-checked ScoreStamp across all 9 faction stamps — arithmetic and skins intact, no
  divergence, so carried-forward grades stand. That is the expected outcome of pipeline
  churn; only re-grade if the sampled sheets actually diverge.
- Render check identical to pass one: 268 total, the same 3 triaged blank-threshold
  components, the same 21 warns.

**Upload was deliberately SCOPED this pass** — 56 components + previews + bundle + styling,
not the full 1,271. Justification, which must ALL hold before doing this again: the remote
had just been verified a 0-missing mirror of the anchor being diffed against; `upload.components`
is sourceHashes-based, so the other 212 were provably byte-identical; and no font or vendor
source changed (`git diff` over the range showed nothing under `assets/fonts`). Post-upload
`list_files`: **0 missing, 0 converter-owned extras.** If any of those premises is not
verifiable, fall back to §5's full-writes default — it is the safe one.

---

## [2026-08-18] Third round — 8 more commits, and two GRID_OVERFLOW warns nobody had recorded

Ran the morning after #2189 merged; `main` had taken 8 commits (S.N.I.D.E.'s single ground,
the task-detail reorder, the roster-pill/display-name fix, the Coven identity band, the task
crown's light-mode ring). Two PRs were open and unmerged, so this synced `main`'s HEAD.

- **Zero component churn**: 268 unchanged, 0 added / 0 removed / 0 verification-changed, map
  clean (0 dead, 0 case-renames) for the third round running. What moved was RENDERING —
  29 components' emitted files plus the bundle and `_ds_bundle.css` (`index.css` changed).
  This is the `sourceKey` vs `renderHash` split from 2026-07-15 seen from the other side:
  the verification partition can be entirely `unchanged` while `upload.components` is 29.
  **Never scope an upload by the verification partition** — they answer different questions.

### Two warns that had been hiding in plain sight
`[GRID_OVERFLOW]` on `FeedCardCollabInvite` (Accepted, Pending) and `EphemeristsSeal`
(Applied, LongCondition, Removable) — NOT new (warn totals were 21 in the previous two
rounds as well), just never surfaced, because my earlier warn greps matched
`RENDER_|FONT_|TOKENS_` and that tag matches none of them. **Grep `^! \[` and read the
whole list, not a pattern you guessed.**

Both were real, not cosmetic-noise: the collab-invite card squeezed to one word per line
with its COLLAB button clipping the cell edge; the Ephemerists seal clipped its removable
affordance. Both are full-width rows in a 3-column grid → `cardMode: column`, the same
precedent as `FeedChassisBand` / `EverymenCard`. Fixed; `[GRID_OVERFLOW]` is gone and the
warn total dropped 21 → 19.

**An `overrides` edit forces a FULL driver re-run** (`preview-rebuild.mjs` refuses it with
`[CONFIG_STALE]`) — budget the extra ~6 minutes, or batch override edits before the first
build of a round.

### Known render warns — current standing list is 19
Unchanged from the previous round: the 3 blank-threshold components (`MediaArt`,
`SingularityLamps`, `SidebarHandle`), the sigil/floor-card `[RENDER_THIN]` set,
`CommentThread` variants-identical, `[TOKENS_MISSING]` (34 `--tw-*`), and `[FONT_MISSING]`
naming the 4 system families. If a future run sees anything outside that set, it is new.

### Upload record (2026-08-18)
Scoped again — 31 components + their previews + README/styles/`_ds_bundle.css`/`_ds_bundle.js`
= 161 files, no deletes. Same three premises verified as last round (remote was a confirmed
0-missing mirror of the anchor being diffed; `upload.components` is sourceHashes-based; no
font or vendor source touched in the range). Post-upload `list_files`: **0 missing, 0
converter-owned extras**, same 64 hand-uploaded handoffs.

### The standing lesson from three rounds in two days
`main` moves faster than a sync takes. **Re-check `origin/main` immediately before opening
the PR, every time** — round two caught a `VoteSummary` → `VoteError` rename that would have
shipped a component that no longer existed. The re-sync itself is cheap when nothing changed
(the driver skips capture for unchanged components); it is the not-checking that is expensive.

---

## [2026-08-22] Fourth round in five days — 264 → 278, and the scan that had been
## lying since 2026-08-02

Ran from a fresh worktree at `origin/main` 9e17fc66. 96 commits of drift since the
08-18 round. Map health clean for the fifth round running (0 dead paths, 0
case-renames) — but the *unmapped* side was not.

### The dir-scoped scan is blind to whole directories — this is the standing bug
Every previous round found new components by walking **the directories the map already
covers**. That silently cannot see a component in a directory nothing is mapped from.
This round's wider walk (all of `src/components` + `src/pages`, minus route-level
`pages/*.tsx` and `pages/admin`) found 14, and two of them were **long-standing
gaps, not new work**:

- `PendingRowPill` (`src/pages/fieldDesk/`) — landed **2026-08-02**, missed by three syncs.
- `MobileStickyBar` (`src/pages/factionDetail/`) — landed **2026-08-16**, missed by two.

Neither directory had a single mapped entry, so both were invisible. `components/nav/`
was the same story for `Breadcrumb` (#2102, 08-18). **Walk the whole tree every round**
— `.design-sync/.cache/newdirs.mjs` (regenerate it; it is gitignored) does exactly this
and prints unmapped hits split by known-vs-unknown directory.

The other 12: the eight `selectCard/*SelectCard` faction skins (#2324/#2329 et al split
the per-faction tiles out of `FactionSelectCard`, which stayed as the dispatcher),
`CardCtaControl` (#2359), `EphemerisNet` (#2144), `EphemeristsGloss` (#2148).

### `TheArray` is mapped nowhere on purpose
`src/components/TheArray.tsx` (#1869, Singularity's console perk) has a default export
and passes every "is this a component" filter — and `return null` is its whole render.
Its output is `console.log`. There is nothing for a design agent to build with and no
preview can ever show it. **Deliberately excluded**; do not "fix" this next round.

### `grep -c "@font-face"` LIES — it counted 64 of 83
`gen-kit-css.mjs` appends the faction sheet verbatim (62 rules, one per line) but the
Tailwind-compiled shell block is **minified onto a single line** carrying ~20
`@font-face` rules. `grep -c` counts matching LINES, so the standing "should be 83"
check reads 64 and looks like 19 dropped families. Nothing was wrong.
**Use `grep -o "@font-face" … | wc -l`.** Verified this round: 83 rules, 21 families,
46 woff2, 2 mask assets inlined — all as the 08-17 note describes.

### The type scale is INVERTED, and it cost a render cycle
    --text-xs 8px   --text-sm 9px    --text-base 10px  --text-md 11px
    --text-lg 12px  --text-xl 14px   --text-title 24px --text-heading 32px
    --text-display 42px  --text-content 18px
`--text-xl` (14px) is **smaller** than `--text-content` (18px), and `--text-sm` is 9px,
not 14. A caption under 18px body copy wants `--text-xl`. Reaching for `--text-sm`
because it "sounds like a caption" ships 9px type.

### Token names that do NOT exist (all four were invented and all four compiled)
CSS variables fail silently — an unknown `var()` just yields nothing, so a preview using
a wrong name renders unstyled and *looks* like a component bug. These bit this round:

| wrote | actual |
|---|---|
| `--color-accent` | `--color-accent-primary` |
| `--color-accent-ink` | `--color-text-on-accent` |
| `--color-bg` | `--color-bg-page` |
| `--color-text` | `--color-text-primary` |
| `--faction-<slug>-card-ink` | `--faction-<slug>-card-text` |
| `--faction-ephemerists\|coven-card-frame` | `…-card-border` (only `ua` has `-frame`) |

**Grep every `--token` in a preview against `ds-bundle/_ds_bundle.css` before grading.**
One line does it:
`grep -ho -- "--[a-z0-9-]*" previews/*.tsx | sort -u | while read t; do grep -q -- "$t:" ds-bundle/_ds_bundle.css || echo "MISSING $t"; done`

### Two components whose contract is not what the prop names suggest
- **`EphemeristsGloss.ordinal` picks the CLOCK, not the cast.** `clockFor(ordinal)` sets
  the animation timing; the visible frame starts at 0 (the plain-English reading) and
  advances only in `onAnimationIteration`. **A static capture always catches English** —
  there is no prop that pins cuneiform/Arabic/Japanese. A preview that "sweeps the script
  axis" by varying `ordinal` renders four identical cells. The rotation is real in a live
  browser and is covered by `ephemeristsScriptTurn.test.tsx`.
- **`EphemerisNet` is `position:absolute; inset:0; z-index:-1`.** It needs a host that is
  a stacking context (`isolation:isolate` or positioned + z-index) **with its own fill**,
  or it sits below the fill and paints nothing. Its preview mounts every cell on a real
  plate; an unmounted cell is a blank card, not a broken component. `opacity` is required
  — the three ruled weights are 0.17 page ground / 0.10 card or plate / 0.17 task brief.

### TWO POPUP CARDS HAD BEEN SHIPPING A 48-PIXEL SLIVER — for how long, nobody knows
The canary picked `LevelUpPopup` this round and its review sheet was a bare `CONTINUE`
strip. Not a regression — a long-standing preview defect that no check catches:

- `.render-check.json` said `bad:false`, `thin:false`, `blank:false`. Its `texts` field
  held the **entire modal** ("LVL2 Level Reached Ranger Now Unlocked … Continue"), so
  every text-based heuristic passed. Only `maxHeight: 48` gave it away.
- Cause: the modal's root is `position: fixed`, which escapes an element screenshot. Its
  preview leaned on `cardMode:single` + `viewport` alone — and **`viewport` does not
  contain a fixed overlay**, exactly as the 2026-07-30 note says in the sentence
  "do not try to solve it with `viewport`". The backdrops and duel confirms carry a
  containment wrapper; these two never got one.
- `InvitationLetterPopup` had the identical defect (also `maxHeight: 48`). Both now use
  the standing `.popup-scope > div { position: absolute !important; inset: 0 !important }`
  recipe inside a sized, positioned box, and both render their full letter — the
  invitation retinting across ua/snide/ephemerists/wow is visible for the first time.
- Viewports were too short once the bodies actually rendered, so `LevelUpPopup` went
  `460x600 → 460x800` and `InvitationLetterPopup` `460x600 → 520x920`.

**Sweep for this every round — it is one line and no other check finds it:**
`node -e "require('./ds-bundle/.render-check.json').filter(e=>e.maxHeight<120).forEach(e=>console.log(e.name,e.maxHeight))"`
then check each hit's preview for a containment wrapper. `FactionsDirectoryView`
(maxH 117) was inspected this round and is genuinely short — not an escapee.

### Main moved 2 commits mid-run, again (fourth round in a row this has happened)
#2456 (Albescent drift stops at user media — touches the feed and task detail) and #2454
landed between the first driver run and the upload, and #2456 carried **+86 lines of
`index.css`**. Merged and re-ran the whole chain rather than shipping a stale bundle.
The merge was a clean fast-forward (stash → merge → stash pop). **Re-check `origin/main`
immediately before `finalize_plan`, every single time.**

### conventions.md — validated, zero drift
All 18 semantic tokens, 7 Tailwind classes and 30 named components verify against this
build. The only "failures" a naive validator reports are `--faction-albescent-*`, which
the header itself correctly says do not exist (albescent resolves to the neutral
`default` palette, #783) — **do not "fix" that by adding albescent to a token sweep.**

*Proposed addition, not applied* (the header belongs to its authors): a two-line note on
the inverted `--text-*` scale. The design agent gets the header and nothing else, and
`--text-sm` = 9px is the single most likely way for it to ship type at a third the
intended size.

### Known render warns — still exactly 19, and two DROPPED
Unchanged set from 08-18. Two long-standing warns are **gone** and that is an
improvement, not a miscount: `AlbescentSigil` no longer reports `paints nothing` (the
labyrinth mask inlining took), and `FeedArchiveButton` is no longer under the 5 KB blank
threshold. Current 19: 3 blank-threshold (`MediaArt`, `SingularityLamps`,
`SidebarHandle`), the sigil/floor-card `[RENDER_THIN]` set (`CovenSigil`,
`EphemeristsSigil`, `EverymenSigil`, `SnideSigil`, `Lotus`, `CovenCauldron`,
`DefaultPointsRing`, `PointsRoundel`, `ChipRow`, `AlbescentFeedFrame`, `CovenFeedFrame`,
`FeedChassisBand`, `FeedUndoStrip`), `CommentThread` variants-identical,
`[TOKENS_MISSING]` (34 `--tw-*`), `[FONT_MISSING]` (the 4 system families).
**Grep `^! \[` and read the whole list** — a pattern guess misses `[GRID_OVERFLOW]`.

### One warn WAS new, and it was mine
A `[GRID_OVERFLOW]` fired on `EphemeristsGloss` (`ClocksAtRest`) — an authored cell of
mine that put three glosses in one wide row. Rather than take the `cardMode:column`
remedy, the cell was **deleted**: its three variants are identical *by definition* (the
ordinal is a clock, not a cast), so it was a `variantsIdentical` smell as well as an
overflow, and the preview's header comment already carries the knowledge it existed to
convey. A comment in the file says so, to stop a future round re-adding it.

### A cosmetic issue worth a look, not filed
`EphemeristsSelectCard`'s header overlaps: the "EXHIBIT C · NO SINGLE HERE" eyebrow and
the transit notation block collide at the right edge at the tile's fixed 360×300. Visible
in `_screenshots/review/selectcard__EphemeristsSelectCard.png`. Component-owned layout at
its natural size, not a preview or sync defect.

## Re-sync risks (2026-08-22)
- **The unmapped-component scan must walk the whole tree**, not the mapped dirs. Two
  components hid for three weeks. This is the highest-value check in the whole round.
- **`TheArray` will keep showing up** in any PascalCase sweep. It is excluded on purpose.
- The eight `*SelectCard` skins and `FactionSelectCard` are a dispatcher + leaves family
  now — if another faction tile is split out, it is a silent gap exactly like these were.
- `FactionSelectCard.tsx`'s own preview docstring says the retired `gestalt` slug resolves
  to **Wow**; the component's map says `gestalt: "coven"`. The comment is stale (harmless,
  the cell renders whatever the map says). Fix on any round that touches that preview.
- Preview grading this round: all 14 new components authored and graded from individual
  review sheets (54 cells, all `good`), plus `EphemeristsMasthead` re-graded and all 5
  canary `[SPOT_CHECK]` picks confirmed against their sheets with no divergence.

### Upload record (2026-08-22)
Atomic path. Scoped writes, justified by the three standing premises (remote was a
verified 0-missing mirror; the fetched anchor matched the diffed one BYTE-FOR-BYTE
immediately before `finalize_plan`; `upload.components` is sourceHashes-based): bundle +
`_ds_bundle.css` + `styles.css` + README + 2 vendor + 47 fonts, the 64 leading component
dirs, the 90 changed dirs, and all 157 previews = 616 component files + 157 previews +
55 shared, in 8 `write_files` calls. Deletes 25 -> **23 deleted, 2 not-found**; the 5
`_preview/*.css` paths the diff listed returned 0 (this build emits only `_preview/*.js`).
Sentinel fenced at both ends, anchor absolutely last. Post-upload `list_files`:
**0 missing**, 1388 remote entries vs 1324 local, and the 64 extras are the same
hand-uploaded handoffs as ever (`mobile-system/`, `templates/`, `screenshots/`,
`design_handoff_*`, `uploads/`) plus app-generated `_ds_manifest.json` and
`_adherence.oxlintrc.json`. Leave those alone.

## [2026-08-25] Fifth round — 278 → 305, and the white card ground the kit had
## always been shipping

Ran from a worktree at `origin/main` d3f98246. 115 commits of drift since 08-22.
Map health clean for the sixth round running (0 dead paths, 0 case-renames).

### The whole-tree scan earned its keep again — 25 unmapped, and a whole new directory
`newdirs.mjs` (regenerate it; gitignored) found **25** components no sync had ever
seen. Twelve were faction-skin siblings whose families were already mapped
(`AlbescentBackdrop`, `AlbescentAvatar`, `DefaultAvatar`, `AlbescentComment`,
`AlbescentDuelSealConfirm`, `AlbescentEditPraxis`, `AlbescentFactionBody`,
`AlbescentFactionHero`, `DefaultFactionHero`, `AlbescentFieldDesk`,
`AlbescentScoreStamp`, `DefaultFeedFrame`), five were the `*CreateCharacter` plates
that #2473's dispatch split out, two were `ReturningCard` / `JoinControl` — and
**six were a directory nothing had ever been mapped from**: `pages/settings/`
(`SettingsCard`, `SettingsRow`, `SettingsSwitch`) and `pages/settings/sections/`
(`AccountSection`, `AppearanceSection`, `CookiesSection`), all from #2153/#2154/#2155.
Exactly the standing bug the 08-22 round named. **Walk the whole tree every round.**

Three more (`EphemeristsCreateCharacter`, `SnideCreateCharacter`, `WowCreateCharacter`)
were mapped by their feature PR but never uploaded — the diff caught them as `added`.

`DefaultSettings` was **removed** (#2154 deleted `settings/mobileArchetypes/`); its four
component files plus two `_preview/*` are this round's deletes.

### THE PREVIEW CARD TEMPLATE PAINTS THE BODY WHITE, AND THIS KIT DEFAULTS TO DARK
The single highest-value finding of the round, and it had been shipping since the
first sync. Every generated card carries an inline `body{...;background:#fff}` which
beats the kit's own `body{background-color:var(--color-bg-page)}` from index.css on
source order. `DEFAULT_THEME` is `'dark'` (`hooks/useTheme.tsx`), so `[data-theme=dark]`
hands every component cream ink — and any component that does not paint an opaque
ground of its own then renders **cream on white**.

The page archetypes are the whole class: `FieldDesk`, `CreateCharacter`, `EditPraxis`,
`FactionBody` all expect the page ground a layout wrapper gives them in the real app.
`DefaultFieldDesk` and `DefaultCreateCharacter` had been shipping near-illegible cards
for rounds and were graded good anyway, because the sheets were read as "that is how
this card looks". They are not.

**Fixed kit-wide in `frontend/.ds-kit/provider.tsx`** (owner-approved this run): the
provider repaints `document.body` with `var(--color-bg-page)`, guarded on the
`preview` flag and on `document` existing. `cfg.provider` wraps preview cards only,
never a built design, so nothing downstream inherits it. **Do not fork `lib/emit.mjs`
to fix this** — the template is the app's output contract.

Grade-safety, checked before doing it: `sourceKeyFor` (lib/sync-hashes.mjs) hashes the
recipe, the global/component config slices, the component src and the owned
`previews/<Name>.tsx` — **not** the provider file. So a provider edit churns every
render hash without invalidating one grade. That is why 102 components came back as
`renderChurned` with grades kept and only a 5-pick canary to confirm.

### `MotionProvider` was missing from the preview provider — one card rendered blank
`AppearanceSection` came back completely empty. `useMotion()` throws outside
`MotionProvider` exactly as `useTheme()` does, and #2154 shipped the hook without
anyone adding it to `.ds-kit/provider.tsx`. Added, nested inside `ThemeProvider`.
Only one consumer today, but the next one would have failed the same silent way.

### Viewports measured, not guessed
- The seven **faction** `*CreateCharacter` plates clipped at the inherited `390x760`.
  Measured content heights: Coven 1218, Ephemerists 1259, Everymen 1185, Wow 1177,
  Snide 1174, Singularity 1169, Ua 1085. All seven raised to **390x1280**.
  `AlbescentCreateCharacter` and `DefaultCreateCharacter` measure exactly 760 (they
  render the shorter na form) and were **left alone** — Default is `unchanged` and
  touching its override would drag it into the changed partition for nothing.
- `CookiesSection` clipped mid-card → `cardMode:single`, **820x1200**.
- `DefaultFactionHero` tripped `[GRID_OVERFLOW] wide` → `cardMode:column`, per the
  warn's own named remedy.

**A viewport change trips `[CONFIG_STALE]` in `preview-rebuild.mjs`** — the targeted
loop accepts `cardMode` edits but not viewport ones, and it fails while the capture
that follows happily runs against the stale build. Run the full `package-build.mjs`
first when you touch a viewport.

### `EphemeristsGloss` renders blank in the CAPTURE and correctly in the CARD
Its review sheet showed an empty plate and a readout row with numbers but no labels.
It is **not** a regression from #2392. Screenshotting the story directly at a ~1200ms
settle shows all seven glossed words in gold on the Valley plate; the gloss frames
start hidden and the capture catches a pre-reveal frame. `_screenshots/` never
uploads and the shipped card is live HTML, so the card a reader opens is correct.
**Do not "fix" this by forcing the labels visible in the preview** — that would fake
the one thing the component is about.

Two debugging traps hit while chasing it, both worth not repeating: the preview page
has **no `#root`** (query `document.body`), and `waitUntil:'domcontentloaded'` returns
before the bundle executes so every probe reads zero nodes — use `'networkidle'`.

### conventions.md — validated, TWO real drifts (reported, not applied)
The header belongs to its authors, so these were surfaced rather than edited:
1. **`DefaultSettings` is named as a shipped mobile-only singleton and no longer
   exists.** The validator says "(in bundle, no card dir)" — that match is a *code
   comment* inside `AccountSection.tsx`, not an export. It genuinely does not ship.
   Its replacement is the chassis: `SettingsCard` / `SettingsRow` / `SettingsSwitch`
   plus the three sections.
2. **`DefaultCreateCharacter` is listed among mobile-only singletons**; character
   creation became faction-dispatched in #2473 and is now **nine** skins.

The seven `--faction-albescent-*` "failures" remain the known false positives — the
header itself says they do not exist (#783). **Do not add albescent to a token sweep.**

### Known render warns — still exactly 19, plus one that was mine and got fixed
Unchanged standing set. `[TOKENS_MISSING]` is now **35, not 34**: `--rail-face` joined
the 34 `--tw-*`. It is legitimate — `factionRoleVars(slug,'rail')` declares it at
runtime on the rail's root and `[data-rail-face] .font-display` reads it, so it is
absent from shipped stylesheets by construction. The warn text says as much.
`DefaultFactionHero`'s `[GRID_OVERFLOW]` was mine and is remedied; the three
`[RENDER_THIN]`s that fired on `DefaultFeedFrame`/`SettingsCard`/`SettingsRow` in the
first pass were floor cards from before their previews existed and are gone.

### Grading basis this round
All 25 authored components plus the 3 never-uploaded plates and the 7 changed
(`*FactionHero` x 6 + `EphemeristsGloss`) = **35 components, 57 cells, every cell
graded good** from sheets read after the final build. All 5 canary `[SPOT_CHECK]`
picks confirmed with no divergence — including `LevelUpPopup`, whose 08-22 48-pixel
sliver fix still holds. Token sweep over all 25 new previews: **0 missing tokens**.

### `ReturningCard` cannot render populated, and that is structural
Its card shows the real offline loading line. The dated body comes from
`GET /auth/returning` on mount, and the harness intercepts nothing —
`openapi-fetch` captures `globalThis.fetch` at client creation, before any preview
module body runs (the 08-17 finding, re-confirmed: `client.ts` passes no `fetch`
option). Same class as `CommentThread`. The contract and the constraint ship in its
`.d.ts` / `.prompt.md`, and the preview header says so. Not a defect to re-chase.

## Re-sync risks (2026-08-25)
- **The body-ground fix lives in `provider.tsx` and is preview-only.** If a future
  round sees cream-on-white cards again, check that `if (preview && ...)` block first
  — and never move it into `lib/emit.mjs`.
- **~35 page-archetype cards changed appearance this round without being re-graded**
  (they are `unchanged`/`renderChurned`, grades carried by sourceKeys). They now
  render on the app's real ground, which is strictly more correct, but nobody has
  read those sheets. A future round that wants certainty can
  `package-capture.mjs --components <picks> --spot-check-components <picks>` over the
  archetype families.
- `TheArray` will keep showing up in any PascalCase sweep. Excluded on purpose.
- The `*CreateCharacter` family is now nine and two of them (Albescent, Default) sit
  at a different viewport from the other seven **deliberately** — they render the
  shorter na form. Do not "normalise" the overrides.
- `pages/settings/` is now a mapped directory, so the next dir-scoped scan would see
  it; the *next* new directory will still be invisible to anything but the whole-tree
  walk.
- `EphemeristsSelectCard`'s header still overlaps at its natural 360x300 (the eyebrow
  collides with the transit notation). Recorded 08-22, still cosmetic, still unfiled.
- `LevelUpPopup`'s `SurveyorManyUnlocks` cell clips its CONTINUE button at 460x800 —
  the body grew. Not in scope this round (component is `unchanged`); raise the
  viewport on any round that touches it.

### Upload record (2026-08-25)
Atomic path, FULL writes (not scoped). The scoped-upload shortcut the 08-22 round
used is **not safe any more, and probably never was**: `sourceHashes` covers only
`.jsx` / `.d.ts` / `.prompt.md` — **not `.html` and not `_preview/*.js`** — and
`remote-diff.mjs` marks `upload.components` **"informational"** in its own header
comment. Both changed for effectively every component this round (provider edit +
new bundle), so a sourceHashes-scoped upload would have left stale cards remotely.
Uploaded everything: 1,220 component files + 184 previews + 47 fonts + 2 vendor +
bundle + `_ds_bundle.css` + `styles.css` + README = **1,457 content files in 15**
`write_files` calls, sentinel fenced at both ends, anchor absolutely last.

Deletes 6 -> **5 deleted, 1 not-found** (`_preview/DefaultSettings.css`; this build
emits only `_preview/*.js`, the same not-found the 08-22 round saw).

Post-upload `list_files`: **0 missing**, 1,879 remote entries (dirs included) against
1,459 uploaded files; `DefaultSettings` confirmed gone. The 64 extras are the same
hand-uploaded handoffs as ever (`mobile-system/`, `templates/`, `screenshots/`,
`design_handoff_*`, `uploads/`) plus app-generated `_ds_manifest.json` and
`_adherence.oxlintrc.json`. Leave those alone.

**`main` moved 5 commits mid-run — fifth round running.** #2683 fixed the labyrinth
and favicon SVGs (the labyrinth is INLINED as a mask into kit.css, so the bundle was
stale), #2686 re-cut S.N.I.D.E. chrome contrast 1.03:1 -> 7.71:1, #2528 touched
`factionRoles.ts`, and the authors edited `conventions.md` themselves (removing the
`DefaultSettings` line this round had flagged). Merged, regenerated kit.css +
ds-types + both barrels, re-ran the whole chain. **Re-check `origin/main` immediately
before `finalize_plan`, every single time** — this is now five for five.

## [2026-08-31] Sixth round — 305 → 318, a FULL re-verify, and the canary that fired

140 commits of drift since 08-25 — the largest gap yet. The owner asked for **author all
six new previews + full re-verify of everything**, so this round graded 130 components
from their review sheets rather than trusting carried-forward grades.

### THE ds-types TREE GOES STALE AND `gen-barrel` SILENTLY UNDER-EMITS
This is the 08-17 canary firing for real, and it is now two-for-two. Running
`gen-barrel.mjs` against a stale `frontend/ds-types/` emitted **304 typed re-exports for
311 components** and printed `no .d.ts emitted for: <7 names>` — six genuinely new
components plus `DefaultEditCharacter`, which had been mapped for months. The
`DefaultEditCharacter` entry is the tell: a component that obviously exists appearing in
that list means the TREE is stale, not the map.

**The order is not optional.** Regenerate ds-types FIRST, every single time:

    cd frontend && rm -rf ds-types && node_modules/.bin/tsc -p tsconfig.json \
      --declaration --emitDeclarationOnly --noEmit false --outDir ds-types --skipLibCheck
    cd .. && node .design-sync/gen-barrel.mjs   # must print N components / N typed re-exports

After regenerating: **311 components, 311 typed re-exports, zero shortfall.** If those two
numbers ever disagree, stop — every mismatched component ships `[key: string]: unknown`
and no API contract at all.

Also note the tree SHAPE moved again: this round emitted no `ds-types/e2e/` dir, so
declarations land at `ds-types/<stem>.d.ts` (rootDir = `src/`). `gen-barrel` probes both
layouts, so this is informational, not a fix.

### The whole-tree scan found 6, and the 33 it skipped are all correct
39 unmapped PascalCase default-export `.tsx`. The classifier that settles it is
**"does this directory have ANY mapped sibling?"**:

- `src/pages/*.tsx` (top level) — **0 mapped**. Route containers, deliberately out.
- `src/pages/admin/*` — **0 mapped**. Admin UI, deliberately out.
- `TheArray`, `App.tsx`, `auth/ProtectedRoute.tsx` — excluded on purpose / infra.

The six real gaps were all NEW siblings in families that ARE mapped (added 08-27→08-30):
`LevelTrackMeta` (#2767), `DataSection` (#2158), `LanguageSection`, `DeleteAccountCard`
(#2161), `AlbescentEditCharacter`, `AlbescentProposeTask` (#2538). All six authored,
graded good.

### `proposeTaskState` added to `_state.tsx`
There was no propose-task builder. The repo already had one at
`frontend/src/pages/proposeTask/__tests__/proposeTaskState.ts` — the new builder is
modelled on it but with the form FILLED (the test fixture opens empty, which is the
page's first paint, not a preview-worthy card).

### DO NOT pin `factionSlug: 'albescent'` on a propose-task preview
The first cut of `AlbescentProposeTask` passed `'albescent'` — the archetype's own slug —
and the card came out with **two chips both reading UNAFFILIATED**. Albescent is
deliberately absent from the propose-task picker (ADR-0027), so pinning it renders a
SELECTED chip for a faction the list does not contain and the label falls back to the
unaffiliated string. Use `'na'`: it is the page's real opening position, it is what the
repo's own test fixture defaults to, and the archetype is a byte-identical pass-through
of `DefaultProposeTask` either way, so nothing goes unshown. A trailing unnamed chip
still appears in the picker — that is Albescent's redaction, and it is correct.

### `--rail-face` is NEW in `[TOKENS_MISSING]` (34 → 35) and it is BENIGN
The standing note says "34 `--tw-*`". It is 35 now and the new one is not a `--tw-`:
`--rail-face` is set at RUNTIME by `utils/factionRoles.ts` (the rail declares
`--rail-paper` … `--rail-face` inline; `factionRoles.test.ts` asserts the exact strings),
so it is the same class as the `--tw-*` set — referenced in CSS, never declared there.
Arrived with #2659/#2663. **The standing count is now 35.**

### Known render warns — still exactly 19, and the composition is unchanged
3 blank-threshold (`MediaArt`, `SingularityLamps`, `SidebarHandle` — all tiny: maxHeight
8px and 28px for the latter two), the 14-strong `[RENDER_THIN]` set (the 13 sigil/mark
components plus `MediaArt`, which is both), `CommentThread` variants-identical,
`[TOKENS_MISSING]`, `[FONT_MISSING]` (the same 4 system families). **No `[GRID_OVERFLOW]`,
no `[SYNC_STALE]`.** Grep `^! \[` — a pattern guess still misses `[GRID_OVERFLOW]`.

### The `Busy` cell of a CENTRED-MODAL duel skin crops low — capture artifact, not a defect
`DuelSealConfirm`, `UaDuelSealConfirm` and `EphemeristsDuelSealConfirm` show their `Busy`
cell pushed to the bottom edge of the review crop. The other five duel skins do not.
The discriminator is the SKIN, not the story: Coven/Everymen/Singularity/Snide/Wow fill
the 620px stage, while the default/Ua and Ephemerists skins centre a `position:fixed`
overlay inside it. All three cells are structurally identical in the preview source —
only the `busy` / `mode` prop differs — and the shipped CARD renders correctly (verified
directly from `_screenshots/duel__DuelSealConfirm.png`: full dialog, LOCK IT greyed).
**Do not "fix" this by editing the preview.** Confirm the card screenshot and move on.

### Two standing re-sync risks are now RESOLVED and should stop being carried
- **`AlbescentInvitation` renders REAL copy.** The duplicate `albescent.invitation` key in
  `factions.json` has been fixed upstream; the wordmark/letterhead/terms slots no longer
  show raw i18n keys. The 07-15 risk entry is retired.
- **`AuthCard` no longer shows PLACEHOLDER copy** — it reads "Login Logistics" with real
  body text and three real sign-in controls. The 08-17 note is retired.

### The rail cluster renders pale-on-light IN ISOLATION (unauthored, worth a look)
`Sidebar`, `SidebarColumn`, and to a lesser degree `DesktopPlayers` and
`FactionsDirectoryView` render light text on a light ground in their cards. Root cause is
NOT the 08-25 body-ground fix (that still works — `data-theme` is on `documentElement`,
`DEFAULT_THEME` is `'dark'`, and every other card is dark). The rail paints its own
**theme-invariant** paper from `--rail-paper`, which `factionRoles.ts` sets at runtime;
with no faction context only the fallback applies, so dark-theme ink lands on light
paper. Same category as `FactionBackdrop` showing the neutral default. All four are
UNAUTHORED — authoring their previews with a faction/character context is the fix, and is
the standing offer for a future round.

### Cosmetic observations, filed nowhere, deliberately
- `EverymenSeal`'s circular PTS stamp is dark-on-dark and barely legible at card size.
- The `hide` admin chip on `CovenPraxisCard` / `WowPraxisCard` is present in the rendered
  text but visually very faint against those grounds.
- `DefaultProposeTask` still ships a floor card while its own pass-through wrapper
  `AlbescentProposeTask` has an authored preview. Authoring it is now nearly free — the
  `proposeTaskState` builder exists and the component takes only `state`.

### conventions.md — validated, ZERO drift
37 enumerated components (all present in `components/<group>/<Name>/` or the bundle), 8
faction token families (the 7 themed slugs + `default`), 11 semantic tokens and 7 Tailwind
utilities all verify against the fresh build. The file's claim that **albescent has no
palette of its own** is TRUE — `grep -c -- "--faction-albescent"` over the shipped CSS is
**0**. A validator that puts albescent in the palette slug list will report a false drift;
it is not one. Not rewritten (existing files never are).

### Grading basis this round
Full re-verify, not the anchored default: the driver ran WITHOUT `--remote` (no
authorization to fetch the anchor — see below), so every component landed in `added` and
130 needed grading (137 with the mid-run EditCharacter fan-out below). All 20 contact sheets read for systemic problems first, then all 130
review sheets read individually and graded per cell. Final full capture:
**197 carried forward, 0 captured, 0 errors, 0 grade cleared**, 121 on the floor card (318 total).
Zero cleared on a no-change run is the proof the next sync is fast.

### THE UPLOAD DID NOT HAPPEN — no design authorization in this session
`DesignSync` returned "needs design-system authorization" on every call. The owner ran
`/design-consent` and it failed with **403** ("check your claude.ai login with /login").
The tool's own guidance asks for **`/design-login`** from an interactive Claude Code
session on this machine. Consequences for the next run:

- The project's `_ds_sync.json` was never fetched, so this round has **no anchor** and the
  diff could not compute `upload.deletePaths`. A future run that uploads must review the
  project's `list_files` for paths this build does not produce (§5, no-anchor branch).
- The project is **unchanged** — still whatever 08-25 left. `ds-bundle/` on disk is the
  fully verified 311-component build; it is ready to upload as-is once auth works.
- Everything durable (config, previews, `_state.tsx`, this file) IS updated, so a
  re-run only needs to rebuild and upload, not re-grade.

### MAIN MOVED 7 COMMITS MID-RUN — the SIXTH round in a row, and this time it was MY family
The 08-25 note said "five for five" on main moving mid-run. It is six for six, and this
round it mattered more than usual: the seven commits were the **EditCharacter fan-out
(#2537)** — `CovenEditCharacter`, `EphemeristsEditCharacter`, `EverymenEditCharacter`,
`SingularityEditCharacter`, `SnideEditCharacter`, `UaEditCharacter`, `WowEditCharacter` —
landing in the exact family this round had just extended with `AlbescentEditCharacter`.

Committing without them would have shipped a kit that was **seven short in the one family
the round had just touched**, which is precisely the "family a sibling short" defect the
07-15 and 08-11 notes describe. Folded in instead: merged `origin/main`, re-ran the
whole-tree scan, mapped all seven, authored all seven previews.

**The check that catches this is `git fetch origin main && git rev-list --count HEAD..origin/main`
immediately before committing, not just before `finalize_plan`.** The map is built from a
snapshot of the tree; any commit landing after the scan is invisible to everything
downstream, and nothing in the pipeline will tell you.

All seven take the identical `{ state: EditCharacterState }` prop as `DefaultEditCharacter`
and `AlbescentEditCharacter`, so each preview is the same four-line file passing
`editCharacterState('<slug>')`. **The EditCharacter family is now NINE**, matching
CreateCharacter — Default + Albescent + the seven themed slugs. Map: 311 → **318**.

Barrel canary after regenerating ds-types: **318 components / 318 typed re-exports.**

## Re-sync risks (2026-08-31)
- **Regenerate `ds-types` before `gen-barrel`, and check N components == N typed
  re-exports.** This is the single highest-value check in the whole pre-build sequence.
- The four rail-cluster components above will keep rendering pale-on-light until someone
  authors previews that supply rail/faction context. They are not flagged `bad`, so
  nothing will remind you.
- `TOKENS_MISSING` is **35** now, not 34. A 36th means a genuinely new undeclared token —
  check whether it is runtime-set before chasing it.
- The 137 grades written this round are in the gitignored `.cache/`. Because the upload
  never happened, **they are not anchored anywhere durable** — a fresh clone or a
  `.cache/` wipe loses them and the next run re-grades all 137. Uploading is what makes
  them durable.
- `LevelUpPopup`'s `SurveyorManyUnlocks` cell still clips CONTINUE at 460x800, and
  `EphemeristsSelectCard`'s header still overlaps at 360x300. Both unchanged, both still
  unfiled.
