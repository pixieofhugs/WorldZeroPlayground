# Frontend conventions
- Read `WORLD_ZERO_STYLE.md` before any UI work
- Color values live only in `index.css` (CSS vars). Never hardcode hex.
- Faction config: `factions.ts`. Use `factionCssVar()` for styles.
- Dark mode via the `[data-theme="dark"]` cascade — no `dark ? '#a' : '#b'` ternaries
- Each faction has its own card archetype; don't unify
- Reuse `.card-meta`, `.card-description` for repeated patterns
- Hide unusable controls; don't show them disabled
- Form factor (#494): a new dispatched surface provides a `Default*` mobile skin and dispatches through a parallel `MOBILE_ARCHETYPE_BY_SLUG` on `useFormFactor() === 'mobile'`. The mobile path stacks single-column — never fixed-px inline grids for layout structure. See `docs/spec/SPEC-faction-ui-profile.md` §1a.
- **Branch on a faction slug for paint and tree only — never for behaviour, capability or copy.** Paint (a token family, a gradient stop) and tree (which archetype mounts) are per-faction by nature. A *capability* is a rule: it belongs to `FactionConfig` in `backend/game_config.py`, read through a service, because abilities move between factions from era to era (ADR-0042) and a slug branch freezes a rule the next era cannot re-tune. Copy belongs to `locales/en/factions.json` by slug (ADR-0038). The backend states this per-flag (*"never branch on a faction slug in a service"*); it holds on this side too.
  The whole census outside tests is four branches — re-derive it with
  `grep -rnE '(slug|_slug)\s*===\s*.[a-z_]+.' frontend/src --include=*.ts --include=*.tsx | grep -v test`:
  `Sidebar.tsx` picks the rail's token family, `Sidebar.tsx` drifts the frame and
  `FactionSigil.tsx` moves a gradient stop — three paint branches, all legal.
  The fourth, in `pages/factionDetail/useFactionDetail.ts`, decides whether a join
  block is drawn at all; it is the one violation and it is tracked on #2660.

The root `CLAUDE.md` holds the routing table and the `Do NOT` list — all of
which still apply here.
