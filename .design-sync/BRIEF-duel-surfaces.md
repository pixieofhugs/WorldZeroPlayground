# Design brief — duel surfaces (issues #721–#726)

Read this before designing any duel screen. It exists because the previous duel
handoff (`HANDOFF-duel-composer.md`, Wow) asserted several things about how duels
work that turned out to be **false**, and those errors got baked into the mock as
visible copy. This brief gives you the mechanics and the exact strings so you don't
have to guess.

**You are designing six factions:** Everymen (#721), Snide (#722), Singularity (#723),
Ephemerists (#724), University of Asthmatics (#725), Albescent (#726). Wow (#720) is
already designed and is a reference for *what the surfaces are*, not for how yours
should look.

---

## CORRECTION — read this before anything below it

**This brief was written as a spec for surfaces that were then built differently.**
It described what was going to ship; #718, #1071 and #1090 shipped something else, and
that something else is what is on main. The brief has already misled one design (the
Singularity grill, #723). It is kept as a record of *intent* and of the game mechanics
in §5, which are still true. It is not a spec.

**Read the code before you design.** For every duel string:
`frontend/src/locales/en/praxis.json` — the `duelBanner`, `duelCrossLink`, `duelForfeit`,
`duelRoster`, `duelSeal` and `duelStakes` key families. For the components:
`frontend/src/components/duel/` (the seal dialog and its skins) and
`frontend/src/pages/praxisDetail/DuelCard.tsx`.

**Mocks are visual references.** Design the chrome; never transcribe the words. A skin
mounts the shared slots and calls typed `t()` keys, so a mock's copy cannot reach the
screen either way.

### What is stale, section by section

- **§0 — the "never verbal" rule has one shipped exception.** WOW skins its duel copy:
  `duelSeal.wow.*` gives it *Take the Field*, *Yield the Field*, *The Roster*, *The
  Stakes* and a ribbon line, mounted by `components/duel/wowLists.tsx`. Faction-neutral
  is still the default for the other six; it is not the absolute §0 claims.
- **§2 — there are five states, not four.** `DuelStatus` is
  `pending | active | settled | declined | resolved`. The brief's "live" is `settled`.
  `resolved` is new: at era close the pair freezes, so §2's and §6's "nothing is ever
  final" is now true only *before* era close.
- **§3 — the duel rail no longer exists.** See the marker on that section.
- **§4 — the copy was never built.** See the marker on that section.
- **§5 — still true.** Verified against `backend/eras/era_1.py`: per-faction
  `duel_win_modifier` / `duel_loss_modifier`, Snide at 2.0× / **0.0×**, figures are base
  points before crowd votes.

### Three things the Singularity mock got wrong

1. **Skins dispatch on the *task's* faction, not the viewer's.** "The Everymen skin"
   means duels on Everymen tasks —
   `resolveVariant(surfaceMap('duelSeal'), taskFactionSlug)`. Only the figures follow the
   viewer, off their own multipliers. The brief itself had this backwards.
2. **`pending` shows no stakes tiles.** `StakesTiles` emits the single
   `duelStakes.soloFallback` sentence instead, so a pending mock drawing a win/lose pair
   is unbuildable.
3. **The seal dialog is one responsive component** (#1313), not a desktop file and a
   phone file. `DuelSealSheet` owns the only form-factor branch.

---

## 0. The one rule

> **§0 is not absolute — WOW ships per-faction duel copy. See the CORRECTION above.**

> **Faction identity is visual. It is never verbal.**

Every other World Zero surface gives each faction its own voice — Snide's composer
button says `FILE IT & RUN`, Albescent's says `✦ SEAL & ENTER ✦`, Everymen's says
`tack it up →`. **Duel surfaces do not do this.** All duel copy is faction-neutral and
identical across all seven factions.

This is a deliberate ruling, not an oversight. Duel rules are asymmetric, permanent,
and easy to misread; a player learning them through seven different metaphors learns
them seven times, badly. The stakes need one vocabulary.

So: express Everymen-ness or Snide-ness entirely through **chrome** — frame, palette,
type, texture, ornament, layout rhythm. Do not rewrite a single string. If your mock
needs a word that isn't in §4, the answer is that you're designing a component that
shouldn't exist.

**Boundary:** this covers strings that only appear in a duel context. The composer's
own publish button keeps its existing per-faction voice — it isn't duel-specific.

---

## 1. What a duel actually is

Two characters, one task, **two separate entries**. Each writes their own praxis with
their own body, own photos, own votes. They are joined by a link that records the
pairing and who is winning.

A duel is **not** a shared document. Do not design anything that implies the two
duelists write in the same place, see each other's work-in-progress, or share a
gallery. Until both have submitted, neither can read the other's entry at all.

---

## 2. The four states — this is where the last mock went wrong

> **There are five.** `DuelStatus` is `pending | active | settled | declined | resolved`;
> "live" below is `settled`, and `resolved` freezes the pair at era close. See the
> CORRECTION at the top of this file.

| State | What's true | Can I back out? |
|---|---|---|
| **pending** | Challenge sent. Opponent hasn't answered. Only your entry exists. | **Yes, freely.** |
| **active** | Opponent accepted. One or both of you may have submitted. | **Yes, freely.** No penalty. |
| **live** | **Both** have submitted. Voting is open. | **No — backing out now forfeits.** |
| **declined** | Opponent said no. There is no duel. | n/a |

### The three errors to avoid

1. **Submitting is not the point of no return.** The previous mock said "sealed —
   can't edit while the duel runs" on a screen that depicts the `active` state. Wrong.
   In `active` you can unsubmit and edit freely, as many times as you like, with no
   penalty at all. The trapdoor closes only when your **opponent** submits — an event
   you don't control and can't predict. Design the confirm dialog to say this
   honestly: *not yet final, and here's what will make it final.*

2. **`live` does not mean decided.** It means voting just **opened**. There is no
   moment where someone wins a duel — the winner floats with the votes until the era
   resets, weeks later. Do not design a victory screen, a result banner, a trophy, a
   final score, or an "X won" state. (A separate issue, #719, tracks whether the game
   should even have a resolution moment. Today it does not.)

3. **Declined isn't a loss.** If your opponent declines, your entry quietly becomes an
   ordinary solo praxis and scores at normal rates. It is not a forfeit, not a
   penalty, not a defeat. Design it as a shrug, not a wound.

---

## 3. The two surfaces

> **SUPERSEDED — the rail was retired (#1090) and the run-up moved off detail (#1071,
> ADR-0059).** What exists today:
>
> - **The seal dialog** — `components/duel/DuelSealConfirm.tsx` plus a skin per faction,
>   dispatched on the **task's** faction through `surfaceMap('duelSeal')`. Its shared
>   slots are `StakesTiles`, `RaceRoster` and `SealActions` from
>   `components/duel/shared.tsx`. There is no `NextStepLine` and no `SubmitActions`;
>   `NextStepLine` was deleted with the rail.
> - **The praxis-detail duel card** — `pages/praxisDetail/DuelCard.tsx`. It is *not* a
>   dispatched duel surface: it is one card mounted by the praxis-detail archetype, which
>   dresses it through three seams (`style`, `heading`, `ink`). It draws only `settled`
>   and `resolved` — outcomes. `declined`, `pending` and `active` draw nothing here.
> - **The run-up** — `pages/editPraxis/waiting/PraxisWaitingSurface.tsx` narrates waiting
>   for the opponent. That beat belongs to the composer now, not to detail.
>
> **The accent rule below is inverted.** The card may never carry the opponent's faction
> hue as an ink or a ground; only as an edge or a ring (`DuelCardInk`, guarded by
> `praxisDetail/__tests__/duelCardOpponentInk.test.tsx`). Design the *frame* as your
> faction and do not plan for a foreign palette in your text colours.

### A. Submit confirm — `DuelSubmitConfirm`

The dialog shown when a duelist submits an entry that has a duel attached. Mobile is a
full-screen sheet; desktop is a centred panel over the dimmed composer.

Must carry, in this order of prominence:

1. **Who you're up against** — name + their faction
2. **The two outcomes** — win figure and lose figure, side by side
3. **The tie line** — one line of copy, not a third tile
4. **What's still reversible** — the honest finality warning for the current state
5. **Confirm / cancel**

### B. Duel rail — `DuelRail`

The persistent strip on the praxis detail page, above the faction archetype. Replaces
and extends today's single-line `⚔ Dueling Rax Vandal`.

Must carry:

1. **Per-side submit status** — has each of you entered yet
2. **What you're waiting for** — one line, changes per state
3. **The stakes**, still visible
4. **A link to their entry** — only once both are in

**The rail takes the *opponent's* faction accent, not the viewer's.** Deliberate: the
opponent is the foreign element on your page and should look foreign. So your Everymen
rail design needs to survive having, say, Snide's palette dropped into its accent
slots. Design the *frame* as Everymen; let the accent be a variable.

Both surfaces compose four fixed content slots — `StakesTiles`, `RaceRoster`,
`NextStepLine`, `SubmitActions`. You may rearrange them, resize them, or restyle them
completely. You may not drop one, merge two, or add a fifth.

---

## 4. The exact copy

> **SUPERSEDED — none of these strings were built.** #718 shipped a different vocabulary.
> Read `frontend/src/locales/en/praxis.json` — `duelBanner`, `duelCrossLink`,
> `duelForfeit`, `duelRoster`, `duelSeal`, `duelStakes` — and use those. This section is
> kept as a record of intent, not as an instruction.
>
> **The "words that are wrong" table is the wrong half.** The shipped copy says *Seal the
> duel?*, *sealed ✓*, *Casting now seals the duel*, *Won by default*, *{{name}} won*,
> *final — frozen at era close*, and WOW's cancel is *Withdraw*. The words are correct;
> the table banning them is not.

Use these strings verbatim in your mocks. `{{name}}` etc. are runtime substitutions —
render them with a plausible example (`Rax Vandal`, `Snide`) but keep the surrounding
words exactly as written.

Already shipped and correct — reuse as-is:

```
⚔ Duel                              ⚔ Dueling {{name}}
vs                                  · {{faction}}
their entry                         Tied / You're ahead / You're behind
⚔ Won by default                    — {{name}} forfeited
You forfeited this duel.
{{standing}} · live — the winner floats with the votes until era reset.
```

New strings for these surfaces:

**Submit confirm**

```
Title            Submit your entry?
Opponent         You're dueling {{name}} · {{faction}}
Win tile         If you win        +{{points}}
Lose tile        If you lose       +{{points}}
Tile footnote    Base points, before the crowd votes.
Tie line         A tie leaves you both at your base points.
Tie (Snide)      You take the win rate on a tie.
Tie (vs Snide)   {{name}} takes the win rate on a tie.

Warning — pending    {{name}} hasn't accepted yet. You can change your entry
                     freely until they do. If they decline, this scores as an
                     ordinary praxis.
Warning — active     You can still edit or pull this back. The moment {{name}}
                     submits, the duel goes live and backing out forfeits it.

Confirm          Submit entry
Cancel           Not yet
```

**Duel rail**

```
Roster — you in         You're in
Roster — you out        You haven't entered yet
Roster — them in        {{name}} is in
Roster — them out       {{name}} hasn't entered yet

Next step — pending     Waiting on {{name}} to accept the challenge.
Next step — active      Waiting on {{name}} to enter. You can still edit.
Next step — active/you  {{name}} is in. Enter to make it live.
Next step — live        Both in — voting is open.
Next step — declined    {{name}} declined. This scores as an ordinary praxis.
```

**Forfeit confirm** — shown when unsubmitting a `live` duel:

```
Title       Forfeit this duel?
Body        {{name}} has already entered. Pulling back now forfeits the duel —
            they win by default, and resubmitting won't undo it.
Confirm     Forfeit
Cancel      Keep my entry
```

### Words that are wrong

| Don't write | Write | Why |
|---|---|---|
| seal, sealed | submit, entered, in | "Seal" is Albescent's private voice |
| cast | submit | "Cast" is Wow's |
| settled | live | "Settled" reads as decided; it means voting *opened* |
| withdraw *(on a live duel)* | forfeit | Withdraw is reversible; this isn't |
| won, victory, final score | ahead, leading | Nothing is final until era reset |
| opponent *(meaning "not me")* | their name | "Opponent" is a fixed role, not a viewpoint |
| shared, together, both of you | your entry, their entry | Duelists never share anything |
| stars | points | The tally compares points, not raw stars |

---

## 5. The numbers

**Every figure in your mock is computed live. Do not hardcode a ratio.**

Each faction has its own win and lose multipliers, and one faction is wildly different:

| Faction | Win | Lose |
|---|---|---|
| Six of seven | 1.5× | 0.5× |
| **Snide** | **2.0×** | **0.0×** |

**A Snide duelist who loses gets nothing.** Their lose tile shows `+0`. This is
intended drama, not a bug — but it means your Snide mock (#722) has to make a zero
look deliberate. A `+0` that reads as an empty state or a loading skeleton is a
failure. It should read as a threat.

Snide also **wins ties** against any non-Snide opponent. That's why there are two tie
strings.

The figures shown are **base points before crowd votes** — the vote total doesn't
exist yet at submit time. The footnote saying so is not optional; without it the
numbers are a lie. The faction multiplier is deliberately excluded from this display.

---

## 6. Hard nos

- **No victory screen.** No resolution moment exists. (Panels 1d / 2d of the Wow
  design are unbuildable for this reason — ignore them.)
- **No two-pane workspace.** The Wow mock's 2c has a left column re-rendering the
  title, body and media that the detail page already owns. No two-column layout exists
  anywhere in the app's detail pages, and mobile forbids it. Take the Wow mock's *rail
  content*, not its page layout.
- **No opponent picker.** Already built and shipped. Out of scope.
- **No per-faction strings.** See §0.
- **No fixed-pixel grids on mobile.** Mobile stacks single-column.
- **No invented copy.** If §4 doesn't have the string, ask — don't write one.

---

## 7. Deliverable per issue

Four screens: submit-confirm desktop, submit-confirm mobile, rail desktop, rail
mobile. Built from the kit's tokens and Tailwind utilities per `conventions.md` — no
invented colors, no hardcoded hex, dark mode via the `[data-theme="dark"]` cascade.

Remember the rail inherits the **opponent's** accent: show it in your mock with a
foreign faction's color so the reviewer can see it works.
