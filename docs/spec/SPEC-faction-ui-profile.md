# SPEC — Per-Faction UI Profile

**What this is.** The definitive list of which UI/UX surfaces vary *per faction* and which stay *global*. Feed this to a designer (human or Claude design) at the start of any new-faction or faction-redesign brief so the deliverable covers exactly the right surfaces — no more, no less.

**Status.** Reflects the **Tier 3** scope adopted 2026-06-05 (cards + voting + progression + page backdrop + avatars + activity-feed cards are per-faction; generic controls stay global). Earlier the only per-faction surface was the card archetype; Tier 3 widened the boundary.

**Source of truth.** This doc describes *intent and the contract*. Exact values live in `frontend/src/index.css` (CSS vars), `frontend/src/utils/factions.ts` (registry), and `backend/eras/era_1.py` (gameplay). If they disagree, the code wins — fix this doc or the code, don't let them drift. Companion: `WORLD_ZERO_STYLE.md` (§6 "faction identity cascades from the card archetype").

---

## 1. The per-faction boundary (Tier 3)

> **Current implementation coverage lives in [§7](#7-current-coverage-matrix).** §1 is the *contract* (what a faction *may* own); §7 is the *state* (what each faction *actually* has wired today, and where it falls back to a default).

### Per-faction — a faction owns its own version of each of these

| # | Surface | What varies | Existing example |
|---|---|---|---|
| 1 | **Task card** | Whole archetype (shape, layout, ornament, copy voice) | Everymen union-poster, S.N.I.D.E. ransom clipping |
| 2 | **Praxis card** | Mirrors the task-card archetype — **⚠ currently reads flat next to the task cards; flagged for a visual rework (pending design)** | per faction |
| 3 | **Edit-praxis editor** | Mirrors the archetype, as a form | sticky-note / terminal / gazette |
| 4 | **Faction-selection card** | Bespoke "join me" card | per faction |
| 5 | **Headline font** | One display face per faction | Bebas Neue (Everymen), Caveat (Warriors of Whimsy) |
| 6 | **Color set** | Full `--faction-{slug}-*` token block, light + dark | see §3 |
| 7 | **Filter pennant** | Tab uses the faction primary color at full saturation | global pennant shape, per-faction fill |
| 8 | **Vote / rating UI** *(Tier 3 new)* | The 1–5 rating control's visual metaphor | Everymen ink-ramp stamps; WoW heart ramp |
| 9 | **Progression / level indicator** | **Color tint only today** — one shared `LevelPill` shape, faction-colored via `factionCssVar`. A bespoke per-faction *shape* (numeric pill vs. moon-phase track) is a *candidate*, **not wired** (no dispatcher). | aspirational: WoW moon-phase track |
| 10 | **Page backdrop** *(Tier 3 new, optional)* | Full-page background **when a faction is the page's context**; falls back to the global rainbow watercolor otherwise | Everymen poster wall; WoW lo-fi desktop |
| 11 | **Avatar + membership badge** *(Tier 3 new)* | Avatar frame treatment + a small faction sigil badge | Everymen cog badge; WoW moon badge |
| 12 | **Activity-feed card** *(Tier 3; full adoption 2026-07-02, #376)* | The feed is neutral; the **faction owns the whole row** for every "someone did X" event. Those types normalize into one slot-driven `FeedRowContent` (actor · action · headline · points/level · time) inside the faction's `FactionFeedFrame` — **no per-event-type card**. The four structural/interactive events (era announcement, invitation letter, duel challenge, collab invite) keep bespoke companion cards (the interactive ones own accept/decline). | Everymen dispatch slip; WoW window row |
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
- **Switch location.** Only two places branch on form factor: the **`Layout` shell** (`MobileLayout` with `MobileTabBar` vs. `DesktopLayout` with the top NavBar + sidebar) and **each page dispatcher**. Never a per-leaf-component branch — mobile and desktop are distinct component trees.
- **Shared boundary.** All `use*` hooks, API clients, and state contracts (`TaskDetailState`, …) are shared verbatim. Mobile adds *presentation only*; zero backend/data change.
- **Mobile skin registry.** Each surface that has a `ARCHETYPE_BY_SLUG` dispatcher gains a parallel `MOBILE_ARCHETYPE_BY_SLUG` with a `Default*` mobile skin. Partial faction coverage is intended — every faction renders via the Default until a bespoke mobile skin lands (like the desktop archetypes). Task detail is the reference implementation (`pages/taskDetail/mobileArchetypes/`).
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
| Activity-feed card | the item's **`context_faction_slug`** — derived server-side as *actor's member faction, else task's faction* (so social events read the actor, `global_task` reads the task). The `FactionFeedFrame` dispatches on it. | `null` → neutral passthrough frame (e.g. `era_announcement`) |
| **Page backdrop** | the page's single contextual faction (faction detail page, a single-faction character profile) | **global rainbow watercolor** |

**Backdrop is the one that must degrade gracefully.** On any page that mixes factions (the global quest board, the join/recruit grid) or has no faction (settings), render the global watercolor. Never theme a mixed page to one faction.

---

## 3. The token contract a new faction must satisfy

Every faction supplies one CSS-variable block in `frontend/src/index.css`, defined in **both** `:root` (light) and `[data-theme="dark"]`. Naming is `--faction-{cssKey}-{suffix}`. `factionCssVar(slug, suffix)` reads these; a missing `CSS_KEY` entry silently falls back to the `ua` theme.

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

Plus any **archetype-private primitives** (e.g. Everymen's `--everymen-cream/-gold/-ink/-paper/-field`, Gestalt's window-chrome tokens, S.N.I.D.E.'s punk pigments `--faction-snide-acid/-ink/-paper/-pink/-tape` + flyposted-wall `--faction-snide-wall*` + the `--faction-snide-font-*` set). These are referenced only inside that faction's own components, not through `factionCssVar`, and are ported verbatim from the design kit. S.N.I.D.E. namespaces them under `--faction-snide-*` (rather than bare `--acid` etc.) so they stay within the single-source-of-truth scheme; note that this flips `--faction-snide-card-bg` to ink — SNIDE is an always-dark card like Singularity.

**Dark mode is automatic via the cascade** — supply a `[data-theme="dark"]` value for every token; no `dark ? a : b` ternaries in components. A faction may opt to be always-dark (Singularity) by giving identical light/dark values.

**Fonts** must already be loaded in `index.html` / `index.css`. Bebas Neue (`--font-accent`) and Caveat (`--font-faction-script`) are present. A genuinely new face is a separate, explicit step — e.g. S.N.I.D.E.'s ransom set added `Anton` and `Archivo Black` to the `index.html` Google Fonts `<link>`.

---

## 4. New-faction registration checklist

Hand this to whoever wires the faction after design is delivered. (Designer only needs §1–§3; this section is the engineering contract.)

**Backend (`backend/`)**
1. `eras/era_1.py` → add a `FactionConfig` to `ERA_1_FACTIONS` with **all 12 fields** (`game_config.py` dataclass): `slug, name, description, color, is_selectable, can_always_rejoin, own_task_modifier, other_task_modifier, collab_own_modifier, collab_other_modifier, duel_win_modifier, duel_loss_modifier`.
2. `eras/era_1.py` → optional taunt block in `ERA_1_TAUNT_TEMPLATES` (else `"default"` applies).
3. Visibility: add the slug to `seed.py` `HIDDEN_FACTION_SLUGS` only if it should be hidden; otherwise it defaults to `visible`.
4. Seeding: a fresh DB seeds from config automatically; an **already-seeded DB needs a one-off `Faction` row upsert** (no alembic migration — the table is a thin display mirror).
5. `/game-config` exposure is automatic.

**Frontend theme**
6. `index.css` → the `--faction-{key}-*` block in `:root` AND `[data-theme="dark"]` (§3).
7. `utils/factions.ts` → a `FACTION_FALLBACKS` entry **and** a `CSS_KEY` entry (underscore-slug → hyphen-css-key). Keep the fallback `color` equal to the light primary so JS and CSS agree on first paint before the API hydrates.
8. Fonts: only if the archetype needs a face not already loaded.

**Frontend dispatch — register the faction in each dispatcher**
9. `components/TaskCard.tsx` → `CARD_COMPONENTS`.
10. `components/cards/FactionCard.tsx` → the `switch`.
11. `pages/EditPraxis.tsx` → `ARCHETYPE_BY_SLUG`.
12. The Tier-3 dispatchers, each a `Record<slug, Component>` + global default mirroring `CARD_COMPONENTS` — omit a faction to inherit the default for that surface:
    - **vote** → `components/vote/VoteUI.tsx` `FACTION_VOTE`
    - **backdrop** → `components/backdrop/FactionBackdrop.tsx` `FACTION_BACKDROPS`
    - **avatar** → `components/avatar/FactionAvatar.tsx` `FACTION_AVATARS`
    - **activity-feed frame** → `components/feed/FactionFeedFrame.tsx` `FACTION_FEED_FRAMES` (wraps the event-type card; dispatches on the item's server-derived `context_faction_slug`)
    - *(progression/level is token-tinted, not a dispatcher — no map to register; #9.)*
13. **Comment (#14, ADR-0006):** `COMMENT_COMPONENTS` (`Record<slug, Component>` + `DefaultComment`), one archetype rendered in `row`/`composer` modes. Omit a faction to inherit `DefaultComment`. The thread container is neutral — do not register it.
14. Leave the slug out of the `Factions.tsx` hidden list unless it should be hidden.

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

## 7. Current coverage matrix

**What this is.** The *state* companion to §1's *contract*: which factions have a bespoke version of each surface wired **today**, and which fall back to a generic default. Use it to brief design ("commission an `X` for these factions") and to scope a new faction ("here's everything it could own"). Audited from the dispatchers in code on **2026-06-24** — re-audit by grepping `pickVariant(` and the `Record<slug, …>` maps if it looks stale.

**First-class factions (7):** `ua` · `everymen` · `wow` · `snide` · `ephemerists` · `singularity` · `albescent`. As of #232, `albescent` is a fully first-class identity: it owns a bespoke archetype on **every** surface (task/praxis card, edit-praxis, task/praxis detail, feed frame, avatar, backdrop, vote "bear witness", comment, faction body + hero) plus its own `--faction-albescent-*` token set and `CSS_KEY` entry — the `albescent → ua` alias has been **dropped** from `FACTION_ALIASES`. (`ua_masters` is dormant → Era 2; only `aged_out` remains a `ua` alias slug that owns nothing of its own by design.)

### A. Bespoke-component surfaces — "missing" = falls back to a generic `Default*`

✅ own component · ⬜ generic default. The dispatcher is the single place each row is wired (a `pickVariant` map or a `switch`).

| Surface | Dispatcher (`frontend/src/…`) | ua | everymen | wow | snide | ephemerists | singularity |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Task card | `components/TaskCard.tsx` `CARD_COMPONENTS` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Praxis card | `components/PraxisCard.tsx` `FACTION_FRAME` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit-praxis editor | `pages/EditPraxis.tsx` `ARCHETYPE_BY_SLUG` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Faction-selection card | `components/cards/FactionCard.tsx` (`switch`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vote / rating UI | `components/vote/VoteUI.tsx` `FACTION_VOTE` | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Page backdrop | `components/backdrop/FactionBackdrop.tsx` `FACTION_BACKDROPS` | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Avatar + badge | `components/avatar/FactionAvatar.tsx` `FACTION_AVATARS` | ⬜ | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Faction detail hero | `pages/FactionDetail.tsx` `FACTION_HEROES` | ⬜ | ⬜ | ⬜ | ✅ | ✅ | ⬜ |
| Task detail page | `pages/TaskDetail.tsx` `ARCHETYPE_BY_SLUG` | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |
| Activity-feed card frame | `components/feed/FactionFeedFrame.tsx` `FACTION_FEED_FRAMES` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Propose-task page | `pages/ProposeTask.tsx` → `DefaultProposeTask` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Praxis detail page | `pages/PraxisDetail.tsx` → `DefaultPraxisDetail` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Read it two ways:**
- **By faction (what to commission):** `ua` and `singularity` are the thinnest — cards only, no vote / backdrop / avatar. `snide` is richest (the only bespoke task-detail page). `everymen` / `wow` / `ephemerists` sit in the middle.
- **By surface (where the system is thin):** task-detail (1/6) and faction-hero (2/6) are sparse; the **activity-feed frame** is *wired but unfilled* (dispatcher + server-derived `context_faction_slug` ship 2026-06-24, every faction awaits a design archetype); propose-task and praxis-detail have **no dispatch wired at all** (every faction renders the default) — add a `pickVariant` dispatch there before any faction can own them.

### B. Token / tint surfaces — every faction has these by construction

Not bespoke components; driven by the CSS-var block (§3) + registry (`utils/factions.ts`). A faction can't be "missing" one — a blank token silently falls back to the `ua` theme. So they're **not** a design-commission gap, only a "did you fill in the tokens" check.

| Surface (§1 #) | How it varies | Mechanism |
|---|---|---|
| Headline font (#5), Color set (#6) | per-faction values | `--faction-{key}-*` tokens |
| Filter pennant (#7) | primary-color fill | `factionCssVar()` |
| Progression / level (#9) | color tint only | `components/ui/LevelPill.tsx` — one shared pill shape, faction-*colored*. A bespoke per-faction *shape* is a candidate, not wired (no dispatcher). |
| Comment (#14) | designed, **not built** | `COMMENT_COMPONENTS` does not exist yet (ADR-0006) |

> **Faction owns the row (full adoption, #376, 2026-07-02).** `FeedCardRouter` normalizes every "someone did X" event (`friend_completion`, `foe_completion`, `vote_on_mine`, `foe_taunt`, `friend_signup`, `friend_defection`, `global_task`) into ONE slot bag (`normalizeFeedItem` → `FeedRow`) rendered by `FeedRowContent` inside `FactionFeedFrame` — **no per-event-type card**. Only the four structural/interactive events (`era_announcement`, `invitation_letter`, `duel_challenge`, `collab_invite`) keep bespoke companion cards; the interactive two own accept/decline handlers that must not collapse into slots. This supersedes the earlier frame-only model (#203/#282): the faction owns the frame *and* the content.

---

## 6. Change log

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
  rubric). Added `--eph-*` pigments + `.eph-backdrop` to `index.css` and registered the
  faction in all five Tier-3 dispatchers (vote = the wax-seal *Concordance* ramp,
  progression = roman-numeral grade, backdrop, avatar, feed frame), which it previously
  inherited as global defaults.
- **2026-06-06** — Added surface **#13 Faction detail page** (`/factions/:slug`):
  description + members + tasks + recent praxis, backdrop-themed. Shell shipped with
  placeholder styling; per-faction visual design pending. Flagged the **praxis card**
  (#2) for a visual rework — technically per-faction but reads flat next to task cards.
- **2026-06-05** — Created. Adopted **Tier 3** boundary. Added surfaces 8–12 (vote, progression, backdrop, avatar, feed card) as per-faction; kept generic controls global. Drafted to support the **Everymen** (new, red, Bebas Neue, union-poster) and **Gestalt redesign** (pink `#ec5f99`/`#f472b6`, Caveat, lo-fi `.exe` desktop) work.
