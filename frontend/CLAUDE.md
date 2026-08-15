# Frontend conventions
- Read `WORLD_ZERO_STYLE.md` before any UI work
- Color values live only in `index.css` (CSS vars). Never hardcode hex.
- Faction config: `factions.ts`. Use `factionCssVar()` for styles.
- Dark mode via the `[data-theme="dark"]` cascade — no `dark ? '#a' : '#b'` ternaries
- Each faction has its own card archetype; don't unify
- Reuse `.card-meta`, `.card-description` for repeated patterns
- Hide unusable controls; don't show them disabled
- Form factor (#494): a new dispatched surface provides a `Default*` mobile skin and dispatches through a parallel `MOBILE_ARCHETYPE_BY_SLUG` on `useFormFactor() === 'mobile'`. The mobile path stacks single-column — never fixed-px inline grids for layout structure. See `docs/spec/SPEC-faction-ui-profile.md` §1a.

The root `CLAUDE.md` holds the routing table and the `Do NOT` list — all of
which still apply here.
