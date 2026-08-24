# The backend owns no faction color

**Status:** Accepted
**Date:** 2026-06-22

Faction color is a *design* fact (canon lives in the vault design docs; see ADR-0001), and
nearly all visible theming is driven by `index.css` CSS vars via `factionCssVar()`. The
backend `era_1.py` `color` field was a denormalized copy that drifted (it served Singularity
purple `#7c3aed` and UA gray `#6b6a7a` while `index.css` themed them blue/purple), producing
a split where `factionColor()` (raw hex, hydrated from `/game-config`) disagreed with the CSS
theme on the same faction.

Decision: **remove `color` from the backend** — the `game_config.py` `FactionConfig`
dataclass field, the `era_1.py` values, and the `/game-config` response schema/payload.
**No DB migration is involved**: there is no `faction.color` column — color was only ever
backend *config* (in memory), never persisted. The frontend owns color outright: `index.css`
(theme) and the `factions.ts` `FACTION_FALLBACKS` (raw hex), both mirroring the vault canon.
With the backend no longer serving color, `populateFactionRegistry()` stops overwriting the
hex, so the purple-Singularity / gray-UA bug cannot recur.

`era_1.py` keeps gameplay + identity (slug, name, ability, modifiers); it just no longer
carries the brand color.
