# UI copy lives in a catalog, not inline JSX

**Status:** Superseded by ADR-0032
**Date:** 2026-06-25

> **Superseded by ADR-0032** (react-i18next-copy-catalog): locale #2 is now
> scheduled, so the deferred i18next migration this ADR planned for has
> happened. `frontend/src/copy/en.ts` is gone; copy lives in
> `frontend/src/locales/en/*.json`.

User-facing chrome copy (currently hardcoded in components) moves into a single
human-editable module, `frontend/src/copy/en.ts`, read through a tiny
`t(key, vars)` helper. Keys are namespaced (`form.charLimit.reached`,
`praxis.charLimit.terminal`) and placeholders use `{{max}}` double-brace syntax.
We chose this over both leaving strings inline and adopting `i18next` now.

## Why

The trigger was issue #51 (whimsical "max characters reached" messages on every
form). The copy needs to be **editable by a human without touching JSX**, and the
six praxis archetypes each want the message in their own faction voice — so the
strings are content, not code, and shouldn't be buried at call sites.

## Considered options

- **Inline strings** — rejected: the thing the issue asks for (one editable home
  for copy) is exactly what inline JSX prevents; it also keeps the counter markup
  copy-pasted across ~10 fields.
- **`i18next` / `react-i18next` now** — rejected *for now*: real locale switching,
  pluralization, and lazy bundles are scaffolding for a translation effort that
  isn't scheduled (no second language exists). YAGNI until locale #2.
- **Plain typed module (chosen)** — zero new dependencies, type-safe, one file to
  hand an editor.

## Consequences

- The catalog *shape* is deliberately i18next-native: namespaced keys +
  `{{var}}` placeholders. Migration to `i18next` (the intended future, when a
  second language lands) is mechanical — swap the `t()` internals, keep the keys.
  This is marked with a `ponytail:` comment at the helper.
- The shared `<CharCount>` widget reads its message via `t(messageKey, {max})`,
  so the copy lookup is centralized in one place alongside the counter +
  `aria-live` behavior.
