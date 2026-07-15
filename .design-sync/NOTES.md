# Design-sync NOTES — World Zero Frontend Kit

World Zero's frontend is a Vite **app**, not a published component library, so this
sync uses the `package` shape in **synth-entry / barrel** mode. Read this before any
re-sync.

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
