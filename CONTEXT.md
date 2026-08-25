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
The one carve-out is **task detail**, where ADR-0057 keeps the dress faction-specific but
makes the copy a single shared neutral set — there, an archetype owns presentation only.
_Avoid_: variant (reserve "variant" for the `pickVariant` mechanism), skin, theme.

**Default archetype**:
The **`na` / Unaffiliated** rendering of a surface — *not* a personality-free generic.
`default` ≡ `na` ≡ Unaffiliated are **one visual identity**: the spectrum-band editorial
kit (neutral paper + `--faction-default-*` tokens + system fonts, rainbow as accent;
ADR-0039 / ADR-0046 / ADR-0048). So `DefaultXxx` **is the na kit**, serving both
unaffiliated characters and the fall-through for any faction that registers no archetype
of its own. A `Default*` that invents its own metaphor or voice, or borrows another
faction's display font (as the retired cork-board `DefaultEditPraxis` did with Caveat +
Permanent Marker), is **stale** — the wrong identity, not a neutral one. Named `DefaultXxx`
(e.g. `DefaultFactionBody`).
_Avoid_: reading "faction-agnostic" as "no identity" — the identity is Unaffiliated.

**Albescent**:
A first-class faction — own slug, members, roster, invite-letter flow and level-8 unlock —
whose *look* is deliberately the Unaffiliated one with extra ornament: quiet tells (a slow
rainbow drift, a morphing vote blob) layered over the Default kit's structure, so a member
reads as unaffiliated at a glance and reveals itself only to someone already looking
(ADR-0083). Where a design exists, Albescent wears it; where none does yet, it
falls through to Default like any undressed faction. Its **faction page is redacted, not
hidden**: a non-member sees that Albescent exists and is told nothing about it (ADR-0082,
which supersedes ADR-0027's hiding posture).
_Avoid_: "Albescent is na", "Albescent is an alias" — below the skin it is its own faction.
_Avoid also — plain words for ordinary things (owner ruling 2026-08-23)_: Albescent's
surfaces are the same surfaces every faction has, and they take the same names. Say
**Albescent**, not "the society". Say an account is **unlocked**, not "revealed to the
society". Its page is the **faction page**, in a **locked** or **unlocked** state — not "the
sealed page", "the sealed placeholder" or "the reveal". Say **invite letter**, not "the
letter" or "the prospectus". Identifiers are exempt and are not renamed by this rule:
`.alb-prism`, the `invitation_letter` table and `AlbescentSecretPlaceholder` keep
their names until something else moves them. (`--albescent-reveal-*` was listed
here too and is gone: #2632 deleted the register, not the exemption.)

**Invite letter** *(every faction; `invitation_letter` table)*:
The letter a faction sends a character asking them to join it — one shared component
(`InvitationLetterPopup`) plus a per-faction voice, and a feed card
(`FeedCardInvitationLetter`) that announces one has arrived. Albescent's is the same object
under a separate component (`AlbescentInvitation`) and a separate key family
(`albescent.letter.*` where the other seven use `<slug>.invitation.*`), which is a naming
accident rather than a second concept.
_Avoid_: "the letter", "the prospectus", "the invitation" as a bare noun. It is an **invite
letter**, for all nine, and the words in prose do not follow whichever key family a given
faction happens to use.

**Dispatcher**:
The per-surface map (`Record<slug, Component>`) plus the `pickVariant` call that turns a
faction slug into its archetype, falling back to the default. One dispatcher per surface.

**Slug**:
The faction's stable identifier in the DB and code. Slugs **match faction identity**. The
rename `analog→everymen`, `gestalt→wow`, `journeymen→ephemerists` **has landed** (ADR-0004):
`era_1.py` carries only identity-matched slugs (`everymen`, `wow`, `ephemerists`, `snide`,
`singularity`, `ua`, `albescent`, `na`) — **no legacy slugs remain**.
_Avoid_: faction id, key (CSS uses a separate hyphenated "css key").

**Legacy slug** *(retired — ADR-0004; historical term only)*:
A slug once kept after a rebrand to dodge DB/plumbing churn: `analog` shown as "Everymen",
`gestalt` as "Warriors of Whimsy", `journeymen` as "The Ephemerists". This trick was the
top source of doc/code drift and **has been reversed** — every slug now matches identity.
Do not introduce new legacy slugs.

**Alias slug** *(retired — no aliases remain)*:
A slug that inherited another faction's archetype by design rather than rebrand. Only two
ever existed — `albescent → ua` and `aged_out → ua` — and both are retired (#232, #428).
`FACTION_ALIASES` is empty and `pickVariant`'s alias step is a dormant seam.
_Avoid_: describing Albescent as an alias. Falling through to the Default archetype on an
undressed surface is the ordinary partial-registry behaviour every faction has, not aliasing.

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
proof Sally shows after "jump really high". One task has many praxis. A praxis exists from
the moment it's claimed (`in_progress`), so it is *not* synonymous with the completion; it's
the whole record that spans claim → proof. One praxis becomes open to community voting once
it is **submitted** (see **Praxis status**).
_Avoid_: "sealed" (legacy term, retired — the code/DB/UI all say *submitted*); post, entry;
"praxes" (*praxis* is both the singular and the plural here — "one praxis", "many praxis").

**Praxis type**:
Which collaboration shape a doing-of-a-task takes: **solo**, **collab**, or **duel**. Solo and
collab are *one shared praxis* (collab just has many members on it); a **duel** is **two linked
praxis that compete** — see **Duel**.

**Duel** *(two-linked-praxis model; ADR-0011 — landed)*:
A head-to-head competition between two characters on the same task. Each side authors **its own
`type=solo` praxis** — own owner, body, media, votes — and the two are joined by a **Duel link**.
The win/loss multiplier is applied per **side** at scoring time and **floats with the votes until
era reset** (no per-duel freeze) — see **Duel outcome**. *Not* one shared praxis with two members
and split votes (the **retired** code shape): a voter rates a whole praxis, not a "member".
_Avoid_: "shared document" for a duel (each duelist has their own); treating a duel as a single
praxis row; "duel praxis" (retired — there is no such row; a duel side is a solo praxis).

**Duel link** *(the `Duel` model; tablename `duel`)*:
The row that owns a duel: the pairing (`challenger_praxis_id`, `opponent_praxis_id`) plus the
challenge handshake (`opponent_character_id`, `status`), with sticky `forfeited_by_character_id`.
Replaces `PraxisInvite` for duels.
**States:** `pending` (**challenged**; only the challenger's praxis exists) → `active` (accepted;
opponent's praxis created) → **`live`** (both submitted; voting open). `declined` is terminal.
A **cold symmetric challenge**: the challenger's praxis is created `in_progress` at challenge time
and both sides `submit` independently. On **decline or cancel** the link drops and the challenger's
praxis stays as a plain solo praxis (**convert-to-solo**).
_Note_: the enum member is still spelled `settled` in code pending the rename — **`live` is the
canonical word**. `settled` was always a misnomer: it fires when voting *opens*, not when anything
is decided.
_Avoid_: reading `settled` as "decided"; "the duel is over" for a `live` duel.

**Challenge** *(the pending phase of a duel — not a separate object)*:
A duel that has been issued and not yet answered. There is exactly one row (the **Duel link**)
throughout; "challenge" names its `pending` phase and the verb that opens it. A **declined**
challenge is therefore a duel that **never started**, not a duel that ended.
_Avoid_: "a Challenge" as a noun for a distinct thing that later "becomes" a Duel.

**Duel side** *(one half of a duel)*:
A character plus their linked praxis. The two sides hold the **fixed roles** `challenger` and
`opponent` — set at challenge time and never swapped. A person on a side is a **duelist**.
_Avoid_: "opponent" for "whoever isn't the viewer" — that is the **foe** (a viewer-relative term);
`duel.opponent` is an absolute role. Also avoid "member" and "participant" for a duel side
(`PraxisMember` is a collab concept).

**Duel outcome** *(provisional until era reset)*:
The **winner** is the side whose praxis has the higher **`points_from_votes`** (not raw stars).
Nothing is persisted and no event fires at the moment of winning — the winner is recomputed on
read and **only becomes final at era close**. Each side's `duel_win_modifier` /
`duel_loss_modifier` (its own faction's) multiplies its base points.
- **Tie:** if exactly one side is **Snide**, Snide takes the win modifier and the other the loss
  modifier — Snide wins ties. Otherwise (no Snide, or both Snide) **both sides get 1.0×**.
- **Forfeit** overrides the tally entirely — see **Forfeit**.
_Avoid_: "the duel is decided/settled"; comparing "stars"; expecting an "X won the duel" event.

**Forfeit** *(duel only; sticky and irreversible)*:
Backing out of a **`live`** duel. Triggered by unsubmitting that side's praxis or by the ban /
soft-delete of its character. The forfeiter takes their **loss** modifier, the foe takes their
**win** modifier, and the vote tally stops mattering. Recorded once in
`forfeited_by_character_id` and **never overwritten** — resubmitting does not restore the contest,
and the duel stays `live`.
_Avoid_: "withdraw" for this in user-facing copy — a duelist's control says **Forfeit** and states
the consequence. Reserve **withdraw** for the reversible solo/collab unsubmit, **decline** for an
opponent refusing a `pending` challenge, **cancel** for a challenger revoking their own, and
**leave** for a collab member dropping out.

**Duel voice** *(per-faction wording; ADR-0031)*:
Each faction names the duel in its own register — "BEEF", "IN DISPUTE", "witch duel", "Salon Duel",
"--adversarial". This is **deliberate flavour** in the copy catalogs over one shared domain
concept, not vocabulary drift. The domain word is always **duel**.
_Avoid_: "unifying" these labels; letting flavour words into model, service, or API names.

**Collaboration (collab)**:
Genuinely shared work on one task: **one** praxis, many `PraxisMember`s, one shared body + media,
one shared vote pool. Every member is scored off the same star total (through their own faction's
collab modifier). Contrast **Duel**, which is *not* shared. **Invite level-lift** (by design):
accepting a collab invite lets a **lower-level player** work on a task above their own sign-up
level — `respond_to_invite` gates the accept only on bank-cap + not-already-submitted, never the
invitee's level or the task's `level_required`. A qualified creator's invite is the lift; not a
bypass to be "fixed" (#318).

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
done"). A member may also **leave** to drop their hold. Solo and duel praxis do not use this.
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

**Nudge** *(`Nudge`; tablename `nudge`)*:
One player reminding the player a shared praxis is still waiting on. Delivered as an
**activity-feed item**, never a message — the `Message` model has no player-facing reader
(admin moderation only), so a nudge posted there arrives nowhere. Stored as its own row
(`from_character_id`, `to_character_id`, `praxis_id`, `created_at`), and `praxis_id` is
always **the praxis the recipient owes**: the shared collab, or the *rival's* side of a duel
— never the sender's. Who may send it: a collab member **who has cast**, or a duel
participant **while the duel is `active`**. Rate-limited to **one per sender → recipient →
praxis per 24h**; that limit is a safety control, not a nicety.
_Avoid_: "poke"/"ping"/"reminder" as the domain term, and "notification" — there is no
notifications inbox and a nudge does not create one.

**Editing mode**:
A submitted praxis taken back into editing by its creator. Its votes are **preserved but do
not count** toward score while in editing mode; resubmitting returns it to `submitted` and
its votes resume counting. Editing mode is the round-trip `submitted → editing → submitted`,
not a discard — vote history survives the trip.
_Avoid_: "withdraw" as a synonym for delete (a withdrawn praxis still exists and can return).

**Task bank**:
The set of a character's `in_progress` praxis, capped per character by the era's
`max_task_signups`. Claiming a task ("signing up") adds to the bank; submitting or
withdrawing frees a slot.

**Claim** *(a character claims a task; contrast being **carried onto** one)*:
A **Character** claims a task by **signing up** — the door that runs the full
**sign-up eligibility** gate and opens their own praxis. A character can also arrive on a
task without claiming it: by accepting a **collab invite**, or by accepting a **duel
challenge**. Those two doors deliberately lift gates the claim door enforces (ADR-0071),
so *who is on a task* is a wider set than *who could have claimed it*. `can_sign_up`
answers only the claim door; **active membership** records arrival by any door; every door
charges the **task bank**.
_Avoid_: saying a **faction** claims (or re-claims) a task — a faction holds no
memberships and does nothing. The Character is the unit that acts; its faction is one of
its attributes. Also avoid "join" for the claim door (joining is the invite door) and
"sign up" for accepting an invite or a challenge.

**Sign-up eligibility**:
The single game-logic predicate behind the Sign-up affordance: whether a character may
*claim* a task right now. One boolean, owned by the service layer, exposed as the
`can_sign_up` flag — the API and frontend read it, they never assemble it. Its
governing invariant is scoped to the **sign-up door**: it is true iff `create_praxis`
would accept, so the button hides exactly when *that* action would be rejected (level,
**active membership**, task bank, Analog carve-out). See ADR-0008. It is **not** a claim
about every route into a praxis: a collab invite and a duel accept are separate doors
that deliberately bypass gates this one enforces (ADR-0071), so a character can hold a
praxis on a task they could never have claimed. Reading the invariant wider than the
sign-up door is what makes those carve-outs look like defects.
One name, two surfaces, by design: `TaskOut.can_sign_up` is the predicate's answer for one
task, and `GET /tasks?can_sign_up=` is the filter that keeps the tasks it answers true for
(#1130). The field carried the name `can_submit_praxis` until #1512, which was false on its
face — an invited collaborator may submit a praxis on a task they could never *claim*.
_Avoid_: conflating with `eligible_for_current_user` (level only) — that is one input to
the gate, not the gate. Sign-up eligibility is about *claiming*; whether a viewer may
submit a praxis they are already a member of is a different question, and no flag answers
it today.

**Active membership**:
A character holding a `PraxisMember` row on a praxis whose status is `in_progress`,
`pending` or `submitted` — i.e. currently working, inside the lazy-consensus window
(ADR-0012), or done; not abandoned. Keyed on *membership*, not authorship, so a **joined
collaborator** counts too.
**Two questions, not one** (#1510): whether a membership **blocks a fresh claim**, and
whether the character is on the task **at all** (`held_membership_task_ids`). They differ
by the **Double Dipper** carve-out (#1359) — a faction the era grants
`can_hold_multiple_memberships` still holds the membership but is not blocked by it. The
carve-out is stated exactly once, in `multi_membership_faction_slugs(era)`, and every
caller of the blocking question — the task-list exclusion, the sign-up guard, the flag —
reaches it through one subquery, so those three still cannot disagree. The at-all question
takes no `era` precisely because it applies no carve-out.
_Avoid_: treating the two as interchangeable, or restating the carve-out anywhere but
`multi_membership_faction_slugs` (a second statement is one the browse list ignores).

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
(points-from-votes) and the count, never the mean (ADR-0014: standing is the sum, not the mean).
_Avoid_: average rating, avg score.

**Vote tally** *(read-model; `services/vote_tally.py`)*:
The single source for a praxis's vote aggregates: `points_from_votes`, `voter_count`, and the
**per-voter breakdown** (who voted + their value). One query per praxis batch, replacing the
scattered `func.sum(Vote.stars)` queries and the retired per-member duel summary. The backend
owns "who voted and how much" even on surfaces the UI does not yet show it.

**Contribution** *(atomic scoring unit; `services/praxis_scoring.py`)*:
The points **one character** earns from **one praxis** —
`base × faction_multiplier × duel_multiplier + metatasks + points_from_votes + habit_bonus`.
Only the base multiplies (ADR-0086); every term a player earned by doing a specific extra
thing is flat, so a duel outcome cannot delete a metatask. Scoring is
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

**Merit** *(RETIRED — ADR-0053)*:
`task base + points_from_votes`, no faction/duel multiplier. **Nothing computes it.** Kept
here only so the term stays recognisable in older ADRs and commit history — do not
reintroduce it, and do not describe any live surface as showing it.

A praxis now has exactly **one** number: `score`, the computed total, resolved for its
**author** for every type including collab, with the terms behind it on the same payload:
`score = task_point_value × display_multiplier + metatask_points + points_from_votes
+ habit_bonus_points`.
See **Contribution** for the underlying model, which ADR-0053 did not change.

Merit existed to dodge "a collab has no single multiplier" — but once the scoring subject is
the author (and it is), a collab has exactly one author, one faction, one multiplier. Two
names for one number is also what let the praxis-detail page read the wrong one and render
every multiplier as ×1.0 for the whole of Era 1. The Task Crown (ADR-0028) ranks by vote
points directly in SQL; it never read a Merit field.

**Score stamp** *(the pair, not one object)*:
The praxis card's right column. It is **two** distinct things and conflating them is what
lost every faction's signature device in #821:
- **Score box** — the bordered pill carrying the working: `base` numeral, the coloured
  `×0.80` multiplier chip, and `+ N from votes`. Broadly the same *shape* across factions;
  which rows exist is decided by `scoreBreakdown()` under ADR-0053.
- **Total mark** — the faction's own **faction mark** holding the total over a `POINTS`
  label. Frequently not a box at all: UA's is the ensō, Everymen's a rubber-stamp roundel
  with arced text under `mix-blend-mode: multiply`, Ephemerists' a rubric, Snide's an Anton
  numeral with a hot-pink text-shadow, Unaffiliated's the total background-clipped to the
  rainbow.
Shared logic, bespoke presentation: one `scoreBreakdown()` decides *which numbers show*; each
faction's registered `scoreStamp` surface decides *what they look like* (ADR-0049).
_Avoid_: "the score stamp" for the score box alone; "stamp" for the total mark; assuming one
themed component can carry both.

**Faction mark**:
A faction's signature graphic device — ensō (UA), rubber-stamp roundel (Everymen), rubric
(Ephemerists), `✦` (WOW), `✨` (Coven). Lives as a **React SVG component** in
`components/factionMarks/`, never as a file under `public/`: an external `.svg` behind an
`<img>` cannot read CSS custom properties, so it would reintroduce hardcoded hex and break in
dark mode. As a component every `fill` reads a token.
_Avoid_: sigil (that's the existing roster/avatar surface), logo, icon, asset.

**Ornament text**:
Type that is part of a mark rather than something to read — a vote widget's tier label, a
stamp's `POINTS`, a plate's caption. **Exempt from the content-text floor** (#623/#627) and
takes the design's per-faction size; the floor governs body copy, descriptions and task text.
Forcing all eight vote captions to `--text-content` is what flattened the widgets' tonal
hierarchy in #821.
_Avoid_: treating every string as content text; using `--text-content` inside a widget.

**Metatask**:
A flat-points **add-on to a praxis**, not a doable task — it has no praxis, no votes, no
lifecycle of its own beyond **propose → approve → retire**. Owned by a faction
(`faction_slug`); its `point_value` is a flat bonus that stacks additively and rides **no**
multiplier (`base × faction × duel + metatask_points + votes`, ADR-0086) — it sits beside
the votes and the habit bonus, so a S.N.I.D.E. duel loss at ×0.0 forfeits the base and keeps
the metatask.
**Current shape (canonical today):** a metatask **is a `Task` row** (`task_type=metatask`,
`metatask_faction_slug`) attached to a praxis via the `PraxisMetaTask` join table. Migration
0006 *unified* the old standalone `MetaTask`/`BonusType` classes *into* `Task` (they were
removed).
**Planned (ADR-0015, not yet done):** split metatask back out into its own model — `Task` sheds
`task_type` + `metatask_faction_slug` and the `TaskType` enum collapses. This reverses migration
0006 and has **not** landed; treat the standalone-model language elsewhere as aspiration, not
present reality.
- **Access**: `can_access_metatask` = Albescent (bypasses the level gate) **or**
  `level ≥ era.metatask_apply_level`. **Faction-open** — a character may apply
  **any** faction's metatask, not only their own; `metatask_faction_slug` records authorship,
  not permission. Enforced once **at apply**; the "can apply" UI flag mirrors it (minus the
  Albescent level bypass).
- **Praxis-wide**: once applied, **every member** of that praxis banks the bonus — scoring does
  **no** per-member access re-check; `get_meta_task_points` is a dumb sum of attached
  `point_value`s. _Avoid_: per-member metatask gating (rejected — see ADR-0015).
- **Duel symmetry**: a metatask applies to **both** linked duel praxis (ADR-0011), so neither
  duelist gains a base-point head start. (Today's single-praxis duel already gets this via
  praxis-wide; the two-praxis model needs both-sides attachment — coordinates with #185.)
- **See**, **propose**, and **apply** all gate at **level 5** — distinct actions that share a
  level. A praxis holds **1** metatask until the applying character reaches **level 7**, which
  raises the cap to **3** (`metatasks_per_praxis_base`/`_max`/`_max_level`).

**Register row / Praxis Index**:
The faction's list view of submitted praxis; the praxis **card** lives here (compact, next to
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
(friend | foe). Unique per ordered `(from, to)` pair, so a
two-character dyad is at most **two independent edges**. Instant — there is no pending/accept
handshake (unlike a praxis invite). The edge is the *stored* unit of the relationship system;
the felt "are we friends / rivals" is the **display status**, computed from the pair and never
stored. Canonical term for the row: **edge**. A **Block** is *not* a state of an edge and does
not live here (ADR-0077, superseding ADR-0009).
**Lifecycle:** only the **declarer** (`from`) may `delete` the edge. Changing your own edge's
`type` (friend↔foe) has no endpoint: it is a deliberate `delete` + re-`create` (intended
friction; you lose `created_at`).
_Avoid_: "relationship" for the pairwise feeling (that's the display status); "request" /
"pending" (there is no acceptance step); treating one edge as covering both directions;
calling a block a kind of relationship, or an edge state.

**Display status**:
The human-readable label for a pair of characters, computed **per-viewer** by
`compute_display_status` from both edges — Mutual Friends, Rivals, Tsundere, One-sided Friend,
One-sided Foe, Secret Admirer, Targeted, Unknown. Not stored; derived at read time.
- **Blocked is not one of them** (ADR-0077). It was under ADR-0009, when a block was an edge
  `status` and won over the type-derived label for **both** parties. A block is now its own
  record and is **silent** — it produces no label at either end, and the display status is
  computed from edge *types* alone.
- Computed from `(your edge type, their edge type)` over the friend/foe/none matrix.
  The same active pair yields different labels at each end (you: "One-sided Foe"; them:
  "Targeted") — the *same situation viewed from opposite ends*, **not** distinct states, and
  **not** redundant labels (they are the `(foe, none)` and `(none, foe)` cells of one symmetric
  function). **Tsundere** is the lone perspective-symmetric label — both mixed cases collapse to
  it — and is a *designed* state: one side feels friend, the other foe.
_Avoid_: treating One-sided Foe / Targeted as duplicates to reconcile; storing the label;
announcing a block to the blocked party; calling it "relationship".

**Block** *(ADR-0077)*:
One character's standing instruction that another goes quiet on them. Its **own record**, keyed
blocker → blocked, independent of `friend` / `foe` — it needs no edge in either direction, so
you can block a stranger. **Directed in authorship** (only the blocker creates or removes it)
and **symmetric in effect** (it silences the pair both ways, outranking any active edge without
consuming it). **Silent**: the blocked party is told nothing and keeps the ordinary friend/foe
controls. Its reach is deliberately narrow — it stops **taunts** and the **friend/foe feed
sources**, and nothing else; profiles, praxis, votes, comments, collab invites, duel challenges
and nudges all still cross it. **Unblock** is deleting the record, and restores nothing else.
*Model transition:* the code still carries the ADR-0009 shape (`status = blocked` on an edge)
until #1681's build issues land.
_Avoid_: "blocked" as an edge status or a display status (the superseded ADR-0009 model);
"mutual block" (one record, one author); calling it a privacy control or a contact barrier.

**Taunt** *(ADR-0031, ADR-0068)*:
An automatic needle from one character's achievement into a rival's feed — never typed by a
player. Three triggers: a **lead flip** (the sender is now ahead of the recipient on score,
however that happened, including passively), a **level-up**, and a **praxis submission**.
Delivery is subscription-shaped: **declaring a foe subscribes *you* to that rival's taunts** —
a taunt reaches only recipients whose own active foe edge points at the sender, and a **Block**
between the pair silences it in both directions (ADR-0077). The backend persists a structured
reference (sender's send-time faction voice + trigger); the frontend catalog owns every word
(ADR-0031). Era transitions are silent — taunts arise only from organic play.
_Avoid_: message / DM (no player composes one); notification (it is feed content the recipient
opted into by their own declaration); "foe taunt" as a distinct kind (every taunt is between
foes — the feed item type `foe_taunt` names the one kind there is).

### Account & Character

**Account**:
The login identity — one verified email, reachable through one or more identity providers
(ADR-0075). Owns one or more **Characters** and never appears on public game surfaces
(`account_id` and `email` are private). The Account is the unit of all *cross-character*
rules: the multi-character cap, the account-pooled invite gate (see **Faction invite**),
the account-collective Albescent unlock, and account-scoped anti-self-voting (a character
cannot vote on a praxis authored by any character sharing its account).
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
life is a **sock puppet**: fully independent — own identity, score, faction, praxis, votes —
**except** the account-scoped anti-cheat guards (no voting on a sibling's praxis; no ganging
to flag). Edit/delete is **carried-character-only**: you manage only the life you're wearing.
_Avoid_: acting as "the first/oldest character" (the pre-ADR-0025 bug); an account-wide edit
path (rejected — lives stay independent); renaming "life" to "sock puppet" in code/UI.

**Tombstone** *(`AccountStatus.deleted`; ADR-0081)*:
A **deleted account whose rows survive with every identifying field blanked**, so that
scores and vote budgets that depended on it stay correct. Email becomes a released
`deleted-<id>@deleted.invalid` placeholder (the real address goes back into circulation, so
the same human may sign up fresh); every life is `banned` + `departed_at` with a neutral
name and no bio, tagline, location or avatar; praxis and comment bodies are emptied to a
removed-marker. What is genuinely **destroyed** is only what carries no arithmetic: the
`OAuthProvider` rows (traded for a salted SHA-256 digest kept 90 days for the
returning-player gate), the CRDT drafts behind the blanked praxes, and the media files on
disk. **Vote rows and praxis rows stay as skeletons** — that is the entire point: `Vote.
praxis_id` is `ON DELETE CASCADE` and `votes_spent_this_era` is a stored counter, so a hard
delete would destroy *other people's* votes and leave those players charged for them.
**Not `suspended`** (a moderator's reversible hold on an intact account) and not an erasure.
_Avoid_: "soft delete" (that names `Character.departed_at`, one life ending); "anonymised"
(a tombstone is not readable-but-nameless — the content is gone too); promising a recovery
window (there is none — no grace period, no job runner).

**Unaffiliated** *(`na`)*:
A character belonging to **no faction** — the **universal starting state** for every new
character. (The old "everyone starts in UA" rule is retired: ADR-0019. UA is now an
ordinary, invite-able faction with no starter privilege.) Scoring: **all tasks currently
score 1.0×** for `na` — cross-faction modifiers were flattened to 1.0 (#452), so there is
**no unaffiliated penalty** today. (ADR-0020 specced a 0.8× grace-cliff penalty keyed on
`unaffiliated_penalty_level` / `unaffiliated_task_modifier`; it was **never built** — those
`EraConfig` fields don't exist and `compute_faction_multiplier` applies no penalty. See
ADR-0020's status banner.) `na` is also the sentinel for tasks with no faction and the state
era-reset returns characters to.
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

**Seal date** *(`submitted_at`)*:
When a praxis entered the public register — set once on `in_progress → submitted`. For
solo/duel, the author's submit; for collab, the lazy-consensus seal (everyone submitted
**or** the window lapsed — ADR-0012). This is the date a praxis card shows and the date the
**Praxis Index** sorts by. Distinct from `created_at`, which is the **draft-open** timestamp
(row insert, when the first member opens the draft) — private, often days earlier, and never
displayed.
_Avoid_: "created"/"creation date" for the seal (`created_at` is a different, earlier event);
"when the last one submits" (the timeout seals without them).

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
A co-owner. Solo/duel praxis have exactly one (the creator); a collab has all its
collaborators (ADR-0013). Membership — not authorship — is the visibility and edit key for
an `in_progress` praxis. _Avoid_: "owner"/"creator" when the rule is really "any member".

## Co-writing a praxis

> **Status (2026-08-14): DESIGNED, NOT BUILT (ADR-0073).** No room exists yet —
> authoring is still single-writer with a debounced save. The vocabulary below is the
> *design*; treat it as forward-looking until ADR-0073 lands.

**Room**:
The live editing space for one praxis — every **member** with the composer open is in it,
writing the same text at the same time. A room is a **workspace, not a record**: it holds
the text while it is being written and is discarded once the praxis is sealed. Every
praxis has one, including solo (where the member is alone in it).
_Avoid_: "session" (overloaded with auth), "document" (the praxis is the document), calling
the room the praxis.

**Working text**:
The praxis text as it is being co-written — co-owned, live, belonging to the room. Distinct
from the **body text**, which is the text of record: what the site reads, renders and
publishes. Working text becomes body text; the two are never separately authored.
_Avoid_: treating body text as somewhere a member writes.

**Freeze**:
What submitting does to a collab's working text: seals it read-only for every member while
the praxis is pending publish. The reopening verb is **`pullBack`** (ADR-0059), which is
also what resets consensus — so ADR-0012's "an edit means we're not done" needs no separate
notion of what counts as an edit. Nothing can change, so nothing must be detected.
_Avoid_: "lock" (suggests one member holds it against the others; a freeze binds everyone
equally, including whoever submitted).

**Presence**:
Who is in a room right now, and where their cursor sits — drawn in each member's own
faction colour. Presence is **decoration, never authorization**: it is self-reported by
each client and says nothing about who may edit. Membership is the edit key.
_Avoid_: reading presence as permission; "online" (it is per-room, not site-wide).

## Task promotion

> **Status (2026-07-17): DESIGNED, NOT BUILT (ADR-0034).** No backend implementation exists
> yet — no `TaskPromotionVote` model, no threshold config, no level-5 `promote_tasks` ability.
> The vocabulary below is the *design*; treat it as forward-looking until ADR-0034 lands.

**Promotion vote** *(distinct from a praxis star-vote)*:
An eligible player's single binary "list this task" approval on a `pending` task. Not a
1–5 star rating and not scored — it spends no vote budget. Deduped and anti-self'd at the
**account** level: your account cannot promote its own proposal, and alts can't stack. The
model is `TaskPromotionVote`, separate from the praxis `Vote`. _Avoid_: calling it a
"star", "rating", or "upvote" (there is no downvote — dissent is abstention, not a veto).

**Eligible promoter**:
An **account** holding at least one level-≥5 character in the current era. This is both who
may cast a promotion vote *and* the denominator the promotion threshold is a fraction of —
numerator and denominator are the same currency (accounts, not characters). _Avoid_:
counting characters; counting cross-era levels.

**Community promotion** *(vs admin approval)*:
The `pending → active` flip driven by promotion votes crossing the threshold, as opposed to
an admin clicking approve. The two **coexist**: community promotion is an additional path;
admins keep approve/retire as the override. A promoted task is `active` like any other —
"promoted" is the event, not a lasting task state. _Avoid_: treating promotion as reversible
(it is one-way; the reverse is an admin **retire**), or as changing a task's `level_required`
(it changes only `status`).
