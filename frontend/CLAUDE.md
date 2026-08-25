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
