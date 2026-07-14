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
