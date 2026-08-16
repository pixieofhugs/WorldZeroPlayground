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

    scan → intro → auth → terms → [ hand off ] → character creation → the task → level 1

Three net-new cards, then the flow **ends**. Everything after the hand-off is existing app,
correctly sequenced. ([#1738](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1738))

| Stop | Status |
|---|---|
| Intro, auth, terms cards | Net-new — three surfaces |
| Character creation | Existing `CreateCharacter`; one navigation change |
| The onboarding task | Existing; gains a derived mark |
| Field Stamp at level 1 | Existing; untouched |

**One flow, two entrances.** The QR code points at it; Home's logged-out CTA leads into it
rather than straight to a provider. Not two explanations of the same game.

**A door, not a wall.** Tasks, praxis, factions, leaderboard and character profiles are
already public — no `ProtectedRoute`. Every stop keeps "let me just look around" available.
The failure being fixed is copy and routing, not permissions.

## Copy

**Every string in this spec is a slot, not a sentence.** The owner writes the words; this
document says only what each slot must carry. Build with obvious placeholders — never
invent final copy, and never lift the throwaway wording from the prototype
(`prototype/onboarding-flow`), which exists to be reacted to and is not a source.

### What the intro must land — six things, in one paragraph

([#1735](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1735))

1. This is a game.
2. The tasks happen in the real world, away from the screen.
3. You photograph what you did, as proof.
4. Other players rate that proof, and that is how you score.
5. It is free.
6. A person made this; it is small and a bit silly.

**Factions are cut** — invitation-gated (ADR-0022) and unreachable at level 0, so naming
them pre-signup sells what the game cannot deliver for a long time.

The frame, the ask and the whimsy are **one paragraph, not three beats** — the ordering
question among them does not exist. The ask is **front-loaded, never buried**: the
conversion cost is accepted deliberately.

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

- **Rainbow in exactly three places per card.** The restraint *is* the design. On the task
  card those are the 3px band that *is* the border, the conic ring, and one tick; the
  onboarding cards keep the same budget.
- **The band is the border** — `border: 3px solid transparent` with the gradient painted
  into the border box, not a decorative stripe.
- **Lora italic for titles, Courier Prime for everything else.**
- Every colour through a `--faction-default-*` token, both themes, no hardcoded hex.
  The primary control takes na's card ink — a single rainbow stop used alone reads as a
  single-hue accent, which is precisely what `na` is not.

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
mechanism and its failure modes
live in `frontend/src/utils/onboardingResume.ts`. This is the same visit interrupted, not a
new scan — see *Coming back*.

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
- **Accepted after auth, before character creation.** Pre-auth acceptance was rejected on
  what the record would be worth: with no identity yet, the server can bind the click only
  to a browser session and must then trust a flag riding back through a redirect.
- **Recorded as an append-only consent log** — one row per acceptance event, carrying the
  account, the version, and the time. Existing accounts have no rows, which is the honest
  record.

## The hand-off

([#1736](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1736))

**The flow lands the player on the task page, framed. It never claims on their behalf** — a
claim enters the task bank (`max_task_signups`), and unwinding it means finding the withdraw
path on day one.

`CreateCharacter` is reached by **handing off, not wrapping**: the flow ends there and does
not resume. Its one change is where it navigates. Today it goes to `/`; it should land a
brand-new character on their one takeable task — **derived** from the character's own state
(level 0, never completed the onboarding task), not from a flag onboarding passes in. That
holds however they arrived: sticker, search engine, or a second character years from now.

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

## Coming back

([#1856](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1856))

**A scan always re-runs the cards from the top.** No resume, no bookmark. Terms simply shows
again and writes another row; the append-only log absorbs the duplicate. The one exception is
the OAuth round trip, which is the same visit interrupted rather than a new scan
(*Authentication*, above).

Consequently **`CurrentUser` gains nothing** — no terms flag, no new field, and no way for
the flow and the server to disagree about where someone stands. The intro is not waste on a
returner either: someone who bailed is by definition a person the pitch did not land on.

**The auth card is skipped when a session exists.** The one asymmetry — re-asking for
agreement is free and honest, re-authenticating is a full round trip, and bouncing a
signed-in person out to a provider looks like the site has lost them.

**The flow stops applying once that character has completed the onboarding task** — the same
predicate as the mark. One rule, two consumers, consistent by construction: the flow can
never refuse to start someone whose task is simultaneously marked *start here*. Past that
line a scan drops the player at `/`.

Three of the five bail points needed no decision, being already handled: no session (nothing
to resume); an account with zero characters (`/` always shows the create-your-first-life
roster, never gated — *"the roster is the only way in, or signup dead-ends"*, #1560); and a
character with no praxis (the mark).

## Level 1

The existing **Field Stamp** pop-up, unchanged — it already fires at the right moment and
announces rank `trailhead` and its unlocks. No bespoke ending: by then the player has done a
real thing in the world and photographed it, which does not need a surface congratulating
them for it.

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
