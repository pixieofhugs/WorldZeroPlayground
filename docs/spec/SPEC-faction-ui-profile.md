# SPEC — Per-Faction UI Profile

**What this is.** The definitive list of which UI/UX surfaces vary *per faction* and which stay *global*. Feed this to a designer (human or Claude design) at the start of any new-faction or faction-redesign brief so the deliverable covers exactly the right surfaces — no more, no less.

**Status.** Reflects the **Tier 3** scope adopted 2026-06-05 (cards + voting + progression + page backdrop + avatars + activity-feed cards are per-faction; generic controls stay global). Earlier the only per-faction surface was the card archetype; Tier 3 widened the boundary.

**Source of truth.** This doc describes *intent and the contract*. Exact values live in `frontend/src/index.css` (CSS vars), `frontend/src/utils/factions.ts` (registry), and `backend/eras/era_1.py` (gameplay). If they disagree, the code wins — fix this doc or the code, don't let them drift. Companion: `WORLD_ZERO_STYLE.md` (§6 "faction identity cascades from the card archetype").

---

## 1. The per-faction boundary (Tier 3)

> **§1 is the *contract*** — what a faction *may* own. For the *state* (which factions actually have each surface wired today, and where they fall back to a default), read the manifests in `frontend/src/factions/` — each faction's `<slug>.ts` declares the surfaces it dresses, and `default.ts` is `na`'s. The code is the source of truth, not a hand-maintained matrix.

### Per-faction — a faction owns its own version of each of these

