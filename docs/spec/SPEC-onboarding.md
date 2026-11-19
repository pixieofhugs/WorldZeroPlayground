# World Zero — Onboarding

The arc from scanning a QR code in the real world to standing at level 1.

Charted decision-by-decision on the wayfinder map
[Onboarding: from a scanned QR code to level 1](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1732).
Each section below cites the ticket that settled it; the ticket holds the reasoning, this
holds the outcome.

## The problem

A stranger is asked to authenticate before the site has explained itself. They land on a
homepage naming a genre rather than an activity, and the only thing to do is sign up on
faith. **The arc inverts that order.**

The mechanic underneath was already built and is unchanged: players start at level 0,
`level_thresholds[1]` is 10, level 0 is reserved for exactly one game-wide task worth 10
points (`seed.py::ensure_onboarding_task`, #511/#904), and base points land on publication
rather than on votes — so reaching level 1 is deterministic and never waits on other
players voting. **Onboarding was never a rules problem. It is a legibility problem.**

## The arc

    scan → title → seven beats → contract → sign-in → character creation → arrival → the task → level 1

The flow's stops are: the title, seven beats, the contract, sign-in, character creation and
the arrival page. The first six of those are the flow; the task and level 1 are the existing
app it lands in. Someone who already plays gets one more view, the "Welcome back" sign-in, in
place of the whole run. ([#1738](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1738))

| Stop | Status |
|---|---|
| Title and seven beats | Net-new |
| Contract (the terms card) | Net-new surface, before sign-in |
| Sign-in | Restyled; the "Welcome back" view for an existing player is net-new |
| Character creation | Existing `CreateCharacter` form, rendered inside the flow |
| Arrival page | Net-new; shows the first task |
| The onboarding task | Existing; gains a derived mark |
| Field Stamp at level 1 | Existing; untouched |

*2026-11-18, [#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457):* was "three net-new cards, then the flow ends" with a hand-off to another
route. The approved design keeps going through creation and arrival.

**One flow, two entrances.** The flow is the home page: `/` shows it to a guest and to a signed-in
account with no character; a player with a character gets the Field Desk. The QR code points at
`/start`, which renders the same flow (no redirect), as a path segment that can later take
`/start/<theme>`. The old marketing Home is deleted. Not two explanations of the same game.

*2026-11-19, [#3541](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3541):* was "Home's logged-out CTA leads into it". OAuth returns to `/` and resumes the flow in place.

**A door, not a wall.** Tasks, praxis, factions, leaderboard and character profiles are
already public — no `ProtectedRoute`. Every stop keeps "let me just look around" available.
The failure being fixed is copy and routing, not permissions.

## Copy

**Every string in this spec is a slot, not a sentence.** The owner writes the words; this
document says only what each slot must carry. Build with obvious placeholders — never
invent final copy, and never lift the throwaway wording from the prototype
(`prototype/onboarding-flow`), which exists to be reacted to and is not a source.
The one exception is the approved prototype, `.design-sync/onboarding-arc/` (below).

### What the intro must land — six things, over a short run of beats

([#1735](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1735))

1. This is a game.
2. The tasks happen in the real world, away from the screen.
3. You photograph what you did, as proof.
4. Other players rate that proof, and that is how you score. Voting is not part of
   the pitch's promise: it unlocks only after another player has voted on your proof, not
   at level 1 ([#3475](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3475)).
   A beat that shows the player voting must not say they can do it from the start.
5. It is free.
6. A person made this; it is small and a bit silly.

**Factions may be teased as flavour, never promised.** They stay invitation-gated
(ADR-0022) and unreachable at level 0, so the intro may name the warring organizations
(the last beat does, with a brawl) but must not offer them as something the player can
reach or choose. Naming them as a destination would sell what the game cannot deliver for
a long time.

The intro is a **short sequence of beats** (seven, per the epic
[#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457)), and together they
land all six things above. The ask is **front-loaded, never buried**: the conversion cost
is accepted deliberately.

The spec still does not write the words. For the approved prototype only (`.design-sync/onboarding-arc/`), its wording is
the shipped default (#3457, standing rule 8), replacing the "never lift the prototype's
wording" rule above for that prototype. That wording lives in
`frontend/src/locales/en/onboarding.json`, and the owner still owns every string in it.

*2026-11-18, [#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457):* the reviewed prototype wording is the shipped default, and the
"never invent final copy" placeholder rule no longer applies to it; ownership of
the strings is unchanged.

- **The revision must mention the deleted-account record** ([#3451](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3451)): per ADR-0081, a salted hash of the sign-in ID is kept for a limited time. Wording is the owner's, still owed.

*2026-11-18, [#3452](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3452):* was "one paragraph, not three beats" with factions cut. The owner
approved the seven-beat prototype, so this section now describes a sequence and allows a
faction tease. #3452 is the decision record. Knock-on from #3475: voting unlocks only
after another player has voted on your proof; the era file and #3475 hold the rule.

### Vocabulary rules

- **"Praxis" does not appear before auth.** Say proof, or a photo. Nothing formally teaches
  the word at all — the player meets it once they have one. Deliberate: the map's standing
  preference is *leave things to discover*.
- **"Sign up" belongs to the task claim.** The glossary already made it precise (a Character
  *signs up for* a task; *avoid "join"*), and the code says `can_sign_up`. Account creation
  uses other words.
- The boundary discovery does **not** cross: *what is expected of you*. Withholding a secret
  is generous; withholding the cost is a bait-and-switch.

## Visual language — the `na` kit

The cards wear the **Unaffiliated / `na`** identity: the spectrum sheet. Not generic paper —
a `Default*` that invents its own metaphor is **stale** by the glossary's definition, the
wrong identity rather than a neutral one. Apt as well as correct: the player has no faction
yet, and the spectrum means every path is still open.

Read `components/taskCard/DefaultTaskCard.tsx` for the language rather than reproducing it
here. The rules that matter:

- **Rainbow in exactly two places per onboarding card:** the 3px band that *is* the border,
  and the conic ring. The restraint *is* the design. The task card spends a third on a tick
  beside its in-progress count; the onboarding cards do not.
  *2026-10-12, #3098:* the onboarding cards drew that third mark too until the owner retired
  it. It had been drawn to sit beside a caption, #2766 cut the caption and kept the tick,
  and alone it read as a stray mark. This supersedes the "the tick stands alone" decision
  recorded with #2766.
- **The band is the border** — `border: 3px solid transparent` with the gradient painted
  into the border box, not a decorative stripe.
- **Lora italic for titles, Courier Prime for everything else.**
- Every colour through a `--faction-default-*` token, both themes, no hardcoded hex.
  The primary control takes na's card ink — a single rainbow stop used alone reads as a
  single-hue accent, which is precisely what `na` is not.

Three rules the flow's build depends on:

- **The flow is dark-only.** Its root sets `data-theme="dark"`; colours still come from
  `--faction-default-*` and `--faction-<slug>` tokens, with no new hex. A light theme is out
  of scope.
- **Back sits at the bottom of the card that carries the next step**, on every step. There is
  no Back in the page header.
- **The mascot is a nameless wisp** that grows braver through the flow. It starts shy and
  shows more of the spectrum as the steps go on.

**`/start` keeps the app's normal top nav.** The flow is not full-bleed: the owner ruled that
the site's navigation stays visible above it.

*2026-11-18, [#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457):* added the three rules and the top-nav ruling for the approved
prototype build.

## Authentication

**Two providers, neither privileged.** Google and Discord are both live
(`/auth/google`, `/auth/discord`). The frontend has no Discord control anywhere yet, so the
auth card is the first surface in the app to offer one.

**Nothing rides on the wire.**
([#1899](https://github.com/pixieofhugs/WorldZeroPlayground/pull/1899)) A successful OAuth
callback redirects to a constant, and that is deliberate rather than a gap. The flow remembers
its own place client-side: a session-scoped boolean written the moment before the auth card
hands the browser to a provider, acted on by the root landing route only once a session exists,
and cleared by the flow on its next mount so it can fire at most once. No destination on the
wire — no query parameter, no return-to path, no `state` payload, no backend change. The
mechanism and its failure modes live in `frontend/src/utils/onboardingResume.ts`. This is the
same visit interrupted, not a new scan — see *Coming back*.

**The server is not asked to decide.**
([#1734](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1734) — superseded) The
rejected design would have had the server derive the destination: `create_or_get_account` runs
before the callback builds its redirect, so it can distinguish a new account from a returning
one without being told. **That is the wrong predicate.** The rule this flow runs on is
character-level — *has this character completed the onboarding task* — and a player who signed
up, never made a character, and re-scans the sticker months later reads as **returning**. A
server-side new-vs-returning branch drops exactly that player at `/`, and they never reach the
terms card. Answer that before proposing a return-to again.

Carrying a destination instead — an opaque key from a closed server-side set inside authlib's
`state`, mapped to a constant path in the callback, never a path or URL on the wire — is
worked out in full in `docs/research/oauth-return-to.md`. **Not built, and not needed by this
arc**, which has exactly one destination.

## Terms

([#1737](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1737))

- **The document is the existing Disclaimer, revised** — not a second parallel Terms page.
  It already carries the clause that matters for this game: players are solely responsible
  for their own safety and the legality of real-world actions. What it lacks is a version
  identifier, a statement of what agreeing binds you to, and any mention of the photographs
  the player is about to post publicly.
- **Accepted before sign-in.** The contract comes after the intro and before the auth
  card. Pre-auth acceptance was first rejected on what the record would be worth: with no
  identity yet, the server can bind the click only to a browser session and must then trust
  a flag riding back through a redirect. It stays honest this way: the click is held
  client-side through the OAuth redirect (the same mechanism as *Authentication*), and the
  consent row is written only once the account exists, so the server never records an
  acceptance that has no identity behind it. If the flow returns from OAuth holding no click,
  the player is sent back to the contract before character creation.
- **Recorded as an append-only consent log** — one row per acceptance event, carrying the
  account, the version, and the time. Existing accounts have no rows, which is the honest
  record.

*2026-11-18, [#3452](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3452):* was "accepted after auth, before character creation". The
approved flow puts the contract before sign-in, and the owner accepts it. #3452 is the
decision record.

## The hand-off

([#1736](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1736))

**The flow lands the player on the task page, framed. It never claims on their behalf** — a
claim enters the task bank (`max_task_signups`), and unwinding it means finding the withdraw
path on day one.

Character creation is a **step inside `/start`**, followed by an **arrival page** that shows
the player's first task. The arrival page links to that task; it does not claim it. The
creation form is the real `CreateCharacter` one, rendered in the flow, not a copy.

A character created **outside `/start`** still lands where it does today. There, the
destination is the brand-new character's one takeable task, **derived** from the character's
own state (level 0, never completed the onboarding task), not from a flag onboarding passes
in. That holds however they arrived: sticker, search engine, or a second character years
from now.

**The task marks itself.** The onboarding task carries a *start here* signal wherever it
appears, derived and never hand-set, shown only to a character that has **never completed
it, ever** — not "not this era". Era resets drop every character to level 0, so an
era-scoped rule would relight the mark for the whole playerbase at every rollover. This
costs no new storage: `Praxis` carries no `era_id` (era membership is a seal-time fact,
`services/era.py::get_era_row_for_praxis`), so praxis history already outlives resets.

Marking the *surfaces* instead was rejected — two places to keep in sync, and it becomes
"make the task board new-player-aware", which is out of scope.

**Admins are not a special case.** No one is forced through the flow, so no bypass is
needed; and admin is an account-level role while the mark is a character-level derivation
(ADR-0041 keeps that boundary clean). The seeded `pixie` character is unaffiliated at level
0 with no onboarding praxis, so the only current admin carries the mark. That is honest.

*2026-11-18, [#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457):* was "the flow ends there and does not resume" at a hand-off to
`CreateCharacter`. Creation and arrival are now steps of the flow; the never-claims rule, the
derived mark and the outside-`/start` landing are unchanged.

## Coming back

([#1856](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1856))

**A scan always re-runs the flow from the top.** No resume, no bookmark. The contract simply
shows again and writes another row; the append-only log absorbs the duplicate. The one exception is
the OAuth round trip, which is the same visit interrupted rather than a new scan
(*Authentication*, above).

Consequently **`CurrentUser` gains nothing** — no terms flag, no new field, and no way for
the flow and the server to disagree about where someone stands. The intro is not waste on a
returner either: someone who bailed is by definition a person the pitch did not land on.

**The sign-in card is skipped when a session exists.** The one asymmetry — re-asking for
agreement is free and honest, re-authenticating is a full round trip, and bouncing a
signed-in person out to a provider looks like the site has lost them. With the contract
before sign-in, a signed-in person who opens `/start` cold still sees the title, the beats and
the contract; they go from the contract straight to character creation, and the consent row is
written at once because the account already exists (*Terms*). The OAuth resume
(`utils/onboardingResume`) is not a cold open: it lands past the title, the beats and the
contract, with the held contract click carried through the redirect.

**Someone who already plays gets the "Welcome back" sign-in view** rather than the run from
the top: a sign-in and nothing else, for a person who has a character already.

*2026-11-18, [#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457); #3452:* was written when sign-in came before the terms. The order is
now title, seven beats, contract, sign-in, creation, arrival, and a signed-in person who opens
`/start` cold skips only the sign-in step; the OAuth resume lands past the title, beats and contract.

**The flow stops applying once that character has completed the onboarding task** — the same
predicate as the mark. One rule, two consumers, consistent by construction: the flow can
never refuse to start someone whose task is simultaneously marked *start here*. Past that
line a scan drops the player at `/`.

Three of the five bail points needed no decision, being already handled: no session (nothing
to resume); an account with zero characters (`/` always shows the create-your-first-life
roster, never gated — *"the roster is the only way in, or signup dead-ends"*, #1560); and a
character with no praxis (the mark).

## Level 1

The existing **Field Stamp** pop-up, unchanged apart from that — it already fires at the right moment and
announces rank `trailhead` and its unlocks. Its `vote` unlock (`backend/eras/era_1.py`)
shows [#3475](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3475)'s lock
explanation: the level gate stays and the received-vote condition is added. No bespoke ending: by then the player has done a
real thing in the world and photographed it, which does not need a surface congratulating
them for it.

Voting is not among the level-1 unlocks to promise. It unlocks only after another player
has voted on your proof ([#3475](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3475)),
so any beat that shows the first level-up must not imply the player can vote at level 1.
The rule's values live in the era file and #3475, not here.

The arrival page celebrates the **character**, not the level. Level 1 is reached later, by
doing the task, and the Field Stamp marks it.

*2026-11-18, [#3457](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3457):* the arrival-page line is new; the Field Stamp is unchanged.

*2026-11-18, [#3452](https://github.com/pixieofhugs/WorldZeroPlayground/issues/3452):* added with the vote-unlock knock-on. #3452 is the decision record.

## Before this can ship

**The revised Disclaimer's wording is not written.** The document, its position and its
storage are specified; the words need someone who knows the jurisdiction, and this is a game
whose first request is a photograph of the player. **This is the one dependency that blocks
building the terms card.**

## Out of scope

- **Everything after level 1** — retention, faction choice, the second task. Where onboarding
  blurs into the rest of the game; the destination cuts here.
- **The onboarding task's own content and wording** — being revised separately. Nothing here
  depends on what it asks for.
- **Terms revisions for established players** — whether a version bump gates them. By
  definition about people already past level 1. This arc writes only the first row; the
  version column leaves the door open.
- **Making the task board new-player-aware** — the level filter was removed deliberately
  (#1130); reworking `/tasks` around newcomers is a different effort.
- **The faction system** — players start unaffiliated (ADR-0030), faction choice is gated by
  invitation (ADR-0022).
- **QR variants** — one code, one destination. Different versions or flavours are a future
  feature and explicitly **not** a seam to build now; it graduates when a second flavour
  actually exists.
- **Analytics** — no signal exists today and this effort was ambition-driven, so there is no
  baseline to measure against either.
