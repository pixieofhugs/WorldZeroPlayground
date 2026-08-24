# ADR-0074 — One sky serves both themes; the Meadow is retired

**Status:** Accepted
**Date:** 2026-08-14

**Relates to:** epic #654 (the Players constellation), #656 (the desktop
constellation), #684 §1 (the decision this reverses), #730 (the measured stage +
the three-chip legend), ADR-0039 (the unaffiliated spectrum), #1698 (the site
defaults to dark), #1700 (this change), #1717 (redesign the orbs — follow-up)

## Context

#684 §1 made the Players visualisation **theme-bound**: *"a night sky for dark, a
sunlit field for light... the two are siblings, not a component and its
re-skin."* Two components — `Constellation` and `Meadow` — swapped by
`useTheme()` in `DesktopLeaderboard`, sharing a props contract
(`PlayersVizProps`) and a measuring wrapper (`SkyCanvas`), with parallel copy
(`meadowTagline*`, `meadowLegend.*`, `meadowLabel`), a parallel legend axis
(`SkyLegend`'s `variant`) and a parallel token family (`--meadow-*`).

The premise underneath that decision was symmetry: light and dark are equal
citizens, so each deserves a visualisation designed for its ground. Two things
have since made it false.

**Light is no longer half the audience.** #1698 defaults the site to dark. The
Meadow became a 484-line surface that only a reader who deliberately opts into
light ever reaches.

**The Meadow is the broken half.** Its blooms are the surface the owner wants
redesigned, and its light-ground AA family is a second set of measurements to
keep honest. Repairing a visualisation almost nobody sees is the wrong spend, and
carrying it while the orbs are redesigned (#1717) would mean designing the same
change twice.

## Decision

**The Constellation is the one visualisation, in both themes. The Meadow is
deleted.**

Everything that existed *only* to make the pair swappable goes with it, because a
seam with one implementation is not a seam:

- `SkyCanvas`'s `viz` prop and the `PlayersVizProps` contract — `SkyCanvas`
  renders `Constellation` directly.
- `SkyLegend`'s `variant: 'sky' | 'meadow'` axis and its bloom glyphs.
- The `leaderboard.desktop.meadow*` catalog keys.
- The `--meadow-*` token family.

**The theme is not consulted on this page at all.** That is the property the test
asserts — not "both themes render the same markup", which would pass vacuously
once nothing reads the theme, but that `useTheme` is never called while the board
renders. A re-introduced theme branch fails it.

### Why a dark stage on a light page is not an accessibility regression

This was the load-bearing question, and it turns on the sky being **painted, not
inherited**. `Constellation` sets `background: var(--sky-bg)` on its own stage,
so a light-theme reader gets a dark rectangle on a light page rather than sky ink
on a light ground. Verified against the source at the time of writing:

- The `--sky-*` family is declared once in `:root` and is **not** repeated under
  `[data-theme="dark"]` — the canvas is night in both themes by construction
  (epic #654 decision #8), so nothing about it flips.
- Its three text-bearing tokens measure, against `--sky-bg` (`#0f0e15`):
  `--sky-name` 15.48:1, `--sky-crown` 11.99:1, `--sky-name-muted` 4.94:1.

So there is no interim contrast cliff, and the page does **not** need to declare
itself always-dark to be safe. What remains is an aesthetic mismatch — a dark
stage inside light chrome — which is accepted deliberately and for now.

## Consequences

**Good.** One visualisation to design, measure and maintain. #1717 targets a
single surface instead of a matched pair. The token count drops by ten and the
copy catalog by six keys. `SkyCanvas` and `SkyLegend` each lose a
generality they had exactly one caller for.

**Bad — a light-theme reader gets a dark stage on a light page.** Known,
accepted, and the reason this ADR exists rather than a silent deletion. If it
becomes intolerable before #1717 lands, the cheap answer is *not* to resurrect
the Meadow but to soften the stage's frame; a genuinely light sky would be a new
design, not a restored one.

**Bad — the light sky is unbuilt work, not solved work.** Nothing here argues a
light-ground visualisation is a bad idea. It argues that *this* light-ground
visualisation is not worth repairing on the way to redesigning the orbs. A future
era that wants one starts from #1717's design, and `SkyCanvas` grows its swap
prop back in one line at that point.

**Neutral — mobile is unaffected.** `DefaultPlayers` already rendered the
`Constellation` and the default (`sky`) legend in both themes; it never
dispatched to the Meadow, so the phone path is unchanged.

## Alternatives considered

**Keep the Meadow and fix it.** Rejected on spend: it is 484 lines and a second
AA family serving the opt-in half of a dark-by-default site, and #1717 will
redesign the orbs anyway — so the repair would be thrown away within an era.

**Keep the Meadow and let #1717 redesign both.** Rejected as doubling the design
brief for a surface whose audience is shrinking. It also forces every future
Players change through two components that must stay siblings, which is the cost
#684 §2's shared props contract was managing rather than removing.

**Declare the Players page always-dark — force `[data-theme="dark"]` on its
chrome so the stage stops looking pasted on.** Rejected as unnecessary and
overreaching. The measurements above show no contrast problem to solve, and
overriding a reader's theme choice on one route is a bigger break of the site's
own rules than an odd-looking rectangle is.

**Re-point `--sky-*` under `[data-theme="dark"]` so the sky lightens in light
mode.** Rejected: those tokens are measured against a night canvas and invert
into AA failures on a daylit one — which is precisely why #684 §9 made the Meadow
a separate family rather than a re-point. That reasoning survives this reversal
intact; it is the reason a light sky is a *design*, not a token flip.
