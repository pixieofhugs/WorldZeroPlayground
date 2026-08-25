# Frontend conventions
- Read `WORLD_ZERO_STYLE.md` before any UI work
- Color values live only in `index.css` (CSS vars). Never hardcode hex.
- Faction config: `factions.ts`. Use `factionCssVar()` for styles.
- Dark mode via the `[data-theme="dark"]` cascade — no `dark ? '#a' : '#b'` ternaries
- Each faction has its own card archetype; don't unify
- Reuse `.card-meta`, `.card-description` for repeated patterns
- Hide unusable controls; don't show them disabled
- Form factor (#494): a new dispatched surface provides a `Default*` mobile skin and dispatches through a parallel `MOBILE_ARCHETYPE_BY_SLUG` on `useFormFactor() === 'mobile'`. The mobile path stacks single-column — never fixed-px inline grids for layout structure. See `docs/spec/SPEC-faction-ui-profile.md` §1a.
- **Branch on a faction slug for paint and tree only — never for behaviour, capability or copy.** Paint (a token family, a gradient stop) and tree (which archetype mounts) are per-faction by nature. A *capability* is a rule: it belongs to `FactionConfig` in `backend/game_config.py`, read through a service, because abilities move between factions from era to era (ADR-0042) and a slug branch freezes a rule the next era cannot re-tune. Copy belongs to `locales/en/factions.json` by slug (ADR-0038). The backend states this per-flag (*"never branch on a faction slug in a service"*); it holds here too.
  Comparing against the *unaffiliated* sentinel is not a faction branch — `na` is a
  state, not a faction (ADR-0030 / ADR-0039), and no era can move a perk onto it.
  Census it by slug VALUE, not by variable name — the sites use a string literal,
  a named `*_SLUG` constant and a `switch`, and `viewerFactionSlug` does not
  contain `slug`:
  ```
  grep -rnE "(===|!==|case)[[:space:]]*['\"](ua|snide|wow|coven|everymen|ephemerists|singularity|albescent|na)['\"]|(===|!==)[[:space:]]*[A-Z_]*SLUG" frontend/src --include=*.ts --include=*.tsx | grep -v test
  ```
  Legal in that output: `Sidebar.tsx` (×2) and `FactionSigil.tsx` pick paint; the
  Albescent reveal predicates in `utils/factions.ts` are centralised behind named
  functions (ADR-0082); and every `na` comparison is a sentinel check, not a faction
  branch. Two sites decide a RULE and should not: `useFactionDetail.ts` decides
  whether a join block is drawn at all (#2660), and `duel/shared.tsx` decides the
  duel tie rule by slug. `utils/commentTime.ts` switches per-faction English in code
  rather than in the catalogue.

The root `CLAUDE.md` holds the routing table and the `Do NOT` list — all of
which still apply here.