| # | Surface | What varies | Existing example |
|---|---|---|---|
| 1 | **Task card** | Whole archetype (shape, layout, ornament, copy voice) | Everymen union-poster, S.N.I.D.E. ransom clipping |
| 2 | **Praxis card** | Mirrors the task-card archetype; full content parity (excerpt, media gallery, crew roster, mode chip, inline vote footer) folded into `PraxisBody` (#587) | per faction |
| 3 | **Edit-praxis editor** | Mirrors the archetype, as a form | sticky-note / terminal / gazette |
| 4 | **Faction-selection card** | Bespoke "join me" card | per faction |
| 5 | **Headline font** | One display face per faction | Bebas Neue (Everymen), Caveat (Warriors of Whimsy) |
| 6 | **Color set** | Full `--faction-{slug}-*` token block, light + dark | see §3 |
| 7 | **Filter pennant** | Tab uses the faction primary color at full saturation | global pennant shape, per-faction fill |
| 8 | **Vote / rating UI** *(Tier 3 new)* | The 1–5 rating control's visual metaphor | Everymen ink-ramp stamps; WoW heart ramp |
| 9 | **Progression / level indicator** | **Color tint only today** — one shared `LevelPill` shape, faction-colored via `factionCssVar`. A bespoke per-faction *shape* (numeric pill vs. moon-phase track) is a *candidate*, **not wired** (no dispatcher). | aspirational: WoW moon-phase track |
| 10 | **Page backdrop** *(Tier 3 new, optional)* | Full-page background **when a faction is the page's context**; falls back to the global rainbow watercolor otherwise | Everymen poster wall; WoW lo-fi desktop |
| 11 | **Avatar + membership badge** *(Tier 3 new)* | Avatar frame treatment + a small faction sigil badge | Everymen cog badge; WoW moon badge |
| 12 | **Activity-feed card** *(Tier 3; full adoption 2026-07-02, #376; **rebuilt as a chassis 2026-07-29, #1194 / epic #1192**)* | The faction owns a **card chassis**, not a row wrapper. Three layers, each owning one thing: `FeedItemSlot` holds the archive affordance (✕, swipe, undo strip) and is faction-blind; **`FactionFeedFrame` is the chassis** — dispatched on `context_faction_slug`, it draws kicker / tag / time and places the archive node, and it is the only layer a dress issue rewrites; the body (`FeedRowContent` or a companion) is faction-blind. The manifest entry took props with it: `feedFrame` went from `{ children }` to `FeedFrameProps { kicker, time, tag, archive, children }`, so claiming a faction's feed card is one manifest line. **Three of the four companions now render INSIDE the chassis** — `duel_challenge`, `collab_invite`, `invitation_letter` (their accept/decline handlers did not move). Only `era_announcement` stays neutral and chassis-exempt, deliberately: an era turn can strip a player of their faction, so speaking that one card in their voice is backwards. Copy is faction-neutral (epic #1192) — the skin is the identification and there is no faction-name label. | Everymen dispatch slip; WoW window row |
| 13 | **Faction detail page** *(new)* | The per-faction page at `/factions/:slug`: faction description + members + tasks + recently-completed praxis. The page backdrop (#10) themes it to the faction. | shell shipped with placeholder styling; per-faction visual design pending |
| 14 | **Comment** *(designed, ADR-0006; not yet built)* | One archetype, two modes (posted `row` + `composer` box). Invariant slots: author identity · body · timestamp+edited. **Actor-scoped** (see §2). | SNIDE ransom scrawl; Ephemerist marginalia — per-faction voice pending |

### Global — one shared version for the whole app, regardless of faction

- **Generic buttons, tabs, chips, empty states** — shared classes/components. A faction kit *may* ship styled versions, but they are NOT wired into per-faction dispatch; the app uses the global ones. (If a faction's archetype needs a bespoke button *inside its own card*, that lives inside the card component, not as a global control swap.)
- **Navigation chrome / sidebar / layout shell**, modals, toasts, form validation states.
- **Vote data model** — always a 1–5 rating; only the *rendering* is per-faction.
- **Level thresholds & gameplay rules** — global/era config, never per-faction visual logic.
- **Typography scale, spacing, radii, shadows** — shared design-system tokens (`--space-*`, `--radius-*`). A faction picks a *headline font*, not a new scale.

> **Rule of thumb for the designer:** a faction owns everything that represents *its own content or members*. It does not own neutral app chrome or controls that appear across all factions at once.

---

## 1a. The form-factor axis (mobile vs. desktop)

Faction is not the only presentation axis — **form factor** is a second one, orthogonal to it (#494). A phone gets a *mobile-native* experience (bottom-tab nav, single-column, one-handed), not a responsive squeeze of the desktop skin.

- **Detection.** `useFormFactor()` reports `mobile` vs `desktop` from one `matchMedia` breakpoint (`max-width: 767px`) — viewport-based, reactive to resize/rotate, not UA sniffing. One breakpoint; no tablet tier.
- **Switch location.** Form factor is chosen in the **`Layout` shell** (the mobile header + `MobileTabBar` vs. the top NavBar + sidebar) and in **each page dispatcher**. Never a per-leaf-component branch.
  - **The shell must not swap component TYPE at the page slot.** `MobileLayout`/`DesktopLayout` were deleted in #1116: rendering `<Shell>{children}</Shell>` changed the type at one position, so React discarded the whole subtree on every breakpoint crossing and every page refetched. The chromes are now siblings of a single `ShellContent` page slot, so crossing the breakpoint re-renders instead of remounting.
  - **A page dispatcher must call its fetch hook ABOVE the branch.** Ten of eleven already did; `Factions` did not, and each side owned a private copy of the same three requests (fixed in #1116 via `useFactionsDirectory`). This is the rule that keeps a dispatcher's two skins from becoming two data paths.
- **Shared boundary.** All `use*` hooks, API clients, and state contracts (`TaskDetailState`, …) are shared verbatim. Mobile adds *presentation only*; zero backend/data change.
- **Mobile skin registry.** Each surface that has a `ARCHETYPE_BY_SLUG` dispatcher gains a parallel `MOBILE_ARCHETYPE_BY_SLUG` with a `Default*` mobile skin. Partial faction coverage is intended — every faction renders via the Default until a bespoke mobile skin lands (like the desktop archetypes). Faction detail is the reference implementation (`pages/factionDetail/mobileArchetypes/`). Task detail and praxis detail no longer are: each collapsed to one responsive component per faction and had its mobile surface retired outright — task detail under ADR-0058 (#1068), praxis detail under ADR-0061 / epic #1085 (#1089). A twin is a choice per surface, not the default.
- **No fixed-px grids on the mobile path.** The desktop archetypes lay out with fixed-width inline grids (`width: 240` sidebars, `gridTemplateColumns: 1fr 322px`). A mobile skin must not — it stacks single-column with flow/wrap so it survives a 375px viewport.

Reference issues: mobile foundation #494; design language + prompts #495; core-loop screens #496–#500.

---

## 2. Whose faction themes each surface? (contextual-faction resolution)

A per-faction surface needs to know *which* faction to render as. Use these rules — they are not all the same.

| Surface | Contextual faction = | Mixed / neutral page → |
|---|---|---|
| Task card, Praxis card, Edit-praxis, Vote UI | the **task's** primary faction | n/a (a task always has one) |
| Faction-selection card, Filter pennant | the faction **being rendered** | n/a |
| Progression / level | the **member's** faction in profile/sidebar; the **card's** faction inside a card | global pill |
| Avatar + badge | the **character's member** faction | generic avatar |
| Comment (#14) | a posted **row** → the comment **author's member** faction; the **composer** → the **current character's member** faction. Resolved live, no snapshot. | a thread is multi-faction; the thread container is neutral and never themes |
| Activity-feed card | the item's **`context_faction_slug`** — derived server-side as *actor's member faction, else task's faction* (so social events read the actor, `global_task` reads the task). The `FactionFeedFrame` chassis dispatches on it. | `null` → the **Unaffiliated** chassis, which IS the na kit (ADR-0039/0046/0048) — not a bare passthrough. Changed by #1194; the old neutral-passthrough assertion was reversed on purpose. `era_announcement` is chassis-exempt by *type*, not by a null slug. |
| **Page backdrop** | the page's single contextual faction (faction detail page, a single-faction character profile) | **global rainbow watercolor** |

**Backdrop is the one that must degrade gracefully.** On any page that mixes factions (the global quest board, the join/recruit grid) or has no faction (settings), render the global watercolor. Never theme a mixed page to one faction.

---

## 3. The token contract a new faction must satisfy

Every faction supplies one CSS-variable block in `frontend/src/index.css`, defined in **both** `:root` (light) and `[data-theme="dark"]`. Naming is `--faction-{cssKey}-{suffix}`. `factionCssVar(slug, suffix)` reads these; a missing `CSS_KEY` entry falls back to the `default` theme (neutral grey / rainbow — the `na` set, ADR-0039), not `ua`. Fills that render a dynamic slug use `factionFill(slug, shape)` instead, which turns `na`'s scalar grey into its spectrum by surface shape.

Required suffixes (consumed by the dispatchers / `factionCssVar`):

| Token | Role |
|---|---|
| `--faction-{key}` | primary color (brand) |
| `--faction-{key}-light` | faint tint background |
| `--faction-{key}-border` | rgba border |
| `--faction-{key}-card-bg` | card surface |
| `--faction-{key}-card-text` | card body text |
| `--faction-{key}-card-accent` | metadata / decorative accent |
| `--faction-{key}-card-muted` | secondary text |
| `--faction-{key}-card-font` | headline font (points at a `--font-*` face) |
| `--faction-{key}-on-fill` | AA-legible text ink for the faction's **solid fill** — white or ink per faction × theme, so `factionCssVar(slug, 'on-fill')` never paints white on a fill that fails AA (#649). Not for `na`, whose fill is a gradient, not a text backdrop. Guarded by `factionContrast.test.ts`. |

Plus any **archetype-private primitives** (e.g. Everymen's `--everymen-cream/-gold/-ink/-paper/-field`, Gestalt's window-chrome tokens, S.N.I.D.E.'s punk pigments `--faction-snide-acid/-ink/-paper/-pink/-tape` + flyposted-wall `--faction-snide-wall*` + the `--faction-snide-font-*` set). These are referenced only inside that faction's own components, not through `factionCssVar`, and are ported verbatim from the design kit. S.N.I.D.E. namespaces them under `--faction-snide-*` (rather than bare `--acid` etc.) so they stay within the single-source-of-truth scheme; note that this flips `--faction-snide-card-bg` to ink — SNIDE's **card** is an always-dark slab like Singularity's, and **the faction is not** (ADR-0085). Its wall and its `-note-*`/`-composer-*`/`-slip-*` inks flip with the theme, and a page, panel or rail grounded on the invariant `-ink` or `-card-bg` is the recurring defect that record exists to close.

**Dark mode is automatic via the cascade** — supply a `[data-theme="dark"]` value for every token; no `dark ? a : b` ternaries in components. A faction may opt to be always-dark (Singularity) by giving identical light/dark values — and if it does, that is a property of every ground it paints, not of one surface's docstring (ADR-0085).

**Fonts** must already be loaded in `index.html` / `index.css`. Bebas Neue (`--font-accent`) and Caveat (`--font-faction-script`) are present. A genuinely new face is a separate, explicit step — e.g. S.N.I.D.E.'s ransom set added `Anton` and `Archivo Black` to the `index.html` Google Fonts `<link>`.

---

## 4. New-faction registration checklist

Hand this to whoever wires the faction after design is delivered. (Designer only needs §1–§3; this section is the engineering contract.)

**Backend (`backend/`)**
1. `eras/era_1.py` → add a `FactionConfig` to `ERA_1_FACTIONS` with its **8 fields** (`game_config.py` dataclass): `slug, can_always_rejoin, own_task_modifier, other_task_modifier, collab_own_modifier, collab_other_modifier, duel_win_modifier, duel_loss_modifier`. Name/description live in `factions.json` (ADR-0038); color in `index.css` (ADR-0003) — **not** on `FactionConfig`.
2. `eras/era_1.py` → optional taunt structure for the faction; the *wording* resolves via `frontend/src/locales/en/taunts.json` (ADR-0031 — there is no `taunt_templates` config field).
3. Visibility: add the slug to `seed.py` `HIDDEN_FACTION_SLUGS` only if it should be hidden; otherwise it defaults to `visible`.
4. Seeding: a fresh DB seeds from config automatically; an **already-seeded DB needs a one-off `Faction` row upsert** (no alembic migration — the table is a thin display mirror).
5. `/game-config` exposure is automatic.

**Frontend theme**
6. `index.css` → the `--faction-{key}-*` block in `:root` AND `[data-theme="dark"]` (§3).
7. `utils/factions.ts` → one `CSS_KEY` entry (underscore-slug → hyphen-css-key). That is the whole step: there is no colour to add, because the JS side holds no hex since #1269 and `getAllFactions()` derives from this map. (It used to also want a `FACTION_FALLBACKS` row whose `color` had to equal the light primary. That mirror drifted, and a literal could never carry the dark value anyway.)
8. Fonts: only if the archetype needs a face not already loaded.

**Frontend dispatch**

9. `src/factions/<slug>.ts` → one manifest module declaring only the surfaces this faction overrides, plus one line adding it to `src/factions/index.ts`. That is the whole dispatch step.

   The manifest is **override-only**: any surface it does not declare renders that surface's `Default*` archetype. A faction that declares nothing already renders correctly everywhere, including on surfaces that do not exist yet — partial registration is the normal case, not a degraded one. Entries are thunks (`taskCard: () => MyTaskCard`) because dispatcher and archetype modules import each other; see the note in `src/factions/manifest.ts`.

   There is deliberately **no list of dispatchers here**. The previous version of this section enumerated seven of them, was wrong the day it was written, and drifted further every time a surface was added — it never mentioned any mobile registry, the profile bodies, the faction bodies or the duel skins. `src/factions/manifest.ts` now carries the authoritative surface list in a form the compiler checks, and `src/factions/__tests__/addAFaction.test.tsx` proves a manifest-only faction renders on every one of them. Read those, not prose.

10. Leave the slug out of the `Factions.tsx` hidden list unless it should be hidden.

11. **Contrast:** verify every text/background color pair in the faction's tokens (light **and** dark) meets WCAG AA — 4.5:1 for normal text, 3:1 for large text and UI components — before registering the faction.

    Since #2661 the **role pairings are enumerated for you**: `factionContrast.test.ts` loops
    9 slugs × 2 grounds × 5 pairings × 2 cascades and measures them the moment the slug is in
    `CSS_KEY`. You do not write those rows. What you still owe is everything the loop cannot
    see, and its docblock lists five such things — pairings that are not role-on-role, the
    *other* side of a hairline (a card edge also faces the page, and no role names the page),
    anything composed from a role (`color-mix`, a ramp, a scrim: the loop sees the ingredient,
    not the dish), whether any component renders the pair at all, and a token block written
    `:root,\n[data-theme] {`, which the resolver matches on one line and therefore cannot see
    at all. **Read that list before claiming the gate covers you** — it is false by default.

**The role vocabulary (#2659) — usually nothing to do**

12. `utils/factionRoles.ts` needs **no edit for a new faction**. Nine roles (`paper`, `ink`,
    `quiet`, `line`, `accent`, `fill`, `onFill`, `radius`, `face`) resolve out of the
    `--faction-{key}-card-*` block step 6 already requires, so *registering the slug in
    `CSS_KEY` beside a `-card-*` block is the whole of joining the vocabulary*. **A faction
    supplies a map, not values** — zero new declarations.

    The one exception is a faction whose **chrome stands on a ground that is not its card**.
    S.N.I.D.E. is the only one today (its flyposted wall, ADR-0085) and it is a
    `GROUND_OVERRIDES.chrome.<slug>` entry. Note that `GroundOverride`'s type makes a
    fill-only override *unrepresentable*: `fill` and `onFill` must move together, because an
    ink is measured against the fill it sits on.

13. Surfaces read roles **by role name, not by faction**: spread `factionRoleVars(slug, prefix)`
    on a root, or call `factionRoleVar(slug, role, ground)` where a module has no root of its
    own to hang a prefix on. The prefix convention is `<faction stem>-<the surface's
    SURFACE_KEYS key>` — derived rather than invented, so uniqueness holds by construction.
    The stem is the faction's own short form and is **not always the slug**: UA's is `leaf`
    (`leaf-comment`, `leaf-duel-seal`), because `--ua-*` is UA's *retired* legacy family and
    live guards assert nothing reads it. Others in use: `wow`, `sg`, `snd`, `ev`, `na`.

14. **Hand the resolver a live slug only where the surface's ground is a role too.** Where an
    archetype stands on a ground that takes no slug — `factionSheet()`, `factionSpectrumSheet()`,
    `.na-backdrop` — pin the call (`factionRoleVars("na", …)`). The ground moves with the ink or
    neither moves; #2669 measured what the other choice costs, at 1.03:1.

**What a faction does not author**

- **Any surface it does not want to override.** `SURFACE_KEYS` declares **22** surfaces and the
  manifest is override-only, so an undeclared surface renders `na`'s row. Partial registration
  is the normal case: Albescent is the deliberate example (ADR-0083 — one ornament vocabulary
  over na, not a skin per surface). The single exception is `default.ts`, which *must* claim all
  22, because nothing stands behind it.
- **Outer margin on anything that travels.** A shared piece owns its own box; the **host** owns
  every gap (#2655). This is the score stamp's ruled exemption and it is a law, not a default.
- **Its contrast rows** (item 11), or **new custom properties for the role map** (item 12).
- **Behaviour or copy.** A capability belongs to `FactionConfig` in `backend/game_config.py`
  because abilities move between factions from era to era (ADR-0042, #2660, #2664); wording
  belongs to `locales/en/factions.json` (ADR-0038). **ADR-0090 is the procedure for deciding
  which of the four buckets — paint, tree, behaviour, content — a difference is in**, and it
  is worth reading before you design anything a `Default*` archetype does not already do.

**Faction-dressed surfaces that are not manifest surfaces**

These paint by faction without going through `SURFACE_KEYS`, so a new faction reaches them
through tokens only and never by registering an archetype. They are named here because they are
where a correctly registered faction most often still looks wrong, and because each was found by
a lane rather than by a census:

| file | how it dresses |
|---|---|
| `components/sigil/FactionSigil.tsx` | reaches `factionCssVar` for UA *and* Singularity in one file |
| `components/vote/VoteShell.tsx` | shared shell, faction paint |
| `components/cardMasthead/factionBands.tsx` | travels across four host surfaces |
| `components/InvitationLetterPopup.tsx` | 375 lines serving all nine factions, registered nowhere |
| `utils/factions.ts` | the `CSS_KEY` map itself |

This list is a census, not a registry — it records where the boundary sat when #2649's faction
lanes finished, and nothing keeps it current. Re-derive before trusting it.

---

## 5. Designer brief template (copy/paste for the next faction)

> **Faction:** `<name>` (`<slug>`). **Archetype metaphor:** `<one line>`. **Primary color:** `<hex light>` / `<hex dark>`. **Headline font:** `<face>`.
>
> Deliver, in the World Zero token scheme (`--faction-<slug>-*`, light + dark), styled designs for **all twelve per-faction surfaces** in `SPEC-faction-ui-profile.md §1`:
> 1. Task card  2. Praxis card  3. Edit-praxis editor  4. Faction-selection card  5. Headline-font usage  6. Full color token block  7. Filter pennant  8. Vote/rating UI (1–5)  9. Progression/level indicator  10. Page backdrop (must also look right *behind* unrelated content; remember the global fallback)  11. Avatar + membership badge  12. Activity-feed card.
>
> Do **not** redesign global chrome: nav/sidebar/modals/toasts, or the generic button/tab/chip/empty-state controls. If your kit includes those, mark them "reference only — not wired."
>
> Reuse the shared design-system tokens (`--space-*`, `--radius-*`, type scale). Supply a `[data-theme="dark"]` value for every color token. No hardcoded hex in component markup — everything via CSS vars.

---

## 6. Change log

- **2026-08-29** — **§4 becomes the "what a faction needs" checklist (#2719, Batch Ω of #2649).**
  The epic's success condition was *"adding a hypothetical tenth faction is demonstrably a token
  set plus its drawings — write that down somewhere a person will find it"*, and its decision 03
  makes a tenth faction a **documentation** goal rather than an architecture one. This section
  was already that document, so it was extended rather than duplicated: a second checklist is
  the manifest-inversion failure §4 was pruned to avoid in 2026-07-18, and it would have rotted
  the same way. Added: the role vocabulary (items 12–14 — normally *no edit at all*, because a
  faction supplies a map rather than values, #2659), what the contrast loop now enumerates for
  you and the five things it still cannot see (#2661/#2669), what a faction does **not** author,
  and the census of faction-dressed surfaces that are not manifest surfaces. Item 11 was extended
  in place and items 1–11 keep their numbers, because other files cite them by number and one
  such citation (`factionContrast.test.ts`'s "§4 item 15") is already stale.
  **`SURFACE_KEYS` is 22, not twenty** — verified against `src/factions/manifest.ts`; #2649's
  plan says twenty and `docs/kit-structure.md` said twenty and 21 in three places, all corrected.
  The classification procedure that decides what belongs in this checklist at all is
  **ADR-0090** (paint · tree · behaviour · content), which records a *procedure* rather than a
  rule because the epic's original rule mispredicted five of six cases on the easiest family
  (#2650).
- **2026-07-18** — **§4's dispatcher list removed; faction registration inverted (#782).**
  Each faction now owns one manifest module (`src/factions/<slug>.ts`) declaring the
  surfaces it overrides, and the dispatchers read from it via `surfaceMap()`; the 31
  surface-owned slug→component registries are gone. The checklist's per-dispatcher steps
  were deleted rather than corrected **because they were unverifiable by construction**:
  prose cannot be compiled, so it went stale silently and the cost landed on whoever added
  the next faction. The replacement is executable — a golden test registers a fake faction
  through the manifest index alone and asserts it renders on every surface, and fails
  loudly if a new dispatcher declares its own registry instead of routing through the
  manifest. What is left in §4 is only what a test cannot assert: backend `FactionConfig`
  registration, seeding and the `Faction` row upsert, visibility, fonts, tokens and
  contrast. Worth recording: the census for that refactor was wrong three times over
  (21 registries claimed, 30 found by hand, 31 found by the test) — the one nobody spotted
  was named `BY_FACTION` instead of `*_BY_SLUG`, which is exactly why the guard is a test
  and not a list.
- **2026-07-17** — **Removed §7 "current coverage matrix"** (docs consolidation, PR #692).
  It was audited-from-code state that had to be re-synced by hand; the dispatchers in
  `frontend/src` are the source of truth. §1 stays the contract; §4's field list corrected
  to the 8 real `FactionConfig` fields.
- **2026-06-24** — **Activity-feed cards (#12) made truly per-faction + drift cleanup.**
  Wired the dispatch seam ahead of design: a `FactionFeedFrame` (`FACTION_FEED_FRAMES` +
  passthrough default) wraps each event-type card; the backend derives one
  `context_faction_slug` per item (a Pydantic computed field on `ActivityFeedItem` —
  actor's faction, else task's faction, else neutral). Empty frame map = zero visual change
  today; a faction goes bespoke by adding one map row (no other change). Also reconciled the
  two §1 drifts: **progression (#9)** corrected to *tint-only* (one shared `LevelPill`, no
  dispatcher — was wrongly listed as bespoke); stale pre-ADR-0004 slug names (Analog /
  Gestalt / Journeymen) in §1's example column updated to `everymen` / `wow` (Warriors of
  Whimsy) / `ephemerists`. (Change-log entries below keep their original names as history.)
- **2026-06-24** — Added **§7 current coverage matrix** (audited from the dispatchers):
  bespoke-component surfaces with per-faction ✅/⬜ state vs. token/tint surfaces. Thinnest
  factions: `ua`, `singularity`; sparsest surfaces: task-detail, faction-hero, plus
  propose-task / praxis-detail (no dispatch wired).

- **2026-06-23** — Added surface **#14 Comment** (ADR-0006, designed, not yet built):
  one per-faction archetype in two modes (posted `row` + `composer`), **actor-scoped**
  (row → author's member faction; composer → current character's member faction; resolved
  live, no snapshot). Invariant slots author · body · timestamp+edited; thread container is
  neutral (multi-faction). Registered via `COMMENT_COMPONENTS` (§4 step 13).
- **2026-06-06** — Rebranded the **Journeymen → The Ephemerists** (slug kept as
  `journeymen`; no DB migration). New archetype: the *Discordant Map* illuminated codex
  (lapis-verdigris `#1d6e72`/`#3aa0a4`, Cinzel/EB Garamond/Cormorant, vellum + gold-leaf +
  rubric). **Those two hexes are history, not the current spine hue** — this entry keeps
  its original values as the 2026-06-24 entry says change-log entries do. `#2068` moved
  `--faction-ephemerists` to the plate's own brass (`#c9a24b`/`#e6c877`) and left the teal
  ownerless; the archetype's vellum/gold-leaf skin did not move with it, which is the
  spine-vs-skin split §1 draws. Added `--eph-*` pigments + `.eph-backdrop` to `index.css` and registered the
  faction in all five Tier-3 dispatchers (vote = the wax-seal *Concordance* ramp,
  progression = roman-numeral grade, backdrop, avatar, feed frame), which it previously
  inherited as global defaults.
- **2026-06-06** — Added surface **#13 Faction detail page** (`/factions/:slug`):
  description + members + tasks + recent praxis, backdrop-themed. Shell shipped with
  placeholder styling; per-faction visual design pending. Flagged the **praxis card**
  (#2) for a visual rework — technically per-faction but reads flat next to task cards.
- **2026-06-05** — Created. Adopted **Tier 3** boundary. Added surfaces 8–12 (vote, progression, backdrop, avatar, feed card) as per-faction; kept generic controls global. Drafted to support the **Everymen** (new, red, Bebas Neue, union-poster) and **Gestalt redesign** (pink `#ec5f99`/`#f472b6`, Caveat, lo-fi `.exe` desktop) work.
