# World Zero

A community game: players make Characters, complete real-world tasks, post proof
("praxis"), and earn points via star-rating votes. Each faction owns a distinct visual
identity that cascades across the UI. This glossary pins the vocabulary of the
**per-faction page architecture** — the dispatch machinery that renders a faction's
bespoke version of each surface.

## Language

**Surface**:
A distinct UI region that can vary per faction (task card, vote control, page backdrop,
faction detail page, …). The authoritative list lives in `SPEC-faction-ui-profile.md §1`.
_Avoid_: widget, element, component (a surface may be built from many components).

**Archetype**:
A faction's bespoke rendering of a surface — its whole shape, layout, ornament, and copy
voice (e.g. S.N.I.D.E.'s ransom-clipping task card). One faction, one surface, one archetype.
_Avoid_: variant (reserve "variant" for the `pickVariant` mechanism), skin, theme.

**Default archetype**:
The faction-agnostic fallback rendering of a surface, used when a faction registers no
archetype of its own. Named `DefaultXxx` (e.g. `DefaultFactionBody`).

**Dispatcher**:
The per-surface map (`Record<slug, Component>`) plus the `pickVariant` call that turns a
faction slug into its archetype, falling back to the default. One dispatcher per surface.

**Slug**:
The faction's stable identifier in the DB and code. Slugs **match faction identity** —
the rename `analog→everymen`, `gestalt→wow`, `journeymen→ephemerists` is being applied
(see ADR-0004), retiring the legacy-slug reuse trick.
_Avoid_: faction id, key (CSS uses a separate hyphenated "css key").

**Legacy slug** *(being retired — ADR-0004)*:
A slug kept after a rebrand to dodge DB/plumbing churn: `analog` shown as "Everymen",
`gestalt` as "Warriors of Whimsy", `journeymen` as "The Ephemerists". This trick is the
top source of doc/code drift and is being reversed — slugs renamed to match identity even
at the cost of breaking the (test-only) live site. Historical term; do not introduce new
legacy slugs.

**Alias slug**:
A slug that inherits another faction's archetype by design rather than rebrand:
`albescent` and `aged_out` both render as `ua`. Encoded in `SLUG_ALIASES` in
`utils/factionDispatch.ts`.

**Content slot**:
An invariant piece of data a surface always renders (a task card's title, description,
points). The slots are fixed across all factions; only their presentation varies by
archetype. The per-faction freedom is bounded to *how* slots are drawn, never *which*
slots exist. **Made law in ADR-0016:** every per-faction surface exposes **one data
contract** (its slots); each slot is rendered by a **shared control that owns its own
binding** (reads the slot from the contract), so an archetype is handed only
`{contract, skin}` and *cannot* feed a slot different data. Archetypes own **skin +
arrangement** only; faction-specific copy is catalog content (ADR-0010) keyed by the
contextual faction, not a structural slot difference.

**Contextual faction**:
The faction a given surface themes to. Resolved per-surface by a surface-specific rule —
*not* a single per-page value. A single page can show surfaces themed to several
factions at once. Resolution rules live in `SPEC-faction-ui-profile.md §2`.

**Task-scoped surface**:
A surface whose contextual faction is **the task's faction**: task card, praxis card,
edit-praxis, vote, and the task/praxis page frame + backdrop. A SNIDE task's whole page
reads SNIDE; a praxis of that task reads SNIDE.

**Praxis**:
A character's (or group's) record of doing one task — from claiming it through posting the
proof Sally shows after "jump really high". One task has many praxes. A praxis exists from
the moment it's claimed (`in_progress`), so it is *not* synonymous with the completion; it's
the whole record that spans claim → proof. One praxis becomes open to community voting once
it is **submitted** (see **Praxis status**).
_Avoid_: "sealed" (legacy term, retired — the code/DB/UI all say *submitted*); post, entry.

**Praxis type**:
Which collaboration shape a doing-of-a-task takes: **solo**, **collab**, or **duel**. Solo and
collab are *one shared praxis* (collab just has many members on it); a **duel** is **two linked
praxes that compete** — see **Duel**.

