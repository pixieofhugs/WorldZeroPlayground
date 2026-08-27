# ADR-0082 — Albescent is redacted, not hidden

**Status:** Accepted
**Date:** 2026-08-23

**Supersedes:** [ADR-0027](0027-albescent-is-a-secret-society.md) — its **hiding posture** only.
The faction-listing surfaces stop concealing Albescent's existence and start withholding its
words. Everything else in ADR-0027 stands: Albescent is a distinct faction, its members and
their work are public, the sealed placeholder is not a 404, and the reveal is a sticky
account-collective flag.
**Relates to:** #2409 (this decision), #1891 (the client-side name gate — **still governing
every label site**; this ADR reverses one sentence of it on two surfaces only, see §2, and its
ruling 1 is untouched everywhere), [ADR-0080](0080-one-life-earns-albescent-its-siblings-take-it-and-the-earner-never-can.md)
/ #2399 (who qualifies), #2518 (reveal follows QUALIFY, not join), #2400 (the admin bypass),
#2422 (the roster fold on the same predicate), #1855 (whose eighth-lane ruling this reverses),
#390 / #394 (the original secrecy build), CONTEXT.md ("Account", "Faction")

## Amendment

**2026-08-27 (#2770): a third state goes in front of these two — absent below level 6,
redacted from 6, real on reveal.** Owner ruling. Same decision, one more stage before it.

Nothing in the reasoning below is reversed. *"A row they can see and cannot read is the locked
door with no keyhole"* still governs, and it governs **from the era's glimpse level up**. What
changes is that a player under it is not yet shown the door: no Albescent card, no lane, no
tell. That restores ADR-0027's hiding posture for the **early game only** — the posture §1 and
§5 below retired for everyone, now retired for everyone who has got far enough to be teased.

**The gate is account-scoped and sticky, and that is the crux rather than a detail.** Level is
per-character; every other Albescent gate on this record is per-account and permanent. A gate
reading the *active* character's level would make the eighth card blink in and out with the
character switcher — a louder tell than either state it moves between. So it mirrors
`albescent_unlocked` exactly: `EraConfig.albescent_glimpse_level` holds the floor,
`Account.albescent_glimpsed` is stamped the first time **any** character on the account reaches
it, and it is never unstamped — across era resets included, which is also why it must be
stamped rather than derived (`apply_era_reset` returns every life to level 0).
`services.albescent_reveal.is_albescent_glimpsed` resolves **reveal implies glimpse** at the
read, so the two flags on `/auth/me` arrive consistent and nothing downstream checks both.

**Level 6 announces itself**, as an `ability` rung and not a `sense` one: the rung names a real
gate constant, and filing it as whimsy would make the era file lie about itself. The pop-up says
*"Now mysteries will reveal themselves to you"* and **stops** — the catalogue entry carries no
`desc`, deliberately, for §2's own reason: *"I'm not going to give them hints on how."*

**What this does NOT change:**

- **The two surfaces are still exactly two** (§2). Concealment is answered where their LISTS are
  built — `useFactionsDirectory` for the tile, `factionStandings` for the lane — so the select
  card and the lane component are untouched and never learn there was a third state. Every
  label site still says "Unaffiliated"; #1891's ruling 1 is as untouched by this as it was by
  the decision below.
- **The hide stays client-side** (§5). `list_factions` and `/factions/status` keep serving the
  row to everyone: the slug rides every Albescent-authored task and praxis regardless, so a wire
  filter on `/factions` alone would buy nothing and would put auth back on a public read. §5's
  redacted-row follow-on (#2540) is **still open and still undecided**.
- **§4's share denominator, with one correction.** Albescent's points are in the pot for a
  viewer who can see the lane, exactly as ruled. A viewer who cannot see it does not pay the
  size leak either: the lane leaves the denominator with the row, so seven percentages still add
  to 100. Dropping the lane at the render sites instead would have left an arithmetic hole where
  the eighth row was — a sharper tell than the redacted lane it replaces.

## Context

ADR-0027 made Albescent secret by **omission**. `GET /factions` and `GET /factions/status`
dropped the row for an unrevealed account, the leaderboard's lane list was hardcoded to seven
so a data-driven eighth could never appear, and #1891 added a client gate that resolved the
name to "Unaffiliated" wherever a slug still leaked through. The rule was: a player who has
not been let in encounters nothing at all.

Three years of that shape produced two problems.

**It taught the player nothing.** A secret nobody can perceive is not a mystery, it is an
absence. There is no door to find, because there is no door.

**It was a lie with a seam in it** — on the surfaces that are about the society. #1891's gate
answered "Unaffiliated" everywhere, which is right for a byline and wrong for a faction
directory: a tile that simply is not there teaches nothing. Meanwhile the reveal
predicate widened twice (#2400's admin bypass, #2518's reveal-on-qualify) and every widening
made the omission harder to keep coherent: a qualified player holds an invitation letter that
**names the order out loud** on the Field Desk, and under omission that player then saw
Albescent nowhere else.

The owner's ruling, during /grilling on 2026-08-20: *"I like this mechanic more than pure
secrecy."*

## Decision

**Albescent is present everywhere the other factions are, and on the two surfaces that are
ABOUT the society its strings render as `[REDACTED]` until the account is revealed.** The mark
is painted in its own ground's colour, so it reads as blank until a player drags a cursor
across it.

**Everywhere else the name is a LABEL it keeps saying "Unaffiliated", exactly as #1891 ruled.**
That boundary is §2 and it is the part of this ADR most likely to be mistaken for a bug.

A locked door with no keyhole. No progress readout, no criteria, no explanation —
*"I'm not going to give them hints on how."*

### 1. The server stops omitting the row

`routers/factions.py` served a filtered list; it now serves every visible faction to every
caller, including anonymous ones. The optional-auth dependency on `list_factions` went with
the filter it fed — it existed to answer one question the handler no longer asks.

The reveal predicate itself is untouched: `services/albescent_reveal.is_albescent_revealed`
still resolves `is_admin || albescent_revealed || albescent_unlocked` in one place, and still
governs `services.progression`, `faction_slugs` (#2422) and the `albescent_revealed` field on
`/auth/me`. What changed is that the faction directory stopped being one of its readers.

### 2. TWO surfaces redact; every label keeps #1891's mask

**This is the boundary, and it is deliberate. Read it before "fixing" the inconsistency.**

| Surface | Behaviour | Why |
|---|---|---|
| The `/factions` select tile (`components/selectCard/AlbescentSelectCard.tsx`) | **Redacts** — `[REDACTED]` in the ground's own colour, control disabled | The tile is ABOUT the society. A blank where a name goes is the door. |
| The leaderboard's eighth lane (`pages/players/{Desktop,Mobile}Players.tsx`) | **Redacts** the same way — blank until selected | Same: the lane exists to be noticed. |
| **Everything else** — praxis bylines, task cards, metatask seals, the character switcher, sidebar `aria-label`s, ~35 sites through `factionName` | **Says "Unaffiliated"**, unchanged from #1891 | A name that LABELS a thing already on screen. |

The reasoning for the third row is #1891's own, and it is what the owner's ruling restored:
*"Where a name LABELS a thing already on screen, masking it to 'Unaffiliated' is right — a
blank where every other card has a name advertises that something is being withheld."*
Redaction is a **mechanic on two surfaces**, not a global rename of the word.

This ADR first shipped (PR #2542) reading the decision globally: `factionName` answered
`[REDACTED]` for every caller, so all ~35 label sites inverted at once and a player's praxis
byline read `[REDACTED]` in ordinary ink. **The owner ruled that back on 2026-08-23.** The
sentence of #1891 this ADR reverses is reversed *only inside those two surfaces*.

Mechanically: `utils/factions.ts` keeps the impure, module-level gate #1891 built, and
`factionName` / `factionDescription` are **unchanged** by this ADR. Beside them sit
`redactableText` (generalised from one key to the Albescent-scoped namespace) and
`isFactionRedacted`, which are **opt-in** — a surface that wants the mark calls them. With two
call sites there is deliberately no registry, no context and no config: a lookup table is
precisely the thing that would grow back into the global rename.

The redaction is a rendering rule and not a second catalogue, deliberately. Albescent's copy is authored
exactly as every other faction's is, so the moment an account is revealed the real words are
already in place — there is nothing to swap in, and nothing that can be written in one
catalogue and forgotten in the other.

The redaction mark is the one string this app hard-codes rather than translating. It is not
copy, it is the absence of copy; a localised redaction would give each language its own tell.

### 3. The words and the door move together

The Albescent select tile's control **renders and is disabled** until the account qualifies.
Both the redaction and the disabling read the same answer, because the card un-redacts and
unlocks in the same moment. There is no state showing a readable card with a dead button, and
none showing a redacted card with a live one.

Seeing is still not joining. `defect_to_faction`'s eligibility guard is untouched and an admin
still joins by qualifying like anyone else (#2400).

### 4. The eighth leaderboard lane

Albescent races. Its lane is a hardcoded eighth, not a data-driven one, so the row is there
even when the loaded page contains no member of the society — a lane that vanished with the
roster would let its absence be read as its non-existence.

**`na` still gets no lane.** Unaffiliated is a state, not a faction (ADR-0030 / ADR-0039). The
two exclusions were never the same exclusion and only one of them moved.

**The share denominator moved with the lane, and that is accepted.** Albescent's points are in
the pot now, so every other faction's percentage changed, and the number leaks the society's
size while its name stays hidden. A second redaction over the number was explicitly rejected:
the lane shows as the others do.

This reverses #1855's ruling that the design's eighth lane was a deliberate deviation to be
dropped.

### 5. Where the server boundary now sits

`utils/factions.ts` records that the client gate *"does not pretend to stop a reader of the
network tab"*, and under ADR-0027 the server was what actually withheld. **Moving Albescent
into `/factions` moves that line, and this is where it now sits:**

- **The server withholds nothing on the faction-listing routes.** `FactionOut` is
  `{slug, status}` — no prose to leak — and the wire has carried the `albescent` slug on every
  Albescent-authored task, praxis and character since ADR-0027 shipped, because ADR-0027's
  first tier makes those public on purpose. Serving the row leaks the same slug those payloads
  already carried.
- **The server still withholds on every other reveal-gated route**, unchanged: the level
  ladder's unlock rung (`services.progression`), the roster/list fold (#2422), the character
  creation chooser (`/me/invited-factions`), and the `albescent_revealed` flag itself. A
  *chooser* still drops the row rather than redacting it — #1891 ruling 3 stands, because
  masking a picker hands an unrevealed player two identical rows, which is louder than the leak
  it replaces.
- **A LABEL is not a redaction site at all**, so nothing about the ~35 label callers changed:
  they masked to "Unaffiliated" before this ADR and they mask to it after.
- **The client is now the redaction boundary, and it is a tease rather than a wall.** A reader
  of the network tab can see that a faction called `albescent` exists. That is the accepted
  cost of the mechanic; it always was, one layer down.

**Serving a redacted ROW rather than the real one is the follow-on this ADR enables, and is
deliberately not decided here** (#2540). It would let the tease generalise without weakening
the boundary, and it needs its own argument about what a redacted payload looks like.

### 6. Screen readers announce "REDACTED", and that is correct

The mark is real text in the accessibility tree. It is not `aria-hidden`, not
`visibility: hidden`, and not an image.

This is equal treatment, not an oversight. The secret is equally discoverable to a
screen-reader user and to a sighted user who drags a cursor across the line. Hiding the mark
from assistive technology would hand sighted players a tease and blind players nothing — and
would also let the contrast sweep pass for the wrong reason.

### 7. The 1:1 pairing is deliberate and exempted at the site

The mark takes its own ground's colour, which is a 1.00:1 contrast ratio, which two guards
would otherwise fight forever.

- **The rendered sweep** (`e2e/contrastScan.ts`) gains a third exemption beside `aria-hidden`
  and inert controls, keyed on `data-redacted="true"`, with the reason recorded there.
- **It is NOT added to `e2e/contrastBaseline.ts`.** That list is known debt awaiting a fix and
  only ever shrinks; an entry that is never going to be deleted would rot it.
- **The style ratchet** (`no-raw-style-values`) needs no exemption at all. The mark is a class
  in `index.css` over `--color-*` tokens, so there is no raw value to catch.

## Carried forward from ADR-0027, unchanged

- **The look/word split** (#1891 ruling 1). Albescent's skins, frames and voices keep
  rendering; `factionCssVar('albescent')` still resolves to the neutral default (#783). A
  redacted card wears the society's own face. **Only the word changes.**
- **The invitation letter may name the order, and never links to `/factions`** (ADR-0027,
  #390). This is what #2518's reveal-on-qualify is built on: a player holding the letter has
  been told by us, in our own words, so continuing to print `[REDACTED]` at them would be the
  site contradicting a document it just handed them.
- **The sealed placeholder is not a 404.** `/factions/albescent` still shows
  `AlbescentSecretPlaceholder` to an unrevealed reader — an in-world dead end, for exactly
  ADR-0027's reason.
- **Members and their work stay public.** ADR-0027's first tier is untouched.

## Considered Options

- **Keep pure secrecy (the status quo).** Rejected by the owner directly: the mechanic is
  better than the absence. It also leaves the qualified-but-not-joined seam permanently open —
  a player reading a letter that names the order while every other surface blanks it.
- **Redact the letter too, so the omission stays total.** Rejected. It is the only way to close
  that seam from the secrecy side, and it contradicts ADR-0027's own carry-forward that the
  letter names the order. It would also delete the one moment where finding your way in feels
  like finding your way in.
- **Render the real strings and paint THEM invisible.** Rejected. The words would sit in the
  DOM, in the accessibility tree and in any selection — a redaction that redacts nothing. The
  strings resolve to the mark; the mark is what gets painted.
- **Author a second catalogue of redacted strings.** Rejected. Two catalogues drift, and the
  revealed copy would then be a thing that has to be written twice. The redaction is a
  rendering rule so that authoring stays ordinary.
- **Redact the word EVERYWHERE, so `factionName` answers the mark for all ~35 label sites.**
  Built first, then rejected by the owner (see §2). It reads as a bug rather than a mechanic:
  a praxis byline that says `[REDACTED]` in ordinary ink is a label failing, not a door. It
  also discards #1891's reasoning wholesale when only one sentence of it was in question.
- **`aria-hidden` the mark, so assistive tech skips it.** Rejected — see §6.
- **Add a second redaction over the lane's share percentage.** Rejected by the owner: the lane
  shows as the others do. The size leak is accepted.
- **Ship the lane, the card and the ADR as three merges.** Rejected: they key off one
  predicate, and splitting them leaves a half-redacted site on `main` between merges.

## Consequences

- `GET /factions` is a genuinely public, viewer-independent listing again. Two admin-bypass
  tests that proved the filter now prove its absence — the admin and the plain payloads must be
  **equal**.
- **No label site changed.** Praxis bylines, task cards, metatask seals and the character
  switcher still read "Unaffiliated" for an Albescent subject seen by an unrevealed viewer —
  about thirty-five call sites, all through one gate, none of them edited, exactly as #1891
  left them.
- **Two surfaces read differently from the rest of the app, on purpose.** Anyone comparing the
  select tile to a praxis byline will see an inconsistency; §2 is the answer, and normalising
  either way undoes a ruling.
- Faction percentages on the leaderboard all changed, because the denominator grew.
- `descriptions.albescent` is still the owner's `PLACEHOLDER` to write. It redacts either way,
  and slots in with no code change when it is written.
- A future surface is NOT redacted for free — `redactableText` is opt-in, so a new surface
  that draws the catalogue directly says "Unaffiliated" like every other label. That is the
  correct default under this ruling: a third surface redacts only when someone decides it is
  about the society, and that decision belongs in a review, not in a fall-through.
