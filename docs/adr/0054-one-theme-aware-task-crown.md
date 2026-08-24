# ADR-0054 — One theme-aware Task Crown (the flur is one mark)

**Status:** Amended by ADR-0066
**Date:** 2026-07-24

**Amends:** [ADR-0028](0028-task-crown-replaces-faction-distinction-laurel.md) — the per-card recolour of the crown's inner disc + glyph
**Relates to:** #826

## Context

ADR-0028 established the **Task Crown** — a fleur-de-lis (⚜) inside a fixed rainbow
ring (`--fdl-rainbow`), worn by the top-scoring submitted praxis for its task. Its
decision kept the ring constant but let **each faction skin recolour the inner disc
and the glyph** ("swap the laurel glyph in the current medallion, keep the ring…
skin-aware inner disc + glyph recolor per faction").

In practice every caller passed its own `innerBg` (disc) and `glyphColor` (glyph),
so the same mark rendered a different colour on each faction card — dark-centre on
one, white-centre on another, gold glyph here, acid glyph there. The crown is meant
to be **"the one praxis mark"**, but it read as many marks. That undermines its whole
job: a viewer scanning the feed cannot learn one emblem and recognise it everywhere.

## Decision

**One canonical Task Crown on every faction card, theme-aware only.** The inner disc
and glyph no longer follow the card — they follow the global light/dark theme.

- The rainbow ring (`--fdl-rainbow`) stays a fixed brand constant, unchanged.
  **Amended by ADR-0066 (2026-07-29):** "a fixed brand constant in both themes" no
  longer holds. There is one rainbow now, the brand palette retired into the na
  spectrum, and brand chrome flips with the theme — so the ring flips too. The rest
  of this decision is untouched: one canonical crown, theme-aware only, with no
  per-faction recolour. Only the *ring's* theme behaviour changed.
  **Carried out by #1213:** `--fdl-rainbow` **no longer exists.** It was the last
  surviving declaration of the retired brand six — the same hexes as the deleted
  `--underline-1…6`, resequenced and wrapped to close a ring — and the crown now
  reads `--faction-default-rainbow-conic`, the site's one rainbow swept as a
  seam-closed smooth conic. No replacement crown token was minted: the only thing
  `--fdl-rainbow` added over the na conic was a `from 90deg` start, which placed
  gold at 3 o'clock in a hue order that is gone, so it was dropped rather than
  reproduced. Anywhere this ADR or ADR-0028 says `--fdl-rainbow`, read
  `--faction-default-rainbow-conic`. `--fdl-disc` and `--fdl-glyph` are unaffected
  and remain the crown's own tokens.
- Two new theme-aware tokens in `index.css` carry the inner look, and are the ONLY
  thing that varies:
  - `--fdl-disc` — the disc fill: ivory/paper in light, near-black in dark.
  - `--fdl-glyph` — the fleur ink: dark ink in light, light ink in dark.
- `TaskCrown` bakes `var(--fdl-disc)` / `var(--fdl-glyph)` in. The `innerBg` and
  `glyphColor` props are **removed entirely** so no caller can re-diverge — that is
  the point. `size` / `ringInset` / `rotate` / `shadow` / `style` remain (placement,
  not palette). Every caller (the eight faction score-stamps, the six faction-page
  bodies, and the mobile praxis card) drops the two colour props.

This supersedes ADR-0028's "skin-aware inner disc + glyph recolor per faction." The
Albescent monochrome-pair note in ADR-0028 is likewise moot — there is now one
monochrome-per-theme pair for everyone.

## Consequences

- The flur looks identical on every faction's praxis card within a theme, with one
  light form and one dark form. "One praxis mark" finally reads as one mark.
- No orphaned tokens resulted: each `--faction-*-stamp-bg` the crown had borrowed for
  its disc is still used as the stamp's own background; the glyph colours were faction
  chrome tokens used elsewhere.
- `SpectrumLaurel` (the character-profile laurel wreath) is a different emblem with a
  different meaning and is untouched — it still recolours per skin.
- **Since #1213 the crown has no private colour of its own beyond the inner pair.**
  The ring is the site's shared spectrum, so a re-cut of `--faction-default-stop-*`
  now repaints the crown along with the nav rule and the page titles. That is the
  blast radius of one rainbow, and it is deliberate: the crown appears on every
  faction card, so any stop change owes it a look in both themes.
