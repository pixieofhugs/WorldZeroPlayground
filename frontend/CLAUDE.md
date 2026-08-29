# Frontend conventions
- Read `WORLD_ZERO_STYLE.md` before any UI work
- **Dependency direction (#2893): `api/` and `utils/` do not import from
  `components/`, `pages/` or `hooks/`.** Those two are the adapter/logic
  layers everything else is built on — a route added later, or a test that
  isolates one, should never have to reason about which components happen to
  be mounted. When something under `api/`/`utils/` needs logic that was
  accidentally filed under `components/` or `hooks/` because it has no React
  in it (a module-scope store, a pure cache), move the non-React part down —
  see `utils/castTallies.ts` and `utils/resourceCache.ts`, both split out of a
  `components/`/`hooks/` file that mixed a plain store with a thin React
  wrapper. `components/vote/pendingCasts.ts` is the older precedent for the
  shape (`utils/requestsBus.ts`'s pub-sub, called into from the api layer).
  - **Accepted exception:** `utils/praxis.ts` imports
    `ScoredPraxis`/`scoreBreakdown` from
    `components/praxisCard/scoreStamp/scoreBreakdown.ts`. That module is pure
    (no React) but its real home is the score-stamp component family — ADR-0049
    /ADR-0053 name it the one shared row-selection authority for all nine
    faction stamps, and nine sibling `*ScoreStamp.tsx` files plus `ScoreStamp.tsx`
    already import it by relative path. Relocating it to satisfy one `utils/`
    caller would pull it out of the component tree that owns its contract to
    fix a single import direction. Left in place, named here as the recorded
    exception rather than silently drifted past.
- Color values live only in `index.css` (CSS vars). Never hardcode hex.
- Faction config: `factions.ts`.
- **A surface reads a ROLE, not a token.** Spread `factionRoleVars(slug, prefix)` on the
  root you own and read `var(--<prefix>-<role>)` below it — nine roles (`paper`, `ink`,
  `quiet`, `line`, `accent`, `fill`, `onFill`, `radius`, `face`) on one of two grounds
  (`sheet`, or `chrome` for the app's own furniture). `factionRoles.ts` owns the
  vocabulary; the terms are in `CONTEXT.md`. The prefix is the SURFACE's, never a shared
  `--kit-*` namespace: a page wrapper declaring one would repaint every descendant,
  including a card belonging to a different faction. Name it `<faction>-<surface>`
  (`ev-task`, `sg-desk`, `leaf-task-detail`, `na-avatar`) and keep it out of
  `--faction-*`, which is the token families' namespace. The only hard rule is that no
  two surfaces share a prefix, and the gate below enforces it.
  - A fallback arm is **banned** where the slug is a literal identified faction —
    `factionRoleVars` always emits there, so it can never be reached — and **required**
    where the slug is `na`, `albescent` or a runtime value, because the map returns `{}`
    and the fallback is the whole paint. `utils/__tests__/factionRoleFallbacks.test.ts`
    holds both, derived from source: there is no table to add your surface to.
  - `factionRoleVar()` (singular) for a surface composing something local out of one
    role; `factionCssVar()` still for a token no role names, and for a runtime slug you
    cannot spread a map for.
  - Writing a guard that hunts a token in source or markup? Fold it through
    `resolveRoleReads()` in `test/sourceScan.ts` first — a migrated surface no longer
    writes the token, and a guard matching the spelling silently narrows.
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
  functions (ADR-0082); every `na` comparison is a sentinel check, not a faction
  branch; and three hits are prose inside comments (`api/auth.ts`,
  `useTaskDetail.ts`, `useFactionDetail.ts`), which is the law being cited, not
  broken.

  **The worked counter-example, since removed (#2660).**
  `resolveMembershipState` in `useFactionDetail.ts` short-circuited
  `slug === "ua"` to "none", so the UA page drew no join block for anyone. Note
  what the fix was *not*: no flag was added to `FactionConfig`, because there was
  never a rule here to configure. The comment justifying the branch asserted a
  pre-ADR-0019 model that ADR-0030 (Accepted) had already retired, and every
  authoritative source — the ADR, `_NON_INVITE_FACTION_SLUGS`,
  `can_join_faction` — said UA was an ordinary invite-joinable faction. So the
  branch hid a fully built, fully translated join block from real UA invitees the
  backend had been sending letters to all along. **Read the sources before you
  encode the branch as config: a slug branch can be stale rather than
  load-bearing, and then deletion is the whole fix.** The `slug` parameter went
  with it — a seam that takes no slug cannot grow a slug branch again, which is
  the cheapest enforcement there is.

  Still deciding a RULE by slug: `duel/shared.tsx` picks the duel tie winner —
  but so does `backend/services/scoring.py`, so fix both sides or neither.
  `utils/commentTime.ts` switches per-faction English in code rather than in the
  catalogue.

The root `CLAUDE.md` holds the routing table and the `Do NOT` list — all of
which still apply here.
