# UI copy lives in react-i18next JSON catalogs

**Status:** Accepted
**Date:** 2026-07-13

> Supersedes ADR-0010 (ui-copy-catalog).

All user-facing frontend copy moves out of JSX into JSON resource files under
`frontend/src/locales/<lng>/`, read through `react-i18next`. The homegrown
typed catalog from ADR-0010 (`frontend/src/copy/en.ts` + custom `t()`) is
deleted; its keys and `{{var}}` placeholder syntax carry over unchanged, which
was ADR-0010's designed exit ramp.

## Why now

ADR-0010 explicitly deferred i18next "until locale #2 lands." Locale #2 is now
scheduled, and a second driver arrived with it: writers and translators must
be able to edit copy without touching code. The seed catalog was never wired
into any component (0 imports), so this migration cost was one test file.

## Decisions

- **Library: `react-i18next`** (on `i18next`), the mainstream choice with the
  provider/hook model that fits the existing React tree.
- **JSON resource files**, not TS modules — editable by non-engineers,
  diffable, tooling-friendly. One folder per language: `locales/en/`.
- **Namespaced by feature**: `common`, `forms`, `votes`, `factions`, `praxis`,
  `tasks`, `feed`, `home`, `admin`. One JSON file per namespace.
- **Semantic nested keys** (`forms:charLimit.reached`) — keys name the copy's
  purpose, never its English wording.
- **Explicit faction-slug nesting** for per-faction voice
  (`votes:ephemerists.plausible`, `votes:snide.rad`) — the faction voices are
  authored content, so each slug's branch is written out in full, no
  fallback-to-shared-key magic.
- **i18next native plurals** (`key_one` / `key_other`), no ICU.
- **Missing-key handling split by env**: `saveMissing` is enabled outside
  production, and the `missingKeyHandler` throws — a missing key fails dev,
  test, and CI loudly. In production `saveMissing` is off and lookups fall
  back silently (`fallbackLng: 'en'`).
- **English only for now** — rails are laid, but no language-switcher UI and
  no second locale folder until locale #2 is actually translated.
- **Typed keys without codegen**: `frontend/src/i18next.d.ts` augments
  `CustomTypeOptions` with `resources` typed as
  `typeof import('./locales/en/<ns>.json')`, so `t()` autocompletes and a bad
  key fails `tsc`. (The augmentation targets the `i18next` module — since
  react-i18next v13 that is where `CustomTypeOptions` is consumed from; the
  issue text's "react-i18next CustomTypeOptions" is the pre-v13 name for the
  same mechanism.)
- **No `i18next-parser`** — extraction sweeps are issue-driven, and the typed
  keys + lint rule cover drift. Stay lean.
- **Everything user-facing gets extracted, including a11y attributes**
  (`aria-label`, `alt`, `title`, `placeholder`). Embedded markup uses
  `<Trans>` with numbered tags.
- **Lint guard**: `eslint-plugin-i18next` `no-literal-string` runs as a
  `warning` during the sweep epic (ignoring test files, `className`, `data-*`
  attributes, URLs/route paths, and console output). The final cleanup issue
  flips it to `error`. This also bootstraps ESLint (flat config) into the
  frontend, which previously had none.

## Consequences

- Component code reads copy via `useTranslation()` / `t('ns:key', vars)`;
  the per-area extraction sweeps (#441–#449) are mechanical.
- `docs/adr/0010-ui-copy-catalog.md` is superseded; `frontend/src/copy/` is
  gone. The human-editor guide lives at `frontend/src/locales/README.md`.
- Backend-emitted copy keys (ADR-0031) resolve against these same catalogs.

## Upgrade paths (deliberately deferred)

- **`i18next-icu`** — adopt if a future locale needs gender/select formatting
  beyond native plurals.
- **`i18next-parser`** — adopt if dead-copy detection becomes a real problem
  after the sweeps land.
- **Language-switcher UI + `LanguageDetector`** — build when locale #2 is
  actually translated; until then `lng` is pinned to `'en'`.
- **Lazy-loaded namespace bundles** (`i18next-http-backend`) — only if the
  all-in-the-bundle catalogs ever weigh enough to matter.