**Duel** *(being redesigned — two-linked-praxes model; ADR-0011)*:
A head-to-head competition between two characters on the same task. Each side authors **its own
`type=solo` praxis** — own owner, body, media, votes — and the two are joined by a **Duel link**.
The winner is whichever linked praxis earns more stars; the win/loss multiplier is applied per
side at scoring time and **floats with the votes until era reset** (no per-duel freeze). *Not*
one shared praxis with two members and split votes (the current code shape, being retired): a
voter rates a whole praxis, not a "member".
_Avoid_: "shared document" for a duel (each duelist has their own); treating a duel as a single
praxis row.

**Duel link**:
The row that owns a duel: the pairing (`challenger_praxis_id`, `opponent_praxis_id`) plus the
challenge handshake (`opponent_character_id`, `status`). Replaces `PraxisInvite` for duels.
**States:** `pending` (challenged; only the challenger's praxis exists) → `active` (accepted;
opponent's praxis created) → `settled` (both submitted; voting open, winner provisional until era
reset). `declined` is terminal. A **cold symmetric challenge**: the challenger's praxis is created
`in_progress` at challenge time and both sides `submit` independently. On **decline or cancel**
the link drops and the challenger's praxis stays as a plain solo praxis (**convert-to-solo**).

**Collaboration (collab)**:
Genuinely shared work on one task: **one** praxis, many `PraxisMember`s, one shared body + media,
one shared vote pool. Every member is scored off the same star total (through their own faction's
collab modifier). Contrast **Duel**, which is *not* shared.

**Praxis status**:
The `in_progress → submitted` axis of a praxis. What flips it depends on type — **solo**:
immediately; **duel**: each side is its own solo praxis and submits independently; **collab**:
by **lazy-consensus submission** (see below). A submitted praxis is open to voting and its votes
count toward its members' score. Distinct from **moderation status**
(`visible / flagged / hidden / failed`); a hidden praxis is suppressed regardless of status.

**Lazy-consensus submission** *(collab only; ADR-0012)*:
How a collaboration reaches `submitted`. Any member clicking **Submit** opens a **pending-publish**
window of `era.collab_auto_submit_days` (10); if every member submits it goes Live at once,
otherwise **silence is consent** — when the window elapses with no edit, it auto-publishes. Any
member **editing the document** during the window is a hard reset: it cancels the countdown and
clears everyone's `has_submitted`, dropping back to plain drafting ("an edit means we're not
done"). A member may also **leave** to drop their hold. Solo and duel praxes do not use this.
_Avoid_: "unanimous"/"all must submit" (the timeout publishes without unanimity); "approval".

**In-progress privacy**:
Who is working on what is **not public knowledge**. An `in_progress` praxis and its membership
are visible only to its members (e.g. invites surface only to members). This is *why* joining is
**invite-only**: an outsider can't discover a collab to ask into, so there is **no
request-to-join** — a member must reach out first. The privacy lifts when the praxis goes
`submitted` (it becomes votable and public). A **duel** challenge is likewise known only to the
two parties until both sides are submitted.
_Avoid_: "request to join", "open collab", public in-progress listings — all deliberate no-s.

**Leave** *(collab member self-removal)*:
A member removing **their own** `PraxisMember` from a collab. Distinct from **kick** (removing
*someone else*) and from praxis **withdraw** (`is_withdrawn`, taking the *whole praxis* out of
scoring). Three different removals — keep them named apart.
_Avoid_: "withdraw" for a member leaving (withdraw is praxis-level, not member-level).

**Editing mode**:
A submitted praxis taken back into editing by its creator. Its votes are **preserved but do
not count** toward score while in editing mode; resubmitting returns it to `submitted` and
its votes resume counting. Editing mode is the round-trip `submitted → editing → submitted`,
not a discard — vote history survives the trip.
_Avoid_: "withdraw" as a synonym for delete (a withdrawn praxis still exists and can return).

