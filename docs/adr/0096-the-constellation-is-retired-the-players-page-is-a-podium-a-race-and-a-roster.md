# ADR-0096 — The Constellation is retired; the Players page is a podium, a faction race and a roster

**Status:** Accepted
**Date:** 2026-11-19

**Supersedes:** ADR-0074 (one sky serves both themes)
**Relates to:** #1868 (the deletion, commit f3fa85c6), #1855, ADR-0039 (the unaffiliated spectrum), ADR-0082 (Albescent is redacted, not hidden)

## Context

ADR-0074 made the Constellation the one visualisation of `/leaderboard` in both themes and deleted the Meadow. #1868 then deleted the Constellation too: `Constellation`, `SkyCanvas`, `SkyLegend`, `DefaultPlayers`, `RosterTable` and the `--sky-*` tokens. ADR-0074 still read as live and would have an agent rebuild a sky.

## Decision

**There is no sky.** `/leaderboard` is `frontend/src/pages/players/DesktopPlayers.tsx` and `MobilePlayers.tsx`: a podium, a faction race (one lane per faction, never `na`) and a filterable roster, two surfaces over the one data layer in `playersData.ts`.

ADR-0074's two rules go with the canvas: "the Constellation is the one visualisation" and "the theme is not consulted on this page". Do not rebuild a sky or a `--sky-*` family from ADR-0074.

## Consequences

- No component in `frontend/src` names a Constellation or reads `--sky-*`; a new rank visualisation needs its own record.
- ADR-0074's reasoning about AA on a painted dark stage no longer applies to any surface.
