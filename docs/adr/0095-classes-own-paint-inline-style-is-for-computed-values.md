# ADR-0095 — Classes in the cascade own every nameable paint; inline style is for computed values

**Status:** Accepted
**Date:** 2026-09-24

**Source:** #3000 (owner ruling, 2026-09-24)

## Decision

Paint that can be named lives in a class in the CSS cascade. An inline `style={{…}}` object is
for values genuinely computed per render (derived from props, state or arithmetic). Tailwind
utilities (option 1) were not chosen; the status quo, where the archetype authors pixels inline
(option 3), was rejected.

## Why

An inline object cannot carry `:hover`, `:focus-visible`, media queries or `[data-*]` states, and
no dresser (`.spectrum-dial`, `[data-composer-field]`) can reach it. Tokenising a value (#2649)
does not remove that mechanism, and a shared piece that demands a `style` from its host is why
eighteen CTA paints exist (#2642).

## Enforcement: a ratchet, not a sweep

`local/no-static-inline-style` (`frontend/eslint.config.js`) flags a `style={{…}}` whose values
are all literals; a `var(--token)` read is a literal, so it is flagged. Anything touching an
identifier, spread, call or template expression passes, including a file-level const: the arm
errs toward passing. Non-test `.tsx` under `src/` only.

Today's offenders sit in `frontend/.eslint-legacy-static-style.txt`. The list only shrinks, and
`src/__tests__/staticInlineStyleRule.test.ts` fails if a listed file has gone clean. Nothing was
migrated; sites drain as surfaces are touched. #3002 moves the `useFormFactor()` value-only
sites to media queries.