**Task bank**:
The set of a character's `in_progress` praxes, capped per character by the era's
`max_task_signups`. Claiming a task ("signing up") adds to the bank; submitting or
withdrawing frees a slot.

**Sign-up eligibility**:
The single game-logic predicate behind the Sign-up affordance: whether a character may
*claim* a task right now. One boolean, owned by the service layer, exposed as the
`can_sign_up` flag — the API and frontend read it, they never assemble it. Its
governing invariant: it is true **iff `create_praxis` would accept**, so the button
hides exactly when the action would be rejected (level, metatask faction, **active
membership**, task bank, Analog carve-out). See ADR-0008.
_Avoid_: conflating with `can_submit_praxis` (the narrow dup-authorship rule only) or
`eligible_for_current_user` (level + metatask faction only) — neither is the whole gate.

**Active membership**:
A character holding a `PraxisMember` row on a non-deleted praxis for a task whose status
is `in_progress` or `submitted` — i.e. currently working or done, not abandoned. Keyed on
*membership*, not authorship, so a **joined collaborator** counts too. One shared predicate
(`is_active_member_of_task`) drives the task-list exclusion, the sign-up guard, and the
flag, so all three agree.

**Vote reframe**:
A faction's bespoke rendering of the shared 1–5 rating — Ephemerists' **Concordance**
(apocryphal → disputed → plausible → corroborated → canonical), Singularity's
NOISE → VERIFIED. The underlying value is always 1–5; only the vocabulary + visual ramp
change. This is per-faction surface #8; it is the **hero** of a praxis card and has both an
interactive *caster* form (the read-only *average-summary* badge is retired — see **Points from votes**).
**Ownership:** the per-faction tier *structure* (value, label, numeral style) lives in a
`voteReframes` registry; the label *words* are literals in that registry for now (migrating them to
the copy catalog `copy/en.ts` / ADR-0010 is deferred to its own issue); the *visual ramp* stays in
the archetype (don't-unify-the-look). There is **no shared scaffold**: the login-gate + summary live
in `VoteShell`, and each archetype keeps its own `useVote` + tiles + theme — arrangement stays
per-archetype (ADR-0016). One reframe lookup powers the caster **and** the per-voter breakdown
(who voted + their value), so both speak the same vocabulary.

**Vote**:
One character's rating of a praxis, an integer 1–5 — the unit cast in the vote control and
reframed per faction (see **Vote reframe**). The DB column is `Vote.value` (the `stars`→`value`
rename landed, #192 / ADR-0014); the summed quantity is **points from votes**, never "stars".
_Avoid_: star, stars (legacy term, retired alongside the column rename).

**Points from votes**:
The **sum** of a praxis's vote values, added flat to score *after* all multipliers. Surfaced
as *points* (the "73" in a "15 + 73 points" display = base + points-from-votes), never as its
own noun. Distinct from **voter count** — how many votes were cast (the "45 votes" label). The
**average** of a praxis's vote values is *not* a domain quantity — a praxis's standing is the sum
(points-from-votes) and the count, never the mean (SPEC-game-rules: "Not an average").
_Avoid_: average rating, avg score.

**Vote tally** *(read-model; `services/vote_tally.py`)*:
The single source for a praxis's vote aggregates: `points_from_votes`, `voter_count`, and the
**per-voter breakdown** (who voted + their value). One query per praxis batch, replacing the
scattered `func.sum(Vote.stars)` queries and the retired per-member duel summary. The backend
owns "who voted and how much" even on surfaces the UI does not yet show it.

**Contribution** *(atomic scoring unit; `services/praxis_scoring.py`)*:
The points **one character** earns from **one praxis** —
`(base + metatasks) × faction_multiplier × duel_multiplier + points_from_votes`. Scoring is
per-`(character, praxis)`, *never* "the score of a praxis" (ill-defined the moment two
factions touch one collab). Computed as a **batch** primitive
(`compute_contributions(praxes, character, era, session)`; the single-praxis read path is the
n=1 case), returned as a **breakdown** (base · metatasks · faction_multiplier ·
duel_multiplier · points_from_votes · total) so the **Praxis Read** page can show the math
("50 × 0.8 because it's off-faction"). The pure arithmetic stays in `services/scoring.py`;
`praxis_scoring` is the async gather-and-assemble around it. A character's era score is the
sum of their Contributions' `total`.
_Avoid_: "praxis score" as a per-praxis number with multipliers baked in (that conflation is
what the recalc path and the read path currently disagree on).

**Merit** *(the faction-neutral praxis number)*:
`task base + points_from_votes` — no faction/duel multiplier, **viewer-independent**. What a
**praxis card** shows and what task submissions sort by: it compares the *work*, not whose
faction multiplier was luckier. Distinct from **Contribution** (per-character, multiplied,
feeds standings + the detail-page breakdown). Splitting Merit from Contribution is the
locality win of the praxis-scoring deepening — one well-defined number per surface instead of
one conflated `score` field computed two disagreeing ways.

**Metatask** *(becoming its own model — reverses migration 0006; ADR-0015)*:
A flat-points **add-on to a praxis**, not a doable task — it has no praxis, no votes, no
lifecycle of its own beyond **propose → approve → retire**. Owned by a faction
(`faction_slug`); its `point_value` is a flat bonus that stacks additively and rides the same
multipliers as base points (`(base + metatask_points) × faction × duel + votes` — unchanged by
the remodel). Currently modeled as a `Task` row (`task_type=metatask`); being split into a
standalone `MetaTask` model so `Task` sheds `task_type` + `metatask_faction_slug` and the
`TaskType` enum collapses.
- **Access** is **one predicate** — `can_access_metatask` = Albescent **or**
  (`level ≥ era.metatask_apply_level` **and** own faction). Enforced once **at apply**; the
  "can apply" UI flag mirrors it. Replaces the three drifted gates (the per-metatask
  `level_required` check is deleted).
- **Praxis-wide**: once applied, **every member** of that praxis banks the bonus — scoring does
  **no** per-member access re-check; `get_meta_task_points` is a dumb sum of attached
  `point_value`s. _Avoid_: per-member metatask gating (rejected — see ADR-0015).
- **Duel symmetry**: a metatask applies to **both** linked duel praxes (ADR-0011), so neither
  duelist gains a base-point head start. (Today's single-praxis duel already gets this via
  praxis-wide; the two-praxes model needs both-sides attachment — coordinates with #185.)
- **Propose** (level 6) is a separate gate from **apply** (level 7) — distinct actions, not one
  rule.

**Register row / Praxis Index**:
The faction's list view of submitted praxes; the praxis **card** lives here (compact, next to
task cards). Distinct from **Praxis Read** — the detail page showing one praxis in full
(account body, evidence, the voting control).

**Actor-scoped surface**:
A surface whose contextual faction is **the acting character's member faction**: the
avatar/badge and the comment surface (#14). A SNIDE member's comment reads SNIDE even
on an Everyman task page; a praxis author's badge reads their own faction even when the
praxis card reads the task's faction. Resolved **live** from `character.faction_slug` (no
snapshot) — a defector's past comments/badges re-theme to their new faction.

**Comment** *(designed; ADR-0006)*:
A short text reaction attached to **exactly one of** a praxis or a task (DB `CHECK`). Flat
(no threading — replies are `@mention`s), chronological, not votable. Authored by a
Character; the author's member faction drives its theming. Invariant slots: **author
identity · body · timestamp+edited**. Soft-deleted (`is_withdrawn` by author;
`moderation_status` hidden/deleted by admin).
_Avoid_: reply, post, message.

**Comment thread**:
The neutral, non-faction container that lays out a target's comment rows plus one composer.
A thread is **multi-faction** — each row themes to its own author — so no faction owns the
thread; it never blanket-themes (the page-archetype rule of ADR-0002, at row granularity).

**Comment surface (#14)**:
The single per-faction Comment archetype, dispatched by `pickVariant(COMMENT_COMPONENTS, …)`
and rendered in two modes — `row` (read-only, keyed on the author's faction) and `composer`
(input, keyed on the current character's faction). The call site picks the slug; one
archetype serves both modes (cf. the vote reframe's caster/summary, ADR-0005). **Seven**
archetypes (incl. Albescent as a full faction, not the `→ ua` alias), each at task-card
fidelity by **reusing** that faction's existing card atoms, not new ornaments (ADR-0018).

**Comment voice** *(ADR-0018)*:
A faction's comment treatment, defined once and used for both `row` and `composer`. Skins the
box chrome only — the author slot always composes `FactionAvatar`, and the **timestamp slot is
a per-faction dialect** (content invariant, presentation per-faction: ua "2 days ago",
snide "048H AGO", ephemerists "the Nth day", everymen "Shift N", albescent "Vigil the Nth",
wow "3h", singularity plain-relative). UA wears the orange/gold "University of Asthmatics" look
for comments; the broader rebrand is out of scope.
_Avoid_: skin, theme (the chrome), template.

**Relationship edge**:
A single **directed** declaration `from_character → to_character` carrying a `type`
(friend | foe) and a `status` (active | blocked). Unique per ordered `(from, to)` pair, so a
two-character dyad is at most **two independent edges**. Instant — there is no pending/accept
handshake (unlike a praxis invite). The edge is the *stored* unit of the relationship system;
the felt "are we friends / rivals" is the **display status**, computed from the pair and never
stored. Canonical term for the row: **edge**.
**Lifecycle:** only the **declarer** (`from`) may `delete` the edge. **Either** party may
`block` it, and a block is **reversible** (`unblock` restores `active`) — so a mis-block can be
undone without losing the edge. Changing your own edge's `type` (friend↔foe) has no endpoint:
it is a deliberate `delete` + re-`create` (intended friction; you lose `created_at`).
_Avoid_: "relationship" for the pairwise feeling (that's the display status); "request" /
"pending" (there is no acceptance step); treating one edge as covering both directions.

**Display status**:
The human-readable label for a pair of characters, computed **per-viewer** by
`compute_display_status` from both edges — Mutual Friends, Rivals, Tsundere, One-sided Friend,
One-sided Foe, Secret Admirer, Targeted, **Blocked**, Unknown. Not stored; derived at read time.
- **Blocked wins.** If *either* edge has `status = blocked`, the status is **Blocked** for
  **both** parties — a block is mutual and **visible**: the blocked person is meant to know
  (the edge that got blocked is theirs, so it surfaces in their own list). See ADR-0009.
- Otherwise computed from `(your edge type, their edge type)` over the friend/foe/none matrix.
  The same active pair yields different labels at each end (you: "One-sided Foe"; them:
  "Targeted") — the *same situation viewed from opposite ends*, **not** distinct states, and
  **not** redundant labels (they are the `(foe, none)` and `(none, foe)` cells of one symmetric
  function). **Tsundere** is the lone perspective-symmetric label — both mixed cases collapse to
  it — and is a *designed* state: one side feels friend, the other foe.
_Avoid_: treating One-sided Foe / Targeted as duplicates to reconcile; storing the label;
hiding a block from the blocked party; calling it "relationship".

### Account & Character

**Account**:
The login identity — one Google OAuth2 → JWT principal, one email. Owns one or more
**Characters** and never appears on public game surfaces (`account_id` and `email` are
private). The Account is the unit of all *cross-character* rules: the multi-character cap,
the account-pooled invite gate (see **Faction invite**), the account-collective
Albescent unlock, and account-scoped anti-self-voting (a character cannot vote on a praxis
authored by any character sharing its account).
_Avoid_: user, player (the *player* is the human; the *account* is their credential record).

**Character**:
A single in-game persona under an **Account** — the unit that does tasks, earns
score/level, holds a faction, casts votes, and is publicly identified (`username`,
`display_name`). One Account → many Characters. Public surfaces show the Character, never
the Account.
_Avoid_: profile, user, player.

**Active character (the carried life)** *(ADR-0025; "life" in the UI)*:
The one character an account is currently **stepped into** (`account.active_character_id`,
resolved by `resolve_active_character`). It is the **actor** for every authenticated write
path and the **viewer** for read-time, viewer-relative fields — you act *as* the life you
carry, switch to carry another (`POST /me/active-character`; FieldDesk `enterLife`). A second
life is a **sock puppet**: fully independent — own identity, score, faction, praxes, votes —
**except** the account-scoped anti-cheat guards (no voting on a sibling's praxis; no ganging
to flag). Edit/delete is **carried-character-only**: you manage only the life you're wearing.
_Avoid_: acting as "the first/oldest character" (the pre-ADR-0025 bug); an account-wide edit
path (rejected — lives stay independent); renaming "life" to "sock puppet" in code/UI.

**Unaffiliated** *(`na`)*:
A character belonging to **no faction** — the **universal starting state** for every new
character. (The old "everyone starts in UA" rule is retired: ADR-0019. UA is now an
ordinary, invite-able faction with no starter privilege.) Scoring: full **1.0×** through
level `era.unaffiliated_penalty_level − 1`; from that level on (the **grace cliff**),
faction-owned tasks score `era.unaffiliated_task_modifier` (0.8×) while neutral (`na`)
tasks stay 1.0×. `na` is also the sentinel for tasks with no faction and the state era-reset
returns characters to. See ADR-0020.
_Avoid_: "UA" as a synonym for "new/starting"; "none" as a faction name.

**Faction invite** *(`InvitationLetter`)*:
The single gate on faction membership. A character may **join, switch to, or be born into**
faction X iff the **account** holds an `InvitationLetter` for X (current era) on *any* of its
characters — one account-scoped predicate applied identically at creation and mid-life
(ADR-0019). The lone first character "waits" only as the degenerate case: the sole invite an
account can hold is one it earns itself. An invite is **earned per-character**: a character
earns its *own* invite to X by completing **2 tasks for X and 50 points from X's tasks**
(current era) — the pledge-allegiance praxis condition is dropped (ADR-0022). Invites are
**era-scoped** (reset each era). Level is *not* a join gate — a level-1
character can be born into a faction a sibling already holds an invite for.
_Avoid_: treating "completed ≥1 task" as a separate join gate (it is *how* an invite is
earned, not a parallel rule); per-character invite scoping at creation (the gate is
account-pooled).

## Praxis lifecycle & visibility

**Submitted** *(`status = submitted`)*:
A **sealed, public** praxis. Its votes count toward score; it appears on every public
surface (lists, detail, task/faction pages, activity feed). The only publicly visible
praxis state. _Avoid_: "published"/"Live" as distinct states — they are this one.

**In editing** *(`status = in_progress`)*:
A praxis being worked on — a never-submitted **draft** *or* one that was **unsubmitted**.
The two are indistinguishable by design (ADR-0007): no "was previously submitted" flag.
Votes are **preserved but paused** (do not count until resubmitted). **Private:** visible
only to its members, and only in edit mode (ADR-0024). _Avoid_: "draft" vs "withdrawn" as
different states; treating in-progress as publicly viewable.

**Unsubmit** *(canonical UI term; API/service: `withdraw`)*:
The action that moves a `submitted` praxis back to `in_progress` — pausing its score,
demoting the author if the drop crosses a level, and hiding it from everyone but its
members (ADR-0024). Endpoint is `POST /praxes/{id}/withdraw`; ADR-0007 also calls it
"back to editing". The reverse is **submit**. _Avoid_: "delete" (that removes the praxis
entirely); "reopen"/"resubmit" as separate operations (retired in ADR-0007).

**Member** *(of a praxis)*:
A co-owner. Solo/duel praxes have exactly one (the creator); a collab has all its
collaborators (ADR-0013). Membership — not authorship — is the visibility and edit key for
an `in_progress` praxis. _Avoid_: "owner"/"creator" when the rule is really "any member".
